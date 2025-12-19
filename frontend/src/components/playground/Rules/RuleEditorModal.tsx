import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import FhirPathSelectorDrawer from '../../rules/FhirPathSelectorDrawer';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
}

interface RuleEditorModalProps {
  rule: Rule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  projectBundle?: object;
  hl7Samples?: any[];
}

// Backend-supported rule types (EXACT match with FhirPathRuleEngine.cs)
const RULE_TYPES = [
  'Required',
  'FixedValue',
  'AllowedValues',
  'Regex',
  'ArrayLength',
  'CodeSystem',
  'CustomFHIRPath'
] as const;

// Rule type descriptions for UI guidance
const RULE_TYPE_DESCRIPTIONS: Record<string, string> = {
  'Required': 'Validates that a field or element is present and not empty',
  'FixedValue': 'Validates that a field matches a specific fixed value',
  'AllowedValues': 'Validates that a field value is in a list of allowed values',
  'Regex': 'Validates that a field value matches a regular expression pattern',
  'ArrayLength': 'Validates that an array has a specific minimum or maximum length',
  'CodeSystem': 'Validates that a code uses the correct coding system',
  'CustomFHIRPath': 'Custom FHIRPath expression validation'
};

const RESOURCE_TYPES = [
  'Patient',
  'Observation',
  'Condition',
  'Procedure',
  'Medication',
  'Encounter',
  'AllergyIntolerance',
  'Immunization',
  'DiagnosticReport',
  'Organization',
  'Practitioner'
];

