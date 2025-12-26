import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { parseCsvQuestions, parseJsonQuestions, type ImportResult } from './parseImport';
import type { StagedQuestion } from '../questionAuthoring.types';

interface QuestionImportTabProps {
  onImport: (questions: StagedQuestion[]) => void;
}

export const QuestionImportTab: React.FC<QuestionImportTabProps> = ({ onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      let result: ImportResult;
      if (file.name.endsWith('.csv')) {
        result = parseCsvQuestions(content);
      } else if (file.name.endsWith('.json')) {
        result = parseJsonQuestions(content);
      } else {
        result = {
          questions: [],
          errors: [{
            message: 'Unsupported file format. Please upload .csv or .json',
            severity: 'error',
          }],
          warnings: [],
        };
      }

      setImportResult(result);
    };

    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleImport = () => {
    if (!importResult || importResult.errors.length > 0) return;

    // Convert ParsedQuestions to StagedQuestions
    const stagedQuestions: StagedQuestion[] = importResult.questions.map((q, index) => ({
      stagingId: `imported-${Date.now()}-${index}`,
      text: q.display, // Use display as the question text
      description: q.description,
      answerType: 'String',
      answerMode: 'enumerated-string',
      coding: {
        system: q.system,
        code: q.code,
        display: q.display,
      },
      sourceType: 'import',
      enumConfig: q.enumConfig,
      isLocked: true, // Lock imported questions
    }));

    onImport(stagedQuestions);
    
    // Reset
    setImportResult(null);
    setFileName('');
  };

  const handleReset = () => {
    setImportResult(null);
    setFileName('');
  };

  const blockingErrors = importResult?.errors.length || 0;
  const totalQuestions = importResult?.questions.length || 0;
  const previewQuestions = importResult?.questions.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Import Questions from CSV or JSON</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Only <strong>String (Enum)</strong> answer types are supported</li>
          <li>• Imported <strong>system</strong> and <strong>code</strong> will be locked</li>
          <li>• Enum values can be edited later in Section C</li>
        </ul>
      </div>

      {/* File Upload Area */}
      {!importResult && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop a file here, or click to browse
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Supported formats: .csv, .json
          </p>
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
          >
            Browse Files
          </label>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="space-y-4">
          {/* File Info */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">{fileName}</span>
            </div>
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Validation Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalQuestions}</div>
              <div className="text-xs text-gray-600 mt-1">Total Questions</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{blockingErrors}</div>
              <div className="text-xs text-red-700 mt-1">Errors (Blocking)</div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{importResult.warnings.length}</div>
              <div className="text-xs text-yellow-700 mt-1">Warnings</div>
            </div>
          </div>

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-semibold text-red-900">Errors</h3>
              </div>
              <div className="space-y-2">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-800">
                    {error.rowIndex && <span className="font-mono">Row {error.rowIndex}: </span>}
                    {error.field && <span className="font-semibold">{error.field} - </span>}
                    {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {importResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h3 className="text-sm font-semibold text-yellow-900">Warnings</h3>
              </div>
              <div className="space-y-2">
                {importResult.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-800">
                    {warning.rowIndex && <span className="font-mono">Row {warning.rowIndex}: </span>}
                    {warning.field && <span className="font-semibold">{warning.field} - </span>}
                    {warning.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {previewQuestions.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Preview (First {previewQuestions.length} Questions)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">System</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Display</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Enum Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewQuestions.map((q, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-900">{q.system}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-900">{q.code}</td>
                        <td className="px-4 py-3 text-xs text-gray-900">{q.display}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {q.enumConfig.allowedValues.length} value{q.enumConfig.allowedValues.length !== 1 ? 's' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              {blockingErrors === 0 && totalQuestions > 0 && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Ready to import {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
                  </span>
                </>
              )}
              {blockingErrors > 0 && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-700 font-medium">
                    Fix {blockingErrors} error{blockingErrors !== 1 ? 's' : ''} to continue
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={blockingErrors > 0 || totalQuestions === 0}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Import {totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Format Documentation */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="px-4 py-3 bg-gray-50 cursor-pointer text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors">
          CSV Format Documentation
        </summary>
        <div className="px-4 py-3 text-sm text-gray-700 space-y-2">
          <p><strong>Required headers:</strong></p>
          <code className="block bg-gray-100 p-2 rounded text-xs overflow-x-auto">
            system,code,display,description,allowed_values,allow_multiple,separator
          </code>
          <p><strong>Rules:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>system, code, display, allowed_values are required</li>
            <li>allowed_values is delimited by comma, pipe (|), or semicolon (;)</li>
            <li>allow_multiple: true/false (defaults to false)</li>
            <li>separator: "," or "|" or ";" (required when allow_multiple=true)</li>
          </ul>
        </div>
      </details>

      <details className="border border-gray-200 rounded-lg">
        <summary className="px-4 py-3 bg-gray-50 cursor-pointer text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors">
          JSON Format Documentation
        </summary>
        <div className="px-4 py-3 text-sm text-gray-700">
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "format": "pss-question-import",
  "version": "1.0",
  "questions": [
    {
      "system": "http://example.org",
      "code": "Q1",
      "display": "Question 1",
      "description": "Optional description",
      "answer": {
        "type": "string-enum",
        "values": ["Yes", "No", "Maybe"],
        "allowMultiple": false,
        "separator": ","
      }
    }
  ]
}`}
          </pre>
        </div>
      </details>
    </div>
  );
};
