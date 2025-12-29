import React, { useState } from 'react';
import { X } from 'lucide-react';
import { RuleTypeSelector, type RuleTypeOption } from './RuleTypeSelector';
import { RuleForm } from '../RuleForm';
import type { Rule } from '../../../../types/rightPanelProps';

/**
 * ADD RULE MODAL
 * 
 * ARCHITECTURE:
 * - Step 1: Select rule type (RuleTypeSelector)
 * - Step 2: Configure rule (RuleForm with mode="create")
 * 
 * UNIFIED RULE AUTHORING:
 * - ALL rule types use RuleForm.tsx
 * - NO rule-specific create forms
 * - RuleForm determines which ConfigSection to render based on ruleType
 */

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (rule: Rule) => void;
  selectedResourceType: string;
  projectBundle?: object;
  hl7Samples?: any[];
  projectId?: string;
  existingRules?: Rule[];
}

export const AddRuleModal: React.FC<AddRuleModalProps> = ({
  isOpen,
  onClose,
  onSaveRule,
  selectedResourceType,
  projectBundle,
  hl7Samples,
  projectId,
  existingRules = [],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] overflow-hidden flex flex-col">
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
            <div className="px-6 py-6 overflow-y-auto">
              <RuleTypeSelector onSelectType={handleSelectType} existingRules={existingRules} />
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
          <RuleForm
            mode="create"
            ruleType="Required"
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            projectId={projectId}
          />
        ) : selectedRuleType === 'questionAnswer' ? (
          <RuleForm
            mode="create"
            ruleType="QuestionAnswer"
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            projectId={projectId}
          />
        ) : selectedRuleType === 'pattern' ? (
          <RuleForm
            mode="create"
            ruleType="Regex"
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            projectId={projectId}
          />
        ) : selectedRuleType === 'fixedValue' ? (
          <RuleForm
            mode="create"
            ruleType="FixedValue"
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            projectId={projectId}
          />
        ) : selectedRuleType === 'allowedValues' ? (
          <RuleForm
            mode="create"
            ruleType="AllowedValues"
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            projectId={projectId}
          />
        ) : selectedRuleType === 'arrayLength' ? (
          <RuleForm
            mode="create"
            ruleType="ArrayLength"
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            projectId={projectId}
          />
        ) : selectedRuleType === 'customFhirPath' ? (
          <RuleForm
            mode="create"
            ruleType="CustomFHIRPath"
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            projectId={projectId}
          />
        ) : selectedRuleType === 'requiredResources' ? (
          <RuleForm
            mode="create"
            ruleType="RequiredResources"
            onCancel={handleCancel}
            onSave={handleSave}
            projectBundle={projectBundle}
            projectId={projectId}
          />
        ) : null}
      </div>
    </div>
  );
};
