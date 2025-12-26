import React from 'react';
import { X, Lock, Trash2, Plus } from 'lucide-react';
import { questionsApi } from '../../../../api/questionsApi';
import type { QuestionDto, CreateQuestionDto } from '../../../../api/questionsApi';

interface ConfigureQuestionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  projectId: string;
  question: QuestionDto;
  isLocked: boolean;
  lockReason?: string;
}

interface AllowedValue {
  id: string;
  value: string;
}

export const ConfigureQuestionDrawer: React.FC<ConfigureQuestionDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  projectId,
  question,
  isLocked,
  lockReason,
}) => {
  const [questionText, setQuestionText] = React.useState(question.metadata.text);
  const [description, setDescription] = React.useState(question.metadata.description || '');
  const [allowedValues, setAllowedValues] = React.useState<AllowedValue[]>([]);
  const [allowMultiple, setAllowMultiple] = React.useState(false);
  const [separator, setSeparator] = React.useState<',' | '|' | ';'>(',');
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showBulkAdd, setShowBulkAdd] = React.useState(false);
  const [bulkText, setBulkText] = React.useState('');

  // Reset state when drawer opens or question changes
  React.useEffect(() => {
    if (isOpen) {
      setQuestionText(question.metadata.text);
      setDescription(question.metadata.description || '');
      setError(null);
      
      // Initialize allowed values from constraints if available
      if (question.constraints?.regex) {
        try {
          const config = JSON.parse(question.constraints.regex);
          if (config.allowedValues && Array.isArray(config.allowedValues)) {
            const values: AllowedValue[] = config.allowedValues.map((val: string, idx: number) => ({
              id: `${Date.now()}_${idx}`,
              value: val,
            }));
            setAllowedValues(values);
            setAllowMultiple(config.allowMultiple || false);
            setSeparator(config.separator || ',');
          } else {
            setAllowedValues([]);
            setAllowMultiple(false);
            setSeparator(',');
          }
        } catch {
          // If regex is not JSON, treat as empty
          setAllowedValues([]);
          setAllowMultiple(false);
          setSeparator(',');
        }
      } else {
        setAllowedValues([]);
        setAllowMultiple(false);
        setSeparator(',');
      }
    }
  }, [isOpen, question]);

  const handleAddValue = () => {
    const newValue: AllowedValue = {
      id: Date.now().toString(),
      value: '',
    };
    setAllowedValues([...allowedValues, newValue]);
  };

  const handleUpdateValue = (id: string, value: string) => {
    setAllowedValues(allowedValues.map(v => v.id === id ? { ...v, value } : v));
  };

  const handleDeleteValue = (id: string) => {
    setAllowedValues(allowedValues.filter(v => v.id !== id));
  };

  const handleBulkAdd = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
    const newValues: AllowedValue[] = lines.map((line, idx) => ({
      id: `${Date.now()}_${idx}`,
      value: line,
    }));
    setAllowedValues([...allowedValues, ...newValues]);
    setBulkText('');
    setShowBulkAdd(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Build constraints object with allowed values for String enums
      let constraints = question.constraints;
      
      if (question.answerType === 'String' && allowedValues.length > 0) {
        // Store allowed values configuration in constraints
        const valuesArray = allowedValues.map(v => v.value).filter(v => v.trim());
        
        // Store as JSON in regex field (temporary storage solution)
        const config = {
          allowedValues: valuesArray,
          allowMultiple,
          separator,
        };
        
        constraints = {
          ...question.constraints,
          regex: JSON.stringify(config),
        };
      }

      const updateDto: CreateQuestionDto = {
        id: question.id,
        code: question.code,
        answerType: question.answerType,
        unit: question.unit,
        constraints: constraints,
        valueSet: question.valueSet,
        text: questionText,
        description: description || undefined,
      };

      await questionsApi.updateQuestion(projectId, question.id, updateDto);
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Configure Question</h2>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Question Text */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Text
            </label>
            <input
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Code & System (read-only) */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 font-mono">
                {question.code.code}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">System</label>
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 font-mono truncate">
                {question.code.system}
              </div>
            </div>
          </div>

          {/* Lock Icon & Tooltip */}
          {isLocked && (
            <div className="flex items-center gap-2 text-xs text-amber-700 mt-2">
              <Lock className="w-3.5 h-3.5" />
              <span title={lockReason || 'This question is locked'} className="cursor-help">
                Locked
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Section 1: Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
              <span className="text-xs font-normal text-gray-500 ml-2">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add help text or additional context..."
            />
          </div>

          {/* Section 2: Answer Configuration */}
          {question.answerType === 'String' && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Answer Configuration</h3>

              {/* Allowed Values */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Allowed Values
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowBulkAdd(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Bulk Add
                    </button>
                    <button
                      onClick={handleAddValue}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Value
                    </button>
                  </div>
                </div>

                {/* Values List */}
                <div className="space-y-2">
                  {allowedValues.length === 0 ? (
                    <div className="px-3 py-6 bg-gray-50 border border-gray-200 rounded text-center">
                      <p className="text-sm text-gray-500">No allowed values defined</p>
                      <button
                        onClick={handleAddValue}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add your first value
                      </button>
                    </div>
                  ) : (
                    allowedValues.map((av) => (
                      <div key={av.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={av.value}
                          onChange={(e) => handleUpdateValue(av.id, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter value..."
                        />
                        <button
                          onClick={() => handleDeleteValue(av.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete value"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Allow Multiple Values */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Allow multiple values</span>
                </label>
              </div>

              {/* Separator Selector */}
              {allowMultiple && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Separator
                  </label>
                  <select
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value as ',' | '|' | ';')}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value=",">Comma (,)</option>
                    <option value="|">Pipe (|)</option>
                    <option value=";">Semicolon (;)</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Bulk Add Modal */}
      {showBulkAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Bulk Add Values</h3>
              <button
                onClick={() => setShowBulkAdd(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter one value per line
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="Value 1&#10;Value 2&#10;Value 3"
              />
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowBulkAdd(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAdd}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Add Values
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
