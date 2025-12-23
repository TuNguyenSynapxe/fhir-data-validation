import React from 'react';
import type { QuestionFormData, QuestionAnswerType } from './question.types';
import { ANSWER_TYPES, getAnswerTypeDescription } from './question.utils';
import { QuestionConstraintsSection } from './QuestionConstraintsSection';

interface QuestionFormProps {
  formData: QuestionFormData;
  onChange: (field: keyof QuestionFormData, value: any) => void;
  errors: { [key: string]: string };
  isEditing: boolean;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  formData,
  onChange,
  errors,
  isEditing,
}) => {
  const [showAnswerTypeWarning, setShowAnswerTypeWarning] = React.useState(false);
  const [pendingAnswerType, setPendingAnswerType] = React.useState<QuestionAnswerType | null>(null);

  const handleAnswerTypeChange = (newType: QuestionAnswerType) => {
    if (isEditing && formData.answerType && formData.answerType !== newType) {
      // Show confirmation dialog
      setPendingAnswerType(newType);
      setShowAnswerTypeWarning(true);
    } else {
      onChange('answerType', newType);
    }
  };

  const confirmAnswerTypeChange = () => {
    if (pendingAnswerType) {
      // Reset all constraints when changing answer type
      onChange('answerType', pendingAnswerType);
      onChange('unitCode', undefined);
      onChange('unitDisplay', undefined);
      onChange('min', undefined);
      onChange('max', undefined);
      onChange('precision', undefined);
      onChange('maxLength', undefined);
      onChange('regex', undefined);
      onChange('valueSetUrl', undefined);
      onChange('bindingStrength', 'required');
    }
    setShowAnswerTypeWarning(false);
    setPendingAnswerType(null);
  };

  const cancelAnswerTypeChange = () => {
    setShowAnswerTypeWarning(false);
    setPendingAnswerType(null);
  };

  return (
    <div className="space-y-6">
      {/* Warning Dialog */}
      {showAnswerTypeWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Change Answer Type?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Changing the answer type will reset all constraints. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelAnswerTypeChange}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmAnswerTypeChange}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded"
              >
                Change Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Common Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => onChange('code', e.target.value)}
            disabled={isEditing}
            placeholder="HEIGHT"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
            } ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">Code cannot be changed after creation</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.display}
            onChange={(e) => onChange('display', e.target.value)}
            placeholder="Body height"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.display ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.display && <p className="text-xs text-red-500 mt-1">{errors.display}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System
          </label>
          <input
            type="text"
            value={formData.system}
            onChange={(e) => onChange('system', e.target.value)}
            placeholder="http://example.org/questions"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Coding system for this question</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Answer Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.answerType}
            onChange={(e) => handleAnswerTypeChange(e.target.value as QuestionAnswerType)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.answerType ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select answer type...</option>
            {ANSWER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type} - {getAnswerTypeDescription(type)}
              </option>
            ))}
          </select>
          {errors.answerType && <p className="text-xs text-red-500 mt-1">{errors.answerType}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Additional context or help text for this question"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Answer Type Specific Section */}
      {formData.answerType && (
        <div className="pt-4 border-t">
          <QuestionConstraintsSection formData={formData} onChange={onChange} errors={errors} />
        </div>
      )}
    </div>
  );
};
