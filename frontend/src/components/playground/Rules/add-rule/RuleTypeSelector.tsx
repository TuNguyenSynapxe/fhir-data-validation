import React from 'react';
import { CheckCircle, HelpCircle, FileText, Lock } from 'lucide-react';

export type RuleTypeOption = 'required' | 'questionAnswer' | 'pattern';

interface RuleTypeSelectorProps {
  onSelectType: (type: RuleTypeOption) => void;
}

const ruleTypes = [
  {
    id: 'required' as const,
    icon: CheckCircle,
    title: 'Required Field',
    description: 'Ensure a field or element is present and not empty',
    enabled: true,
  },
  {
    id: 'questionAnswer' as const,
    icon: HelpCircle,
    title: 'Question & Answer',
    description: 'Validate question-answer pairs in FHIR resources',
    enabled: true,
  },
  {
    id: 'pattern' as const,
    icon: FileText,
    title: 'Pattern / Format',
    description: 'Validate field values against patterns or formats',
    enabled: true,
  },
];

export const RuleTypeSelector: React.FC<RuleTypeSelectorProps> = ({ onSelectType }) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-4">
        Select the type of validation rule you want to create:
      </p>

      {ruleTypes.map((ruleType) => {
        const Icon = ruleType.icon;
        const isDisabled = !ruleType.enabled;

        return (
          <button
            key={ruleType.id}
            onClick={() => !isDisabled && onSelectType(ruleType.id)}
            disabled={isDisabled}
            className={`
              w-full flex items-start gap-4 p-4 border-2 rounded-lg transition-all text-left
              ${
                isDisabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 group'
              }
            `}
          >
            <div
              className={`
                flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                ${
                  isDisabled
                    ? 'bg-gray-200'
                    : 'bg-blue-100 group-hover:bg-blue-200'
                }
              `}
            >
              {isDisabled ? (
                <Lock size={20} className="text-gray-500" />
              ) : (
                <Icon size={20} className="text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {ruleType.title}
                </h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {ruleType.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
