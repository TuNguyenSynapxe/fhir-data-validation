import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import FhirPathSelectorDrawer from '../../rules/FhirPathSelectorDrawer';
import { MessageEditor } from '../MessageEditor';
import { RuleForm } from './RuleForm';
import { 
  generateDefaultMessage, 
  type RuleContext 
} from '../../../utils/ruleMessageTemplates';
import type { Rule } from '../../../types/rightPanelProps';

/**
 * RULE EDITOR MODAL
 * 
 * ARCHITECTURE (UNIFIED):
 * - Required, Regex, QuestionAnswer → RuleForm with mode="edit"
 * - Legacy rule types (FixedValue, AllowedValues, CodeSystem, etc.) → Legacy editor (below)
 * 
 * MIGRATION PATH:
 * - Phase 1: Route Required/Regex/QuestionAnswer to RuleForm ✅
 * - Phase 2: Migrate remaining rule types to RuleForm config sections
 * - Phase 3: Delete legacy editor entirely
 */

interface RuleEditorModalProps {
  rule: Rule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  projectBundle?: object;
  hl7Samples?: any[];
  projectId?: string;
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

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  rule,
  isOpen,
  onClose,
  onSave,
  projectBundle,
  hl7Samples,
  projectId,
}) => {
  // === UNIFIED RULE FORM ROUTING ===
  // Route Required, Regex, QuestionAnswer, FixedValue, AllowedValues, ArrayLength, CustomFHIRPath to RuleForm
  if (rule && ['Required', 'Regex', 'QuestionAnswer', 'FixedValue', 'AllowedValues', 'ArrayLength', 'CustomFHIRPath'].includes(rule.type)) {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl h-full max-h-[90vh] overflow-hidden flex flex-col">
          <RuleForm
            mode="edit"
            ruleType={rule.type as 'Required' | 'Regex' | 'QuestionAnswer' | 'FixedValue' | 'AllowedValues' | 'ArrayLength' | 'CustomFHIRPath'}
            initialRule={rule}
            onCancel={onClose}
            onSave={onSave}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            projectId={projectId}
          />
        </div>
      </div>
    );
  }

  // === LEGACY EDITOR (for CodeSystem, etc.) ===
  const [formData, setFormData] = useState<Rule>({
    id: '',
    type: 'Required',
    resourceType: 'Patient',
    path: '',
    severity: 'error',
    message: '',
    params: {},
    isMessageCustomized: false
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});
  const prevRuleTypeRef = useRef<string>('');
  const prevPathRef = useRef<string>('');
  const prevParamsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (rule) {
      setFormData({
        ...rule,
        isMessageCustomized: rule.isMessageCustomized ?? false
      });
      prevRuleTypeRef.current = rule.type;
      prevPathRef.current = rule.path;
      prevParamsRef.current = rule.params || {};
    }
  }, [rule]);

  // Auto-generate message when rule type, path, or params change (unless customized)
  useEffect(() => {
    if (!formData.isMessageCustomized && formData.path) {
      const hasRuleTypeChanged = prevRuleTypeRef.current !== formData.type;
      const hasPathChanged = prevPathRef.current !== formData.path;
      const hasParamsChanged = JSON.stringify(prevParamsRef.current) !== JSON.stringify(formData.params || {});
      
      if (hasRuleTypeChanged || hasPathChanged || hasParamsChanged) {
        const context: RuleContext = {
          resourceType: formData.resourceType,
          path: formData.path,
          ruleType: formData.type,
          severity: formData.severity,
          params: formData.params
        };
        
        const defaultMessage = generateDefaultMessage(context);
        setFormData(prev => ({ ...prev, message: defaultMessage }));
        
        // Update refs
        prevRuleTypeRef.current = formData.type;
        prevPathRef.current = formData.path;
        prevParamsRef.current = formData.params || {};
      }
    }
  }, [formData.type, formData.path, formData.params, formData.isMessageCustomized, formData.resourceType, formData.severity]);

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
    if (!formData.path) {
      alert('Path is required');
      return;
    }
    
    if (!validateParams()) {
      return;
    }
    
    onSave(formData);
    onClose();
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
    if (!formData.path) return false;
    
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {rule.id.startsWith('rule-') && rule.path === '' ? 'Create Rule' : 'Edit Rule'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {RULE_TYPE_DESCRIPTIONS[formData.type] || 'Configure validation rule'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 overscroll-contain">
            {/* Rule Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rule Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {RULE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {RULE_TYPE_DESCRIPTIONS[formData.type]}
              </p>
            </div>

            {/* Resource Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Type
              </label>
              <select
                value={formData.resourceType}
                onChange={(e) => handleChange('resourceType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                The FHIR resource this rule will validate
              </p>
            </div>

            {/* Field to Validate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field to Validate <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md text-left transition-colors hover:border-blue-500 hover:bg-blue-50"
              >
                {formData.path ? (
                  <span className="font-mono text-sm text-gray-900">{formData.path}</span>
                ) : (
                  <span className="text-gray-500">Click to select a field...</span>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Select the field path that must be present
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="severity"
                    value="error"
                    checked={formData.severity === 'error'}
                    onChange={(e) => handleChange('severity', e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Error</div>
                    <div className="text-xs text-gray-600">Validation must pass</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="severity"
                    value="warning"
                    checked={formData.severity === 'warning'}
                    onChange={(e) => handleChange('severity', e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Warning</div>
                    <div className="text-xs text-gray-600">Should be fixed</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="severity"
                    value="information"
                    checked={formData.severity === 'information'}
                    onChange={(e) => handleChange('severity', e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Information</div>
                    <div className="text-xs text-gray-600">Advisory only</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Message Editor with Token Support */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Error Message (Optional)
              </label>
              <MessageEditor
                value={formData.message || ''}
                onChange={(newMessage) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    message: newMessage,
                    isMessageCustomized: true // Mark as customized when user edits
                  }));
                }}
                onResetToDefault={() => {
                  setFormData(prev => ({ 
                    ...prev, 
                    isMessageCustomized: false // Clear customization flag when reset
                  }));
                }}
                ruleContext={{
                  resourceType: formData.resourceType,
                  path: formData.path,
                  ruleType: formData.type,
                  severity: formData.severity,
                  params: formData.params
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use the default message. You can use tokens like {'{'}resource{'}'}, {'{'}path{'}'}, and {'{'}fullPath{'}'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
