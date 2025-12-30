/**
 * ⚠️⚠️⚠️ LEGACY — DO NOT USE ⚠️⚠️⚠️
 * 
 * This component is DEPRECATED.
 * All rule authoring MUST use RuleForm.tsx with mode="create"|"edit".
 * 
 * Rendering this component is a BUG.
 * 
 * CORRECT USAGE:
 * <RuleForm mode="create" ruleType="Regex" onSave={...} onCancel={...} />
 * <RuleForm mode="edit" ruleType="Regex" initialRule={rule} onSave={...} onCancel={...} />
 * 
 * See: frontend/src/components/playground/Rules/RuleForm.tsx
 * See: frontend/UNIFIED_RULE_ARCHITECTURE_COMPLETE.md
 */

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, HelpCircle, Lightbulb } from 'lucide-react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';
import { UserHintInput, RuleErrorPreview } from '../../common';
import { InstanceScopeDrawer } from '../../common/InstanceScopeDrawer';
import { InstanceScopePreview } from '../../common/InstanceScopePreview';
import type { InstanceScope } from '../../common/InstanceScope.types';
import type { Rule } from '../../../../../types/rightPanelProps';
import {
  buildPatternRule,
  validatePattern,
  testPattern,
  RESOURCE_TYPES,
  SEVERITY_LEVELS,
  COMMON_PATTERNS,
} from './PatternRuleHelpers';

interface PatternRuleFormProps {
  onCancel: () => void;
  onSave: (rule: Rule) => void;
  projectBundle?: object;
  hl7Samples?: any[];
  initialResourceType?: string;
}

