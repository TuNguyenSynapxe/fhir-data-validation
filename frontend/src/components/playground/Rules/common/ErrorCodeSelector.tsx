import React, { useMemo } from 'react';
import { AlertCircle, Info } from 'lucide-react';

/**
 * ERROR CODE SELECTOR
 * 
 * Phase 3: No-Prose Enforcement Component
 * Allows rule authors to select an errorCode instead of typing free text
 * 
 * Features:
 * - Dropdown grouped by category
 * - Only valid codes for the rule type
 * - Required field (blocks save if empty)
 * - Keyboard accessible
 */

interface ErrorCodeOption {
  code: string;
  label: string;
  category: string;
  description?: string;
}

interface ErrorCodeSelectorProps {
  ruleType: 'Required' | 'Pattern' | 'QuestionAnswer' | 'FixedValue' | 'AllowedValues' | 'Reference' | 'CodeMaster';
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  className?: string;
  labelOverride?: string;
  showTooltip?: boolean;
}

/**
 * ERROR CODE REGISTRY
 * Maps rule types to their valid error codes
 */
const ERROR_CODE_REGISTRY: Record<string, ErrorCodeOption[]> = {
  Required: [
    { code: 'FIELD_REQUIRED', label: 'Field Required', category: 'Required/Presence' },
    { code: 'ARRAY_REQUIRED', label: 'Array Required', category: 'Required/Presence' },
    { code: 'MIN_OCCURS_NOT_MET', label: 'Minimum Occurrences Not Met', category: 'Required/Presence' },
    { code: 'ANSWER_REQUIRED', label: 'Answer Required', category: 'Required/Presence' },
  ],
  Pattern: [
    { code: 'PATTERN_MISMATCH', label: 'Pattern Mismatch', category: 'Format/Pattern' },
    { code: 'INVALID_FORMAT', label: 'Invalid Format', category: 'Format/Pattern' },
    { code: 'REGEX_NO_MATCH', label: 'Regex No Match', category: 'Format/Pattern' },
  ],
  QuestionAnswer: [
    { code: 'ANSWER_REQUIRED', label: 'Answer Required', category: 'Question/Answer' },
    { code: 'INVALID_ANSWER_VALUE', label: 'Invalid Answer Value', category: 'Question/Answer' },
    { code: 'ANSWER_OUT_OF_RANGE', label: 'Answer Out of Range', category: 'Question/Answer' },
    { code: 'ANSWER_NOT_IN_VALUESET', label: 'Answer Not in ValueSet', category: 'Question/Answer' },
    { code: 'ANSWER_MULTIPLE_NOT_ALLOWED', label: 'Answer Multiple Not Allowed', category: 'Question/Answer' },
    { code: 'INVALID_ANSWER_TYPE', label: 'Invalid Answer Type', category: 'Question/Answer' },
    { code: 'QUESTION_NOT_FOUND', label: 'Question Not Found', category: 'Question/Answer' },
    { code: 'QUESTIONSET_DATA_MISSING', label: 'QuestionSet Data Missing', category: 'Question/Answer' },
  ],
  FixedValue: [
    { code: 'VALUE_NOT_EQUAL', label: 'Value Not Equal', category: 'Fixed/Equality' },
    { code: 'SYSTEM_NOT_EQUAL', label: 'System Not Equal', category: 'Fixed/Equality' },
    { code: 'CODE_NOT_EQUAL', label: 'Code Not Equal', category: 'Fixed/Equality' },
    { code: 'DISPLAY_NOT_EQUAL', label: 'Display Not Equal', category: 'Fixed/Equality' },
  ],
  AllowedValues: [
    { code: 'VALUE_NOT_ALLOWED', label: 'Value Not Allowed', category: 'Allowed Values' },
    { code: 'ENUM_VIOLATION', label: 'Enum Violation', category: 'Allowed Values' },
    { code: 'ANSWER_NOT_IN_VALUESET', label: 'Answer Not in ValueSet', category: 'Allowed Values' },
  ],
  Reference: [
    { code: 'REFERENCE_NOT_FOUND', label: 'Reference Not Found', category: 'References' },
    { code: 'REFERENCE_TYPE_MISMATCH', label: 'Reference Type Mismatch', category: 'References' },
    { code: 'REFERENCE_INVALID', label: 'Reference Invalid', category: 'References' },
  ],
  CodeMaster: [
    { code: 'UNKNOWN_SCREENING_TYPE', label: 'Unknown Screening Type', category: 'CodeMaster' },
    { code: 'MISSING_QUESTION_CODE', label: 'Missing Question Code', category: 'CodeMaster' },
    { code: 'INVALID_QUESTION_CODE', label: 'Invalid Question Code', category: 'CodeMaster' },
    { code: 'MULTIPLE_VALUES_NOT_ALLOWED', label: 'Multiple Values Not Allowed', category: 'CodeMaster' },
    { code: 'INVALID_ANSWER_VALUE', label: 'Invalid Answer Value', category: 'CodeMaster' },
  ],
};

export const ErrorCodeSelector: React.FC<ErrorCodeSelectorProps> = ({
  ruleType,
  value,
  onChange,
  required = true,
  className = '',
  labelOverride,
  showTooltip = false
}) => {
  const options = useMemo(() => {
    return ERROR_CODE_REGISTRY[ruleType] || [];
  }, [ruleType]);

  // Group options by category
  const groupedOptions = useMemo(() => {
    const groups: Record<string, ErrorCodeOption[]> = {};
    options.forEach(option => {
      if (!groups[option.category]) {
        groups[option.category] = [];
      }
      groups[option.category].push(option);
    });
    return groups;
  }, [options]);

  const isEmpty = !value || value.trim() === '';
  const isValid = options.some(opt => opt.code === value);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {labelOverride || 'Error Code'} {required && <span className="text-red-500">*</span>}
        </label>
        {showTooltip && (
          <div className="group relative">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
              <div className="font-semibold mb-1">Why can't this be automatic?</div>
              <div className="space-y-1">
                <div>Error codes are chosen at rule design time to ensure:</div>
                <ul className="list-disc ml-4 mt-1">
                  <li>consistent validation meaning</li>
                  <li>predictable API behavior</li>
                  <li>stable integrations</li>
                </ul>
                <div className="mt-2 pt-2 border-t border-gray-700">
                  Runtime data determines <strong>where</strong> the error occurs, not <strong>what</strong> it means.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${isEmpty && required ? 'border-red-300 bg-red-50' : 'border-gray-300'}
        `}
        required={required}
      >
        <option value="">-- Select Error Code --</option>
        {Object.entries(groupedOptions).map(([category, opts]) => (
          <optgroup key={category} label={category}>
            {opts.map(option => (
              <option key={option.code} value={option.code}>
                {option.code} — {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {isEmpty && required && (
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} />
          <span>Error code is required. Please select one.</span>
        </div>
      )}

      {!isEmpty && !isValid && (
        <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle size={12} />
          <span>Unknown error code for {ruleType} rules</span>
        </div>
      )}

      {value && isValid && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
          <strong>Frontend will render:</strong> {options.find(o => o.code === value)?.label}
        </div>
      )}
    </div>
  );
};
