import React from 'react';
import { Code, AlertTriangle } from 'lucide-react';

/**
 * CUSTOM FHIRPATH CONFIG SECTION
 * 
 * Rule-specific configuration for CustomFHIRPath rules.
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - FHIRPath expression input
 * - Error code selection (GOVERNED - must select from validated list)
 * 
 * The parent RuleForm handles: resource, scope (instance), severity, userHint, preview, save/cancel.
 * 
 * NOTE: errorCode is GOVERNED - user must select from dropdown of known ValidationErrorCodes.
 */

interface CustomFHIRPathConfigSectionProps {
  expression: string;
  errorCode: string;
  onExpressionChange: (expression: string) => void;
  onErrorCodeChange: (errorCode: string) => void;
  errors?: {
    expression?: string;
    errorCode?: string;
  };
  resourceType: string;
}

// Governed list of error codes that can be used with CustomFHIRPath rules
const GOVERNED_ERROR_CODES = [
  { value: 'FIELD_REQUIRED', label: 'FIELD_REQUIRED', description: 'Field is missing or empty' },
  { value: 'PATTERN_MISMATCH', label: 'PATTERN_MISMATCH', description: 'Value does not match expected pattern' },
  { value: 'FIXED_VALUE_MISMATCH', label: 'FIXED_VALUE_MISMATCH', description: 'Value does not match fixed value' },
  { value: 'VALUE_NOT_ALLOWED', label: 'VALUE_NOT_ALLOWED', description: 'Value is not in allowed set' },
  { value: 'INVALID_REFERENCE', label: 'INVALID_REFERENCE', description: 'Reference is invalid or broken' },
  { value: 'INVALID_CODE', label: 'INVALID_CODE', description: 'Code is invalid or not in value set' },
  { value: 'ARRAY_LENGTH_VIOLATION', label: 'ARRAY_LENGTH_VIOLATION', description: 'Array length constraint violated' },
  { value: 'CUSTOM_VALIDATION_FAILED', label: 'CUSTOM_VALIDATION_FAILED', description: 'Custom validation logic failed' },
];

export const CustomFHIRPathConfigSection: React.FC<CustomFHIRPathConfigSectionProps> = ({
  expression,
  errorCode,
  onExpressionChange,
  onErrorCodeChange,
  errors = {},
  resourceType,
}) => {
  return (
    <div className="space-y-6">
      {/* Conceptual Model Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start gap-3">
          <Code className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-blue-900">
              Custom FHIRPath Validation
            </div>
            <div className="text-xs text-blue-800 mt-1">
              Write custom validation logic using FHIRPath expressions.
              The expression must evaluate to a boolean: <code className="bg-white px-1 rounded">true</code> = valid, <code className="bg-white px-1 rounded">false</code> = error.
            </div>
          </div>
        </div>
      </div>

      {/* FHIRPath Expression Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          FHIRPath Expression <span className="text-red-500">*</span>
        </label>
        <textarea
          value={expression}
          onChange={(e) => onExpressionChange(e.target.value)}
          placeholder={`e.g., ${resourceType}.name.exists() and ${resourceType}.birthDate.exists()`}
          rows={4}
          className={`
            w-full px-3 py-2 border rounded-md font-mono text-sm resize-y
            ${errors.expression ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
        />
        {errors.expression && (
          <p className="mt-1 text-sm text-red-600">{errors.expression}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Boolean expression that returns <code className="bg-gray-100 px-1 rounded">true</code> if valid, <code className="bg-gray-100 px-1 rounded">false</code> if error should be raised
        </p>
      </div>

      {/* Error Code Dropdown (GOVERNED) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Error Code <span className="text-red-500">*</span>
        </label>
        <select
          value={errorCode}
          onChange={(e) => onErrorCodeChange(e.target.value)}
          className={`
            w-full px-3 py-2 border rounded-md text-sm
            ${errors.errorCode ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
        >
          <option value="">-- Select Error Code --</option>
          {GOVERNED_ERROR_CODES.map((code) => (
            <option key={code.value} value={code.value}>
              {code.label}
            </option>
          ))}
        </select>
        {errors.errorCode && (
          <p className="mt-1 text-sm text-red-600">{errors.errorCode}</p>
        )}
        
        {/* Error Code Description */}
        {errorCode && (
          <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-xs text-gray-700">
              <strong>{errorCode}:</strong>{' '}
              {GOVERNED_ERROR_CODES.find(c => c.value === errorCode)?.description}
            </p>
          </div>
        )}
        
        <p className="mt-1 text-xs text-gray-500">
          Error code that will be used when the FHIRPath expression evaluates to false
        </p>
      </div>

      {/* Governance Notice */}
      <div className="px-4 py-3 border border-yellow-200 bg-yellow-50 rounded-md">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-yellow-900">
              Governed Error Code
            </div>
            <div className="text-xs text-yellow-800 mt-1">
              Error code must be selected from the validated list above.
              Unknown or custom error codes are not allowed to ensure consistent error handling.
            </div>
          </div>
        </div>
      </div>

      {/* FHIRPath Examples */}
      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-md">
        <div className="text-xs font-medium text-gray-900 mb-2">Example FHIRPath Expressions:</div>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>• <code className="bg-white px-1 rounded">name.exists()</code> - Name field must exist</li>
          <li>• <code className="bg-white px-1 rounded">birthDate.exists() and birthDate &lt;= today()</code> - Valid birth date</li>
          <li>• <code className="bg-white px-1 rounded">telecom.where(system='phone').exists()</code> - Must have phone</li>
          <li>• <code className="bg-white px-1 rounded">identifier.count() &gt;= 1</code> - At least one identifier</li>
          <li>• <code className="bg-white px-1 rounded">active = true</code> - Active must be true</li>
        </ul>
      </div>
    </div>
  );
};