export const PatternRuleForm: React.FC<PatternRuleFormProps> = ({
  onCancel,
  onSave,
  projectBundle,
  hl7Samples,
  initialResourceType = 'Patient',
}) => {
  const [resourceType, setResourceType] = useState<string>(initialResourceType);
  // Instance scope uses structured drawer-based selection (RULE: Instance Scope must ALWAYS open in a drawer)
  const [instanceScope, setInstanceScope] = useState<InstanceScope>({ kind: 'all' });
  const [fieldPath, setFieldPath] = useState<string>('');
  const [pattern, setPattern] = useState<string>('');
  const [negate, setNegate] = useState<boolean>(false);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(true);
  const [severity, setSeverity] = useState<'error' | 'warning' | 'information'>('error');
  // PHASE 3: Pattern rules have fixed errorCode (PATTERN_MISMATCH)
  const errorCode = 'PATTERN_MISMATCH';
  const [userHint, setUserHint] = useState<string>('');
  const [isFieldDrawerOpen, setIsFieldDrawerOpen] = useState(false);
  const [isScopeDrawerOpen, setIsScopeDrawerOpen] = useState(false);
  const [showPatternHelp, setShowPatternHelp] = useState(false);
  const [testValue, setTestValue] = useState<string>('');
  const [errors, setErrors] = useState<{ fieldPath?: string; pattern?: string }>({});

  // Reset instance scope when resource type changes
  useEffect(() => {
    setInstanceScope({ kind: 'all' });
  }, [resourceType]);

  const handleSelectField = () => {
    setIsFieldDrawerOpen(true);
  };

  const handleSelectScope = () => {
    setIsScopeDrawerOpen(true);
  };

  const handleScopeChange = (scope: InstanceScope) => {
    setInstanceScope(scope);
  };

  const handlePathSelected = (path: string) => {
    setFieldPath(path);
    setErrors({ ...errors, fieldPath: undefined });
    setIsFieldDrawerOpen(false);
  };

  const handlePatternChange = (value: string) => {
    setPattern(value);
    const error = validatePattern(value);
    if (error) {
      setErrors({ ...errors, pattern: error });
    } else {
      setErrors({ ...errors, pattern: undefined });
    }
  };

  const handleSelectCommonPattern = (commonPattern: typeof COMMON_PATTERNS[number]) => {
    setPattern(commonPattern.pattern);
    setErrors({ ...errors, pattern: undefined });
    setShowPatternHelp(false);
  };

  const handleSave = () => {
    // PHASE 3: Validate required fields (errorCode is now fixed to PATTERN_MISMATCH)
    const newErrors: { fieldPath?: string; pattern?: string } = {};

    if (!fieldPath) {
      newErrors.fieldPath = 'Please select a field';
    }

    if (!pattern) {
      newErrors.pattern = 'Pattern is required';
    } else {
      const patternError = validatePattern(pattern);
      if (patternError) {
        newErrors.pattern = patternError;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // PHASE 3: Build rule with fixed errorCode PATTERN_MISMATCH + userHint (NO message)
    try {
      const rule = buildPatternRule({
        resourceType,
        instanceScope,
        fieldPath,
        pattern,
        negate,
        caseSensitive,
        severity,
        errorCode: 'PATTERN_MISMATCH',
        userHint: userHint || undefined,
      });

      // Save and close
      onSave(rule);
    } catch (error) {
      // Handle field path validation errors
      const errorMessage = error instanceof Error ? error.message : 'Invalid field path';
      setErrors({ fieldPath: errorMessage });
    }
  };

  // Test pattern against test value
  const testResult = testValue && pattern
    ? testPattern(pattern, testValue, caseSensitive)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Create Pattern / Format Rule</h2>
          <p className="text-sm text-gray-600 mt-1">
            Validate field values using regular expressions or format patterns
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
        {/* Resource Target */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Apply to Resource
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
        </div>

        {/* Instance Scope - DRAWER-BASED (RULE: Instance Scope must ALWAYS open in a drawer) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instance Scope
          </label>
          <button
            onClick={handleSelectScope}
            className="w-full px-4 py-3 border border-gray-300 rounded-md text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <InstanceScopePreview
                  resourceType={resourceType}
                  instanceScope={instanceScope}
                  variant="inline"
                />
              </div>
              <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            </div>
          </button>
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
            Select the field path that should match the pattern
          </p>
        </div>

        {/* Pattern Definition */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Validation Pattern <span className="text-red-500">*</span>
            </label>
            <button
              onClick={() => setShowPatternHelp(!showPatternHelp)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Lightbulb size={14} />
              {showPatternHelp ? 'Hide' : 'Show'} common patterns
            </button>
          </div>
          
          {/* Common Patterns */}
          {showPatternHelp && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
              <div className="text-xs font-medium text-blue-900 mb-2">Common Patterns:</div>
              {COMMON_PATTERNS.map((cp) => (
                <button
                  key={cp.name}
                  onClick={() => handleSelectCommonPattern(cp)}
                  className="w-full text-left p-2 bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                >
                  <div className="text-xs font-medium text-gray-900">{cp.name}</div>
                  <div className="text-xs font-mono text-gray-600 mt-0.5">{cp.pattern}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{cp.description}</div>
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            value={pattern}
            onChange={(e) => handlePatternChange(e.target.value)}
            placeholder="e.g., ^[A-Z0-9]{8}$"
            className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.pattern ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.pattern && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
              <AlertCircle size={12} />
              <span>{errors.pattern}</span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Enter a regular expression pattern
          </p>
        </div>

        {/* Pattern Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pattern Behavior
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="negate"
                checked={!negate}
                onChange={() => setNegate(false)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Matches pattern
                </div>
                <div className="text-xs text-gray-600">
                  Value must match the regex pattern
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="negate"
                checked={negate}
                onChange={() => setNegate(true)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Does NOT match pattern
                </div>
                <div className="text-xs text-gray-600">
                  Value must NOT match the regex pattern (forbidden)
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Case Sensitivity */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Case sensitive</span>
              <p className="text-xs text-gray-600">
                Pattern matching is case-sensitive (A ≠ a)
              </p>
            </div>
          </label>
        </div>

        {/* Pattern Tester */}
        {pattern && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Test Pattern</span>
            </div>
            <input
              type="text"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder="Enter a test value..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {testValue && testResult !== null && (
              <div className={`mt-2 text-xs ${testResult ? 'text-green-700' : 'text-red-700'}`}>
                {testResult ? '✓ Matches pattern' : '✗ Does not match pattern'}
                {negate && ` (validation would ${testResult ? 'FAIL' : 'PASS'})`}
                {!negate && ` (validation would ${testResult ? 'PASS' : 'FAIL'})`}
              </div>
            )}
          </div>
        )}

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
                  <div className="text-sm font-medium text-gray-900">{level.label}</div>
                  <div className="text-xs text-gray-600">{level.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* PHASE 3: Fixed ErrorCode Display (READ-ONLY) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Error Code
          </label>
          <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-md">
            <div className="font-mono text-sm font-semibold text-gray-900">
              PATTERN_MISMATCH
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Pattern rules have a fixed failure meaning
            </p>
          </div>
        </div>

        {/* PHASE 3: User Hint Input (OPTIONAL) */}
        <UserHintInput
          value={userHint}
          onChange={setUserHint}
        />

        {/* PHASE 3: Live Error Preview */}
        <RuleErrorPreview
          errorCode={errorCode}
          userHint={userHint}
          severity={severity}
          resourceType={resourceType}
          path={fieldPath || 'field.path'}
          details={{
            expected: { pattern, caseSensitive, negate },
            actual: { value: '<sample>' }
          }}
        />
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
          disabled={!fieldPath || !pattern || !!errors.pattern}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Rule
        </button>
      </div>

      {/* Instance Scope Drawer (RULE: Instance Scope must ALWAYS open in a drawer) */}
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
