import React from 'react';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { questionsApi } from '../../../../api/questionsApi';

interface ImportQuestionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questionIds: string[]) => void;
  projectId: string;
  terminologyUrl: string;
}

interface ParsedQuestion {
  system: string;
  conceptCode: string;
  questionText: string;
  allowedValues: string[];
  allowMultiple: boolean;
  separator?: string;
  errors: string[];
}

export const ImportQuestionsDrawer: React.FC<ImportQuestionsDrawerProps> = ({
  isOpen,
  onClose,
  onImport,
  projectId,
  terminologyUrl,
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [parsedQuestions, setParsedQuestions] = React.useState<ParsedQuestion[]>([]);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setParsedQuestions([]);
      setParseError(null);
    }
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.json')) {
      setParseError('Only .csv and .json files are supported');
      return;
    }

    setFile(selectedFile);
    setParseError(null);
    
    try {
      const text = await selectedFile.text();
      
      if (fileName.endsWith('.csv')) {
        parseCSV(text);
      } else {
        parseJSON(text);
      }
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse file');
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    
    if (lines.length < 2) {
      setParseError('CSV file must have at least a header row and one data row');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const requiredFields = ['system', 'conceptCode', 'questionText', 'allowedValues', 'allowMultiple'];
    
    const missingFields = requiredFields.filter(f => !headers.includes(f));
    if (missingFields.length > 0) {
      setParseError(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    const questions: ParsedQuestion[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const errors: string[] = [];
      
      if (!row.system) errors.push('Missing system');
      if (!row.conceptCode) errors.push('Missing conceptCode');
      if (!row.questionText) errors.push('Missing questionText');
      if (!row.allowedValues) errors.push('Missing allowedValues');
      if (!row.allowMultiple) errors.push('Missing allowMultiple');

      const separator = row.separator || ',';
      const allowedValues = row.allowedValues ? row.allowedValues.split(separator).map((v: string) => v.trim()) : [];
      const allowMultiple = row.allowMultiple?.toLowerCase() === 'true';

      questions.push({
        system: row.system || '',
        conceptCode: row.conceptCode || '',
        questionText: row.questionText || '',
        allowedValues,
        allowMultiple,
        separator,
        errors,
      });
    }

    setParsedQuestions(questions);
  };

  const parseJSON = (text: string) => {
    try {
      const data = JSON.parse(text);
      
      // Support wrapper format with "questions" property
      let questionsArray = data;
      if (!Array.isArray(data)) {
        if (data.questions && Array.isArray(data.questions)) {
          questionsArray = data.questions;
        } else {
          setParseError('JSON must be an array of question objects or an object with a "questions" array');
          return;
        }
      }

      const questions: ParsedQuestion[] = questionsArray.map((item: any, idx: number) => {
        const errors: string[] = [];
        
        // Support both simple format and PSS format
        const system = item.system || '';
        const conceptCode = item.conceptCode || item.code || '';
        const questionText = item.questionText || item.display || '';
        const description = item.description;
        
        // Handle answer field (PSS format) or direct fields (simple format)
        let allowedValues: string[] = [];
        let allowMultiple = false;
        let separator = ',';
        
        if (item.answer) {
          // PSS format: answer.type, answer.values, answer.allowMultiple
          allowedValues = Array.isArray(item.answer.values) ? item.answer.values : [];
          allowMultiple = item.answer.allowMultiple === true;
          separator = item.answer.separator || ',';
          
          if (!item.answer.values) errors.push('Missing answer.values');
          if (item.answer.allowMultiple === undefined) errors.push('Missing answer.allowMultiple');
        } else {
          // Simple format: allowedValues, allowMultiple
          allowedValues = Array.isArray(item.allowedValues) ? item.allowedValues : [];
          allowMultiple = item.allowMultiple === true;
          separator = item.separator || ',';
          
          if (!item.allowedValues) errors.push('Missing allowedValues');
          if (item.allowMultiple === undefined) errors.push('Missing allowMultiple');
        }
        
        if (!system) errors.push('Missing system');
        if (!conceptCode) errors.push('Missing conceptCode or code');
        if (!questionText) errors.push('Missing questionText or display');
        
        if (allowedValues && !Array.isArray(allowedValues)) {
          errors.push('allowedValues must be an array');
        }

        return {
          system,
          conceptCode,
          questionText,
          allowedValues,
          allowMultiple,
          separator,
          errors,
        };
      });

      setParsedQuestions(questions);
    } catch (err: any) {
      setParseError('Invalid JSON format: ' + err.message);
    }
  };

  const hasErrors = parsedQuestions.some(q => q.errors.length > 0);

  const handleImport = async () => {
    if (hasErrors) return;

    setIsImporting(true);

    try {
      const createdQuestionIds: string[] = [];

      for (const pq of parsedQuestions) {
        // Build constraints with allowed values
        const config = {
          allowedValues: pq.allowedValues,
          allowMultiple: pq.allowMultiple,
          separator: pq.separator || ',',
        };

        const questionDto = await questionsApi.createQuestion(projectId, {
          code: {
            system: pq.system,
            code: pq.conceptCode,
            display: pq.questionText,
          },
          answerType: 'String',
          text: pq.questionText,
          description: undefined,
          unit: undefined,
          constraints: {
            regex: JSON.stringify(config),
          },
          valueSet: undefined,
        });

        createdQuestionIds.push(questionDto.id);
      }

      onImport(createdQuestionIds);
      onClose();
    } catch (err: any) {
      setParseError(err.message || 'Failed to import questions');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Import Questions</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Parse Error */}
        {parseError && (
          <div className="mx-6 mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Section 1: File Upload */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">File Upload</h3>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                {file ? file.name : 'Drop file here or click to browse'}
              </p>
              <p className="text-xs text-gray-500">
                Supports .csv and .json files
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
              className="hidden"
            />
          </div>

          {/* Section 2: Schema Info */}
          {!file && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Required Fields</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Simple Format:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <span className="font-medium">system</span> - Terminology system URL</li>
                    <li>• <span className="font-medium">conceptCode</span> - Concept code</li>
                    <li>• <span className="font-medium">questionText</span> - Question text</li>
                    <li>• <span className="font-medium">allowedValues</span> - Array of strings</li>
                    <li>• <span className="font-medium">allowMultiple</span> - true/false</li>
                    <li>• <span className="font-medium">separator</span> - Optional (defaults to comma)</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">PSS Format (with wrapper):</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <span className="font-medium">system</span>, <span className="font-medium">code</span>, <span className="font-medium">display</span></li>
                    <li>• <span className="font-medium">answer.type</span>, <span className="font-medium">answer.values</span>, <span className="font-medium">answer.allowMultiple</span></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Preview */}
          {parsedQuestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
                <span className="text-xs text-gray-500">
                  {parsedQuestions.length} question{parsedQuestions.length !== 1 ? 's' : ''}
                </span>
              </div>

              {hasErrors && (
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Some questions have errors. Please fix the file before importing.</span>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Question</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Values</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parsedQuestions.map((q, idx) => (
                        <tr key={idx} className={q.errors.length > 0 ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 text-gray-600">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{q.questionText || '(empty)'}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{q.conceptCode}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-gray-700">{q.allowedValues.length} value{q.allowedValues.length !== 1 ? 's' : ''}</div>
                            {q.allowMultiple && (
                              <div className="text-gray-500 text-xs">Multiple allowed</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {q.errors.length === 0 ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Valid</span>
                              </div>
                            ) : (
                              <div className="text-red-600">
                                <div className="flex items-center gap-1 mb-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span className="font-medium">Invalid</span>
                                </div>
                                <ul className="text-xs space-y-0.5">
                                  {q.errors.map((err, errIdx) => (
                                    <li key={errIdx}>• {err}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={parsedQuestions.length === 0 || hasErrors || isImporting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing...' : `Import ${parsedQuestions.length} Question${parsedQuestions.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </>
  );
};
