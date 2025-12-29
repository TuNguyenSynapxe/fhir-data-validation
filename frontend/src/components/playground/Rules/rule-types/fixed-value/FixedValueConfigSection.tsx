import React from 'react';
import { FileText } from 'lucide-react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';

/**
 * FIXED VALUE CONFIG SECTION
 * 
 * Rule-specific configuration for FixedValue rules.
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Field path selection
 * - Expected value input
 * 
 * The parent RuleForm handles: resource, scope (instance), severity, errorCode, userHint, preview, save/cancel.
 * 
 * NOTE: errorCode is FIXED as "FIXED_VALUE_MISMATCH" - displayed as read-only badge by RuleForm.
 */

interface FixedValueConfigSectionProps {
  fieldPath: string;
  expectedValue: string;
  onFieldPathChange: (path: string) => void;
  onExpectedValueChange: (value: string) => void;
  errors?: {
    fieldPath?: string;
    expectedValue?: string;
  };
  projectBundle?: object;
  hl7Samples?: any[];
  resourceType: string;
}

export const FixedValueConfigSection: React.FC<FixedValueConfigSectionProps> = ({
  fieldPath,
  expectedValue,
  onFieldPathChange,
  onExpectedValueChange,
  errors = {},
  projectBundle,
  hl7Samples,
  resourceType,
}) => {
  const [isPathDrawerOpen, setIsPathDrawerOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Conceptual Model Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-blue-900">
              Fixed Value Validation
            </div>
            <div className="text-xs text-blue-800 mt-1">
              Validates that a field always contains a specific fixed value.
              Useful for ensuring required constants like resource status or type.
            </div>
          </div>
        </div>
      </div>

      {/* Field Path Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Field to Validate <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={fieldPath}
            readOnly
            placeholder="Click 'Select Field' to choose a field"
            className={`
              flex-1 px-3 py-2 border rounded-md bg-gray-50 font-mono text-sm
              ${errors.fieldPath ? 'border-red-300' : 'border-gray-300'}
            `}
          />
          <button
            onClick={() => setIsPathDrawerOpen(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Select Field
          </button>
        </div>
        {errors.fieldPath && (
          <p className="mt-1 text-sm text-red-600">{errors.fieldPath}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The field that must contain the fixed value
        </p>
      </div>

      {/* Expected Value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Expected Value <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={expectedValue}
          onChange={(e) => onExpectedValueChange(e.target.value)}
          placeholder="e.g., active, 123, true"
          className={`
            w-full px-3 py-2 border rounded-md text-sm
            ${errors.expectedValue ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
        />
        {errors.expectedValue && (
          <p className="mt-1 text-sm text-red-600">{errors.expectedValue}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The exact value that this field must contain
        </p>
      </div>

      {/* FhirPath Selector Drawer */}
      {isPathDrawerOpen && (
        <FhirPathSelectorDrawer
          isOpen={isPathDrawerOpen}
          onClose={() => setIsPathDrawerOpen(false)}
          onSelect={(path) => {
            onFieldPathChange(path);
            setIsPathDrawerOpen(false);
          }}
          resourceType={resourceType}
          projectBundle={projectBundle}
          hl7Samples={hl7Samples}
        />
      )}
    </div>
  );
};