const SEVERITIES = ['error', 'warning', 'information'];

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  rule,
  isOpen,
  onClose,
  onSave,
  projectBundle,
  hl7Samples,
}) => {
  const [formData, setFormData] = useState<Rule>({
    id: '',
    type: 'Required',
    resourceType: 'Patient',
    path: '',
    severity: 'error',
    message: '',
    params: {}
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    }
  }, [rule]);

  if (!isOpen || !rule) return null;

  // Validate required parameters based on rule type
  const validateParams = (): boolean => {
    const errors: Record<string, string> = {};
    const params = formData.params || {};

    switch (formData.type) {
      case 'FixedValue':
        if (!params.value && params.value !== 0 && params.value !== false) {
          errors.value = 'Fixed value is required';
        }
        break;
      case 'AllowedValues':
        if (!params.values || !Array.isArray(params.values) || params.values.length === 0) {
          errors.values = 'At least one allowed value is required';
        }
        break;
      case 'Regex':
        if (!params.pattern) {
          errors.pattern = 'Regex pattern is required';
        } else {
          // Validate regex syntax
          try {
            new RegExp(params.pattern);
          } catch (e) {
            errors.pattern = 'Invalid regex pattern';
          }
        }
        break;
      case 'ArrayLength':
        if (params.min === undefined && params.max === undefined) {
          errors.arrayLength = 'At least one of min or max is required';
        }
        if (params.min !== undefined && (isNaN(params.min) || params.min < 0)) {
          errors.min = 'Min must be a non-negative number';
        }
        if (params.max !== undefined && (isNaN(params.max) || params.max < 0)) {
          errors.max = 'Max must be a non-negative number';
        }
        if (params.min !== undefined && params.max !== undefined && params.min > params.max) {
          errors.arrayLength = 'Min cannot be greater than max';
        }
        break;
      case 'CodeSystem':
        if (!params.system) {
          errors.system = 'Code system URL is required';
        }
        break;
    }

    setParamErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.path || !formData.message) {
      alert('Path and Message are required');
      return;
    }
    
    if (!validateParams()) {
      return;
    }
    
    onSave(formData);
  };

  const handleChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear param errors when type changes
    if (field === 'type') {
      setParamErrors({});
    }
  };

  const handleParamChange = (paramKey: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      params: { ...(prev.params || {}), [paramKey]: value }
    }));
    // Clear specific param error when user types
    setParamErrors((prev) => {
      const updated = { ...prev };
      delete updated[paramKey];
      return updated;
    });
  };

  const isFormValid = (): boolean => {
    if (!formData.path || !formData.message) return false;
    
    const params = formData.params || {};
    
    switch (formData.type) {
      case 'FixedValue':
        return params.value !== undefined && params.value !== null && params.value !== '';
      case 'AllowedValues':
        return params.values && Array.isArray(params.values) && params.values.length > 0;
      case 'Regex':
        if (!params.pattern) return false;
        try {
          new RegExp(params.pattern);
          return true;
        } catch {
          return false;
        }
      case 'ArrayLength':
        return (params.min !== undefined || params.max !== undefined) &&
               (params.min === undefined || (!isNaN(params.min) && params.min >= 0)) &&
               (params.max === undefined || (!isNaN(params.max) && params.max >= 0)) &&
               (params.min === undefined || params.max === undefined || params.min <= params.max);
      case 'CodeSystem':
        return !!params.system;
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {rule.id.startsWith('rule-') && rule.path === '' ? 'Add New Rule' : 'Edit Rule'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {/* Rule Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {RULE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type *
              </label>
              <select
                value={formData.resourceType}
                onChange={(e) => handleChange('resourceType', e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* FHIRPath */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FHIRPath *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.path}
                  readOnly
                  placeholder="Click 'Select FHIRPath' to choose a path"
                  className="flex-1 px-3 py-2 border rounded font-mono text-sm bg-gray-50 cursor-not-allowed focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Select FHIRPath
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use the selector to choose a FHIRPath expression
              </p>
            </div>

            {/* Rule Type Description */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-800">
                <strong>ℹ️ {formData.type}:</strong> {RULE_TYPE_DESCRIPTIONS[formData.type]}
              </p>
            </div>

            {/* Parameter Fields - Conditional based on rule type */}
            {formData.type === 'FixedValue' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fixed Value *
                </label>
                <input
                  type="text"
                  value={formData.params?.value || ''}
                  onChange={(e) => handleParamChange('value', e.target.value)}
                  placeholder="Enter the expected fixed value"
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                    paramErrors.value ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                  required
                />
                {paramErrors.value && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {paramErrors.value}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  The field value must exactly match this value
                </p>
              </div>
            )}

            {formData.type === 'AllowedValues' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed Values (JSON Array) *
                </label>
                <textarea
                  value={
                    formData.params?.values
                      ? JSON.stringify(formData.params.values, null, 2)
                      : '[]'
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (Array.isArray(parsed)) {
                        handleParamChange('values', parsed);
                      }
                    } catch {
                      // Invalid JSON, keep typing
                    }
                  }}
                  placeholder='["value1", "value2", "value3"]'
                  rows={4}
                  className={`w-full px-3 py-2 border rounded font-mono text-sm focus:outline-none focus:ring-2 ${
                    paramErrors.values ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                  required
                />
                {paramErrors.values && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {paramErrors.values}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Must be a valid JSON array. The field value must be one of these values.
                </p>
              </div>
            )}

            {formData.type === 'Regex' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regex Pattern *
                </label>
                <input
                  type="text"
                  value={formData.params?.pattern || ''}
                  onChange={(e) => handleParamChange('pattern', e.target.value)}
                  placeholder="^[A-Z][a-z]+$"
                  className={`w-full px-3 py-2 border rounded font-mono text-sm focus:outline-none focus:ring-2 ${
                    paramErrors.pattern ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                  required
                />
                {paramErrors.pattern && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {paramErrors.pattern}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  JavaScript regular expression pattern (without delimiters)
                </p>
              </div>
            )}

            {formData.type === 'ArrayLength' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Length
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.params?.min ?? ''}
                      onChange={(e) => handleParamChange('min', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                        paramErrors.min ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                      }`}
                    />
                    {paramErrors.min && (
                      <p className="text-xs text-red-600 mt-1">{paramErrors.min}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Length
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.params?.max ?? ''}
                      onChange={(e) => handleParamChange('max', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="10"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                        paramErrors.max ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                      }`}
                    />
                    {paramErrors.max && (
                      <p className="text-xs text-red-600 mt-1">{paramErrors.max}</p>
                    )}
                  </div>
                </div>
                {paramErrors.arrayLength && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {paramErrors.arrayLength}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  At least one of min or max is required
                </p>
              </div>
            )}

            {formData.type === 'CodeSystem' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code System URL *
                  </label>
                  <input
                    type="text"
                    value={formData.params?.system || ''}
                    onChange={(e) => handleParamChange('system', e.target.value)}
                    placeholder="http://terminology.hl7.org/CodeSystem/v3-MaritalStatus"
                    className={`w-full px-3 py-2 border rounded font-mono text-sm focus:outline-none focus:ring-2 ${
                      paramErrors.system ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                    }`}
                    required
                  />
                  {paramErrors.system && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {paramErrors.system}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    The required coding system URL
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allowed Codes (Optional JSON Array)
                  </label>
                  <textarea
                    value={
                      formData.params?.codes
                        ? JSON.stringify(formData.params.codes, null, 2)
                        : '[]'
                    }
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        if (Array.isArray(parsed)) {
                          handleParamChange('codes', parsed);
                        }
                      } catch {
                        // Invalid JSON, keep typing
                      }
                    }}
                    placeholder='["M", "S", "D"]'
                    rows={3}
                    className="w-full px-3 py-2 border rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Restrict to specific codes within the system
                  </p>
                </div>
              </div>
            )}

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity *
              </label>
              <div className="flex gap-3">
                {SEVERITIES.map((severity) => (
                  <label key={severity} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      value={severity}
                      checked={formData.severity === severity}
                      onChange={(e) => handleChange('severity', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm capitalize">{severity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Error Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Enter the validation error message"
                rows={3}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid()}
              className={`px-4 py-2 rounded transition-colors ${
                isFormValid()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Save Rule
            </button>
          </div>
        </form>
      </div>

      {/* FHIRPath Selector Drawer */}
      {/* Drawer context is read-only by design */}
      <FhirPathSelectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={(path) => {
          handleChange('path', path);
          setIsDrawerOpen(false);
        }}
        resourceType={formData.resourceType}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
      />
    </div>
  );
};
