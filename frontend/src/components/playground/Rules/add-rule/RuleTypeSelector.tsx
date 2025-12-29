import React from 'react';
import { CheckCircle, HelpCircle, FileText, Lock, FileCheck, List, Ruler, Code } from 'lucide-react';

export type RuleTypeOption = 'required' | 'questionAnswer' | 'pattern' | 'fixedValue' | 'allowedValues' | 'arrayLength' | 'customFhirPath';

interface RuleTypeSelectorProps {
  onSelectType: (type: RuleTypeOption) => void;
}

// Ordered by most common usage (no grouping headers)
const ruleTypes = [
  {
    id: 'required' as const,
    icon: CheckCircle,
    title: 'Required Field',
    description: 'Ensure a field or element is present and not empty',
    enabled: true,
    priority: 'high' as const, // Visual emphasis
  },
  {
    id: 'questionAnswer' as const,
    icon: HelpCircle,
    title: 'Question & Answer',
    description: 'Validate question-answer pairs in FHIR resources',
    enabled: true,
    priority: 'high' as const, // Visual emphasis
  },
  {
    id: 'pattern' as const,
    icon: FileText,
    title: 'Pattern / Format',
    description: 'Validate field values against patterns or formats',
    enabled: true,
    priority: 'high' as const, // Visual emphasis
  },
  {
    id: 'allowedValues' as const,
    icon: List,
    title: 'Allowed Values',
    description: 'Validate that a field value is within a predefined set of allowed values',
    enabled: true,
    priority: 'normal' as const,
  },
  {
    id: 'fixedValue' as const,
    icon: FileCheck,
    title: 'Fixed Value',
    description: 'Validate that a field always contains a specific fixed value',
    enabled: true,
    priority: 'normal' as const,
  },
  {
    id: 'arrayLength' as const,
    icon: Ruler,
    title: 'Array Length',
    description: 'Validate that an array has a minimum and/or maximum number of elements',
    enabled: true,
    priority: 'normal' as const,
  },
  {
    id: 'customFhirPath' as const,
    icon: Code,
    title: 'Custom FHIRPath',
    description: 'Write custom validation logic using FHIRPath expressions',
    enabled: true,
    priority: 'normal' as const,
  },
];

export const RuleTypeSelector: React.FC<RuleTypeSelectorProps> = ({ onSelectType }) => {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-6">
        Select the type of validation rule you want to create:
      </p>

      {/* Two-column grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ruleTypes.map((ruleType) => {
          const Icon = ruleType.icon;
          const isDisabled = !ruleType.enabled;
          const isHighPriority = ruleType.priority === 'high';

          return (
            <button
              key={ruleType.id}
              onClick={() => !isDisabled && onSelectType(ruleType.id)}
              disabled={isDisabled}
              className={`
                flex items-start gap-4 p-5 border-2 rounded-lg transition-all text-left
                ${
                  isDisabled
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    : isHighPriority
                    ? 'border-gray-300 hover:border-blue-600 hover:bg-blue-50 hover:shadow-md group'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 group'
                }
              `}
            >
              <div
                className={`
                  flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors
                  ${
                    isDisabled
                      ? 'bg-gray-200'
                      : isHighPriority
                      ? 'bg-blue-500 group-hover:bg-blue-600'
                      : 'bg-blue-100 group-hover:bg-blue-200'
                  }
                `}
              >
                {isDisabled ? (
                  <Lock size={22} className="text-gray-500" />
                ) : (
                  <Icon size={22} className={isHighPriority ? 'text-white' : 'text-blue-600'} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm mb-1.5 ${
                  isHighPriority ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'
                }`}>
                  {ruleType.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {ruleType.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
