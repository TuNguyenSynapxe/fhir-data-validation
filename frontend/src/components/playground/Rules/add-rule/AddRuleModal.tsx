import React, { useState } from 'react';
import { X } from 'lucide-react';
import { RuleTypeSelector, type RuleTypeOption } from './RuleTypeSelector';
import { RequiredRuleForm } from '../rule-types/required';
import { QuestionAnswerRuleForm } from '../rule-types/question-answer';
import { PatternRuleForm } from '../rule-types/pattern';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
  origin?: string;
  enabled?: boolean;
  isMessageCustomized?: boolean;
}

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (rule: Rule) => void;
  selectedResourceType: string;
  projectBundle?: object;
  hl7Samples?: any[];
  projectId?: string;
}

export const AddRuleModal: React.FC<AddRuleModalProps> = ({
  isOpen,
  onClose,
  onSaveRule,
  selectedResourceType,
  projectBundle,
  hl7Samples,
  projectId,
}) => {
  const [selectedRuleType, setSelectedRuleType] = useState<RuleTypeOption | null>(null);

  if (!isOpen) return null;

  const handleSelectType = (type: RuleTypeOption) => {
    setSelectedRuleType(type);
  };

  const handleSave = (rule: Rule) => {
    onSaveRule(rule);
    setSelectedRuleType(null);
    onClose();
  };

  const handleCancel = () => {
    setSelectedRuleType(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {selectedRuleType === null ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Validation Rule</h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <RuleTypeSelector onSelectType={handleSelectType} />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <button
                onClick={handleCancel}
                className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : selectedRuleType === 'required' ? (
          <RequiredRuleForm
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            initialResourceType={selectedResourceType}
          />
        ) : selectedRuleType === 'questionAnswer' ? (
          <QuestionAnswerRuleForm
            projectId={projectId || ''}
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            initialResourceType={selectedResourceType}
          />
        ) : selectedRuleType === 'pattern' ? (
          <PatternRuleForm
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            initialResourceType={selectedResourceType}
          />
        ) : null}
      </div>
    </div>
  );
};
