import React from 'react';
import { Search } from 'lucide-react';
import type { QuestionFormData, QuestionAnswerType } from './question.types';
import { ANSWER_TYPES, getAnswerTypeDescription } from './question.utils';
import { QuestionConstraintsSection } from './QuestionConstraintsSection';
import { TerminologyBrowserDrawer } from './TerminologyBrowserDrawer';
import { HelpTooltip } from '../../../common/HelpTooltip';

interface QuestionFormProps {
  formData: QuestionFormData;
  onChange: (field: keyof QuestionFormData, value: any) => void;
  errors: { [key: string]: string };
  isEditing: boolean;
  projectId: string;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  formData,
  onChange,
  errors,
  isEditing,
  projectId,
}) => {
  const [showAnswerTypeWarning, setShowAnswerTypeWarning] = React.useState(false);
  const [pendingAnswerType, setPendingAnswerType] = React.useState<QuestionAnswerType | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = React.useState(false);

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

  const handleTerminologySelect = (system: string, code: string, display: string) => {
    onChange('system', system);
    onChange('code', code);
    onChange('display', display);
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
        {/* System Field with Browse Button */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-sm font-medium text-gray-700">
              System <span className="text-red-500">*</span>
            </label>
            <HelpTooltip
              title="Terminology Source"
              body="You may select codes from a known terminology or enter them manually.\n\nManual entries are supported for:\n• Local extensions\n• Custom code systems\n• Early or draft implementations"
              footer="Validation severity depends on the binding strength."
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.system}
              onChange={(e) => onChange('system', e.target.value)}
              placeholder="http://example.org/questions"
              className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                errors.system ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsBrowserOpen(true)}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap"
              title="Browse terminology"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Browse</span>
            </button>
          </div>
          {errors.system && <p className="text-xs text-red-500 mt-1">{errors.system}</p>}
          <p className="text-xs text-gray-500 mt-1">
            You may enter local or provisional codes. Terminology validation can be applied during validation.
          </p>
        </div>

        {/* Code Field */}
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

      {/* Terminology Browser Drawer */}
      <TerminologyBrowserDrawer
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onSelect={handleTerminologySelect}
        projectId={projectId}
      />
    </div>
  );
};
