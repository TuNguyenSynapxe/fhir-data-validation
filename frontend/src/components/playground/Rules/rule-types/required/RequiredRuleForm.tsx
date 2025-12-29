/**
 * ⚠️⚠️⚠️ LEGACY — DO NOT USE ⚠️⚠️⚠️
 * 
 * This component is DEPRECATED.
 * All rule authoring MUST use RuleForm.tsx with mode="create"|"edit".
 * 
 * Rendering this component is a BUG.
 * 
 * CORRECT USAGE:
 * <RuleForm mode="create" ruleType="Required" onSave={...} onCancel={...} />
 * <RuleForm mode="edit" ruleType="Required" initialRule={rule} onSave={...} onCancel={...} />
 * 
 * See: frontend/src/components/playground/Rules/RuleForm.tsx
 * See: frontend/UNIFIED_RULE_ARCHITECTURE_COMPLETE.md
 */

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, User, FileText, Activity, Building, MapPin, Briefcase, HelpCircle, ChevronDown } from 'lucide-react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';
import { UserHintInput, RuleErrorPreview } from '../../common';
import { InstanceScopeDrawer } from '../../common/InstanceScopeDrawer';
import type { InstanceScope } from '../../common/InstanceScope.types';
import { getInstanceScopeSummary } from '../../common/InstanceScope.utils';
import type { Rule } from '../../../../../types/rightPanelProps';
import {
  buildRequiredRule,
  SEVERITY_LEVELS,
} from './RequiredRuleHelpers';

// Resource type icons mapping
const RESOURCE_ICONS = {
  Patient: User,
  Encounter: Activity,
  Observation: FileText,
  Organization: Building,
  Location: MapPin,
  HealthcareService: Briefcase,
  QuestionnaireResponse: HelpCircle,
} as const;

// Supported resource types for Required rule (UI-limited)
const SUPPORTED_RESOURCES = [
  'Patient',
  'Encounter',
  'Observation',
  'Organization',
  'Location',
  'HealthcareService',
  'QuestionnaireResponse',
] as const;

type SupportedResource = typeof SUPPORTED_RESOURCES[number];

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
  const [resourceType, setResourceType] = useState<SupportedResource>(
    SUPPORTED_RESOURCES.includes(initialResourceType as any) 
      ? (initialResourceType as SupportedResource) 
      : 'Patient'
  );
  // Instance scope uses structured drawer-based selection
  const [instanceScope, setInstanceScope] = useState<InstanceScope>({ kind: 'all' });
  const [fieldPath, setFieldPath] = useState<string>('');
  const [severity, setSeverity] = useState<'error' | 'warning' | 'information'>('error');
  
  // PHASE X: errorCode is AUTO-SET to FIELD_REQUIRED (not user-selectable)
  const errorCode = 'FIELD_REQUIRED';
  const [userHint, setUserHint] = useState<string>('');
  
  // PHASE X: Error preview is collapsed by default
  const [showPreview, setShowPreview] = useState(false);
  
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
    // PHASE X: Only validate fieldPath (errorCode is auto-set)
    const newErrors: { instanceScope?: string; fieldPath?: string } = {};
    
    if (!fieldPath) {
      newErrors.fieldPath = 'Please select a field';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // PHASE X: Build rule with auto-set errorCode (FIELD_REQUIRED)
    const rule = buildRequiredRule({
      resourceType,
      instanceScope,
      fieldPath,
      severity,
      errorCode, // Auto-set to 'FIELD_REQUIRED'
      userHint: userHint || undefined,
    });

    // Save and close
    onSave(rule);
  };

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
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 overscroll-contain">
        {/* 1️⃣ Resource Type - Icon Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Resource Type
          </label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_RESOURCES.map((type) => {
              const Icon = RESOURCE_ICONS[type];
              const isSelected = resourceType === type;
              return (
                <button
                  key={type}
                  onClick={() => setResourceType(type)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon size={18} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                  <span className="text-sm font-medium">{type}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Select the FHIR resource this rule will validate
          </p>
        </div>

        {/* 2️⃣ Instance Scope - Compact Chip */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scope
          </label>
          <button
            onClick={handleSelectScope}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm transition-colors"
          >
            <span className="text-gray-600">Applies to:</span>
            <span className="font-medium text-gray-900">{scopeSummary.text}</span>
            <ChevronDown size={14} className="text-gray-500" />
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Click to change which {resourceType} instances this rule applies to
          </p>
        </div>

        {/* 3️⃣ Field to Validate - Primary Action */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Required Field <span className="text-red-500">*</span>
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
          {fieldPath && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <span className="text-green-800 font-medium">Required field:</span>
              <div className="font-mono text-green-900 mt-0.5">{resourceType}.{fieldPath}</div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Select the field path that must be present
          </p>
        </div>

        {/* 4️⃣ Severity - Horizontal Segmented Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity
          </label>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
            {SEVERITY_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setSeverity(level.value as any)}
                className={`
                  px-4 py-2 text-sm font-medium transition-colors border-r border-gray-300 last:border-r-0
                  ${severity === level.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {level.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {SEVERITY_LEVELS.find(l => l.value === severity)?.description}
          </p>
        </div>

        {/* 5️⃣ Error Code - Auto-set, Read-only Badge */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Error Type
          </label>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
            <span className="font-mono text-sm font-medium text-blue-900">FIELD_REQUIRED</span>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Auto-set</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Required rules always use <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">FIELD_REQUIRED</code>. No configuration needed.
          </p>
        </div>

        {/* 6️⃣ User Hint - De-emphasized */}
        <div>
          <UserHintInput
            value={userHint}
            onChange={setUserHint}
          />
        </div>

        {/* 7️⃣ Error Preview - Collapsed by Default */}
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ChevronDown 
              size={16} 
              className={`transform transition-transform ${showPreview ? 'rotate-0' : '-rotate-90'}`}
            />
            Preview Error
          </button>
          {showPreview && fieldPath && (
            <div className="mt-3">
              <RuleErrorPreview
                errorCode={errorCode}
                userHint={userHint}
                severity={severity}
                resourceType={resourceType}
                path={fieldPath}
              />
            </div>
          )}
        </div>
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
