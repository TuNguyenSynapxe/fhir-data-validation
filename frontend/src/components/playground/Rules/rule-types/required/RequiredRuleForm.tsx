import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';
import { MessageEditor } from '../../../MessageEditor';
import { InstanceScopeDrawer } from '../../common/InstanceScopeDrawer';
import type { InstanceScope } from '../../common/InstanceScope.types';
import { getInstanceScopeSummary } from '../../common/InstanceScope.utils';
import {
  buildRequiredRule,
  getDefaultErrorMessage,
  RESOURCE_TYPES,
  SEVERITY_LEVELS,
} from './RequiredRuleHelpers';

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

interface RequiredRuleFormProps {
  onCancel: () => void;
  onSave: (rule: Rule) => void;
  projectBundle?: object;
  hl7Samples?: any[];
  initialResourceType?: string;
}

export const RequiredRuleForm: React.FC<RequiredRuleFormProps> = ({
  onCancel,
  onSave,
  projectBundle,
  hl7Samples,
  initialResourceType = 'Patient',
}) => {
  const [resourceType, setResourceType] = useState<string>(initialResourceType);
  // Instance scope uses structured drawer-based selection
  const [instanceScope, setInstanceScope] = useState<InstanceScope>({ kind: 'all' });
  const [fieldPath, setFieldPath] = useState<string>('');
  const [severity, setSeverity] = useState<'error' | 'warning' | 'information'>('error');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isScopeDrawerOpen, setIsScopeDrawerOpen] = useState(false);
  const [isFieldDrawerOpen, setIsFieldDrawerOpen] = useState(false);
  const [errors, setErrors] = useState<{ instanceScope?: string; fieldPath?: string }>({});

  // Reset instance scope when resource type changes
  useEffect(() => {
    setInstanceScope({ kind: 'all' });
    setErrors({});
  }, [resourceType]);

  const handleSelectField = () => {
    setIsFieldDrawerOpen(true);
  };

  const handleSelectScope = () => {
    setIsScopeDrawerOpen(true);
  };

  const handleScopeChange = (scope: InstanceScope) => {
    setInstanceScope(scope);
    setErrors({ ...errors, instanceScope: undefined });
  };

  const handlePathSelected = (path: string) => {
    setFieldPath(path);
    setErrors({ ...errors, fieldPath: undefined });
    setIsFieldDrawerOpen(false);
  };

  const handleSave = () => {
    // Validate required fields
    const newErrors: { instanceScope?: string; fieldPath?: string } = {};
    
    if (!fieldPath) {
      newErrors.fieldPath = 'Please select a field';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build rule
    const rule = buildRequiredRule({
      resourceType,
      instanceScope,
      fieldPath,
      severity,
      message: customMessage,
    });

    // Save and close
    onSave(rule);
  };

  const defaultMessage = fieldPath
    ? getDefaultErrorMessage(resourceType, fieldPath)
    : '';

  const displayMessage = customMessage || defaultMessage;
  const scopeSummary = getInstanceScopeSummary(resourceType, instanceScope);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Create Required Field Rule</h2>
          <p className="text-sm text-gray-600 mt-1">
            Ensure a field or element is present and not empty
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Resource Target */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resource Type
          </label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Instance Scope - Drawer-Based Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instance Scope
          </label>
          <button
            onClick={handleSelectScope}
            className={`w-full px-4 py-3 border rounded-md text-left transition-colors ${
              errors.instanceScope
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 break-words">{scopeSummary.text}</div>
                <div className="text-xs font-mono text-gray-500 mt-0.5 break-all">{scopeSummary.fhirPath}</div>
              </div>
              <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            </div>
          </button>
          {errors.instanceScope && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
              <AlertCircle size={12} />
              <span>{errors.instanceScope}</span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Click to change which {resourceType} instances this rule applies to
          </p>
        </div>

        {/* Field Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Field to Validate <span className="text-red-500">*</span>
          </label>
          <button
            onClick={handleSelectField}
            className={`w-full px-4 py-3 border rounded-md text-left transition-colors ${
              errors.fieldPath
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            {fieldPath ? (
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-gray-900">{fieldPath}</span>
                <Check size={16} className="text-green-600" />
              </div>
            ) : (
              <span className="text-gray-500">Click to select a field...</span>
            )}
          </button>
          {errors.fieldPath && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
              <AlertCircle size={12} />
              <span>{errors.fieldPath}</span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Select the field path that must be present
          </p>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity
          </label>
          <div className="space-y-2">
            {SEVERITY_LEVELS.map((level) => (
              <label key={level.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="severity"
                  value={level.value}
                  checked={severity === level.value}
                  onChange={() => setSeverity(level.value as any)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {level.label}
                  </div>
                  <div className="text-xs text-gray-600">
                    {level.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Error Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Error Message (Optional)
          </label>
          <MessageEditor
            value={customMessage}
            onChange={setCustomMessage}
            ruleContext={{
              resourceType,
              path: fieldPath,
              ruleType: 'Required',
              severity,
            }}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use the default message. You can use tokens like {'{'}fieldName{'}'} and {'{'}resourceType{'}'}
          </p>
        </div>

        {/* Preview */}
        {displayMessage && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="text-xs font-medium text-gray-700 mb-1">Message Preview:</div>
            <div className="text-sm text-gray-900">{displayMessage}</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!fieldPath}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Rule
        </button>
      </div>

      {/* Instance Scope Drawer */}
      <InstanceScopeDrawer
        isOpen={isScopeDrawerOpen}
        resourceType={resourceType}
        bundle={projectBundle || {}}
        value={instanceScope}
        onChange={handleScopeChange}
        onClose={() => setIsScopeDrawerOpen(false)}
      />

      {/* FHIRPath Selector Drawer for Field Path */}
      <FhirPathSelectorDrawer
        isOpen={isFieldDrawerOpen}
        onClose={() => setIsFieldDrawerOpen(false)}
        onSelect={handlePathSelected}
        resourceType={resourceType}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
      />
    </div>
  );
};
