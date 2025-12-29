import React, { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import {
  ResourceSelector,
  RuleScopeSelector,
  SeveritySelector,
  UserHintInput,
  RulePreviewPanel,
  InstanceScopeDrawer,
  type InstanceScope,
} from './common';
import { composeInstanceScopedPath } from './common/InstanceScope.utils';
import { RequiredConfigSection, type RequiredParams } from './rule-types/required/RequiredConfigSection';
import { PatternConfigSection } from './rule-types/pattern/PatternConfigSection';
import { QuestionAnswerConfigSection } from './rule-types/question-answer/QuestionAnswerConfigSection';
import { FixedValueConfigSection } from './rule-types/fixed-value/FixedValueConfigSection';
import { AllowedValuesConfigSection } from './rule-types/allowed-values/AllowedValuesConfigSection';
import { ArrayLengthConfigSection } from './rule-types/array-length/ArrayLengthConfigSection';
import { CustomFHIRPathConfigSection } from './rule-types/custom-fhirpath/CustomFHIRPathConfigSection';
import { RequiredResourcesConfigSection, type ResourceRequirement as LegacyResourceRequirement } from './rule-types/required-resources/RequiredResourcesConfigSection';
import { ResourceConfigSection, type ResourceRequirement } from './rule-types/resource/ResourceConfigSection';
import { buildRequiredRule } from './rule-types/required/RequiredRuleHelpers';
import { buildPatternRule } from './rule-types/pattern/PatternRuleHelpers';
import { buildQuestionAnswerRule, getDefaultIterationScope } from './rule-types/question-answer/QuestionAnswerRuleHelpers';
import { buildFixedValueRule } from './rule-types/fixed-value/FixedValueRuleHelpers';
import { buildAllowedValuesRule } from './rule-types/allowed-values/AllowedValuesRuleHelpers';
import { buildArrayLengthRule } from './rule-types/array-length/ArrayLengthRuleHelpers';
import { buildCustomFHIRPathRule, parseCustomFHIRPathRule } from './rule-types/custom-fhirpath/CustomFHIRPathRuleHelpers';
import { buildRequiredResourcesRule, parseRequiredResourcesRule } from './rule-types/required-resources/RequiredResourcesRuleHelpers';
import { buildResourceRule, parseResourceRule } from './rule-types/resource/ResourceRuleHelpers';
import type { Rule } from '../../../types/rightPanelProps';
import type { QuestionAnswerConstraint } from './rule-types/question-answer/QuestionAnswerConstraint.types';
import { CONSTRAINT_TO_ERROR_CODE } from './rule-types/question-answer/QuestionAnswerConstraint.types';

/**
 * UNIFIED RULE FORM
 * 
 * The SINGLE entry point for rule authoring (create AND edit).
 * Enforces consistent UX skeleton across ALL rule types.
 * 
 * ARCHITECTURE:
 * - Shared sections: Resource, Scope, Severity, UserHint, Preview (ALL rules use these)
 * - ErrorCode handling: Centralized logic (fixed/governed/runtime-determined)
 * - Rule-specific config: Pluggable sections (RequiredConfigSection, PatternConfigSection, etc.)
 * 
 * RULES:
 * ❌ DO NOT create rule-specific variants of shared sections
 * ❌ DO NOT allow config sections to handle resource/scope/severity
 * ❌ DO NOT branch UX logic based on create vs edit mode
 * ✅ ALL rules use identical UX skeleton
 * ✅ Config sections handle ONLY rule-specific parameters
 * ✅ ErrorCode logic is centralized in this component
 */

type RuleType = 'Required' | 'Regex' | 'QuestionAnswer' | 'FixedValue' | 'AllowedValues' | 'ArrayLength' | 'CustomFHIRPath' | 'RequiredResources' | 'Resource';

interface RuleFormProps {
  mode: 'create' | 'edit';
  ruleType: RuleType;
  initialRule?: Partial<Rule> & { instanceScope?: string };
  onCancel: () => void;
  onSave: (rule: Rule) => void;
  projectBundle?: object;
  hl7Samples?: any[];
  questionSets?: any[];
  projectId?: string;
}

// ErrorCode mode determination
type ErrorCodeMode = 'fixed' | 'governed' | 'runtime-determined';

const getErrorCodeMode = (ruleType: RuleType): ErrorCodeMode => {
  if (ruleType === 'Required' || ruleType === 'Regex' || ruleType === 'FixedValue' || ruleType === 'AllowedValues' || ruleType === 'ArrayLength' || ruleType === 'RequiredResources' || ruleType === 'Resource') return 'fixed';
  if (ruleType === 'QuestionAnswer') return 'runtime-determined';
  if (ruleType === 'CustomFHIRPath') return 'governed';
  return 'fixed';
};

const getFixedErrorCode = (ruleType: RuleType): string => {
  if (ruleType === 'Required') return 'FIELD_REQUIRED';
  if (ruleType === 'Regex') return 'PATTERN_MISMATCH';
  if (ruleType === 'FixedValue') return 'FIXED_VALUE_MISMATCH';
  if (ruleType === 'AllowedValues') return 'VALUE_NOT_ALLOWED';
  if (ruleType === 'ArrayLength') return 'ARRAY_LENGTH_VIOLATION';
  if (ruleType === 'RequiredResources') return 'REQUIRED_RESOURCE_MISSING';
  if (ruleType === 'Resource') return 'RESOURCE_REQUIREMENT_VIOLATION';
  return '';
};

const RULE_TYPE_LABELS = {
  Required: 'Required Field',
  Regex: 'Pattern / Format',
  QuestionAnswer: 'Question & Answer',
  FixedValue: 'Fixed Value',
  AllowedValues: 'Allowed Values',
  ArrayLength: 'Array Length',
  CustomFHIRPath: 'Custom FHIRPath',
  RequiredResources: 'Required Resources',
  Resource: 'Resource (Bundle Composition)',
};

const RULE_TYPE_DESCRIPTIONS = {
  Required: 'Ensure a field or element is present and not empty',
  Regex: 'Validate field values using regular expressions or format patterns',
  QuestionAnswer: 'Validate answers against allowed values defined in a question set',
  FixedValue: 'Validate that a field always contains a specific fixed value',
  AllowedValues: 'Validate that a field value is within a predefined set of allowed values',
  ArrayLength: 'Validate that an array has a minimum and/or maximum number of elements',
  CustomFHIRPath: 'Custom validation logic using FHIRPath expressions',
  RequiredResources: 'Ensure specific resources exist in the bundle, with optional exact counts',
  Resource: 'Define complete bundle composition with resource requirements and attribute filters',
};

export const RuleForm: React.FC<RuleFormProps> = ({
  mode,
  ruleType,
  initialRule,
  onCancel,
  onSave,
  projectBundle,
  hl7Samples,
  questionSets,
  projectId = '',
}) => {
  // === SHARED STATE (ALL RULES) ===
  const [resourceType, setResourceType] = useState<string>(initialRule?.resourceType || 'Patient');
  const [instanceScope, setInstanceScope] = useState<InstanceScope>(
    initialRule?.instanceScope === 'first' ? { kind: 'first' } : { kind: 'all' }
  );
  const [severity, setSeverity] = useState<'error' | 'warning' | 'information'>(
    (initialRule?.severity as 'error' | 'warning' | 'information') || 'error'
  );
  const [userHint, setUserHint] = useState<string>(initialRule?.userHint || '');
  const [isScopeDrawerOpen, setIsScopeDrawerOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // === RULE-SPECIFIC STATE ===
  // Required (Field or Resource mode)
  const [requiredParams, setRequiredParams] = useState<RequiredParams | null>(null);
  const [requiredParamsValid, setRequiredParamsValid] = useState<boolean>(false);
  const [fieldPath, setFieldPath] = useState<string>(''); // Legacy for other rule types

  // Pattern
  const [pattern, setPattern] = useState<string>('');
  const [negate, setNegate] = useState<boolean>(false);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(true);

  // QuestionAnswer
  const [iterationScope, setIterationScope] = useState<string>('');
  const [questionPath, setQuestionPath] = useState<string>('');
  const [answerPath, setAnswerPath] = useState<string>('');
  const [questionSetId, setQuestionSetId] = useState<string>('');
  const [constraint, setConstraint] = useState<QuestionAnswerConstraint | ''>('');

  // FixedValue
  const [expectedValue, setExpectedValue] = useState<string>('');

  // AllowedValues
  const [allowedValues, setAllowedValues] = useState<string[]>([]);

  // ArrayLength
  const [minLength, setMinLength] = useState<number | undefined>(undefined);
  const [maxLength, setMaxLength] = useState<number | undefined>(undefined);

  // CustomFHIRPath
  const [customExpression, setCustomExpression] = useState<string>('');
  const [customErrorCode, setCustomErrorCode] = useState<string>('');

  // RequiredResources
  const [resourceRequirements, setResourceRequirements] = useState<LegacyResourceRequirement[]>([]);

  // Resource (new unified bundle rule)
  const [requirements, setRequirements] = useState<ResourceRequirement[]>([]);
  // === ERROR CODE STATE ===
  const errorCodeMode = getErrorCodeMode(ruleType);
  const [governedErrorCode, setGovernedErrorCode] = useState<string>(''); // For CustomFHIRPath

  // === VALIDATION ERRORS ===
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // === INITIALIZE FROM INITIAL RULE (EDIT MODE) ===
  useEffect(() => {
    if (mode === 'edit' && initialRule) {
      // Shared fields
      setResourceType(initialRule.resourceType || 'Patient');
      setInstanceScope(initialRule.instanceScope === 'first' ? { kind: 'first' } : { kind: 'all' });
      setSeverity((initialRule.severity as 'error' | 'warning' | 'information') || 'error');
      setUserHint(initialRule.userHint || '');

      // Rule-specific fields
      if (ruleType === 'Required') {
        // Check if this is a resource requirement or field requirement
        if (initialRule.params && 'resourceRequirement' in initialRule.params) {
          // Resource mode
          setRequiredParams(initialRule.params as RequiredParams);
        } else if (initialRule.path) {
          // Field mode - extract field path from full path
          const pathParts = initialRule.path.split('.');
          const fieldPath = pathParts.slice(1).join('.');
          setRequiredParams({ path: fieldPath });
        }
      }

      if (ruleType === 'Regex' && initialRule.params) {
        setPattern(initialRule.params.pattern || '');
        setNegate(initialRule.params.negate || false);
        setCaseSensitive(initialRule.params.caseSensitive !== false);
        // Extract field path
        const pathParts = initialRule.path?.split('.') || [];
        const fieldPath = pathParts.slice(1).join('.');
        setFieldPath(fieldPath);
      }

      if (ruleType === 'QuestionAnswer' && initialRule.params) {
        setIterationScope(initialRule.params.iterationScope || '');
        setQuestionPath(initialRule.params.questionPath || '');
        setAnswerPath(initialRule.params.answerPath || '');
        setQuestionSetId(initialRule.params.questionSetId || '');
        setConstraint(initialRule.params.constraint || '');
      }

      if (ruleType === 'FixedValue' && initialRule.params) {
        setExpectedValue(initialRule.params.value?.toString() || '');
        // Extract field path
        const pathParts = initialRule.path?.split('.') || [];
        const fieldPath = pathParts.slice(1).join('.');
        setFieldPath(fieldPath);
      }

      if (ruleType === 'AllowedValues' && initialRule.params) {
        const values = Array.isArray(initialRule.params.values) 
          ? initialRule.params.values.map((v: any) => v.toString())
          : [];
        setAllowedValues(values);
        // Extract field path
        const pathParts = initialRule.path?.split('.') || [];
        const fieldPath = pathParts.slice(1).join('.');
        setFieldPath(fieldPath);
      }

      if (ruleType === 'ArrayLength' && initialRule.params) {
        setMinLength(initialRule.params.min !== undefined ? Number(initialRule.params.min) : undefined);
        setMaxLength(initialRule.params.max !== undefined ? Number(initialRule.params.max) : undefined);
        // Extract array path
        const pathParts = initialRule.path?.split('.') || [];
        const arrayPath = pathParts.slice(1).join('.');
        setFieldPath(arrayPath);
      }

      if (ruleType === 'CustomFHIRPath' && initialRule) {
        const parsed = parseCustomFHIRPathRule(initialRule as Rule);
        setCustomExpression(parsed.expression);
        setCustomErrorCode(parsed.errorCode);
        setGovernedErrorCode(parsed.errorCode);
      }

      if (ruleType === 'RequiredResources' && initialRule) {
        const parsed = parseRequiredResourcesRule(initialRule as Rule);
        setResourceRequirements(parsed.requirements);
      }

      if (ruleType === 'Resource' && initialRule) {
        const parsed = parseResourceRule(initialRule as Rule);
        setRequirements(parsed.requirements);
      }
    }
  }, [mode, initialRule, ruleType]);

  // === INITIALIZE DEFAULTS FOR QUESTIONANSWER ===
  useEffect(() => {
    if (ruleType === 'QuestionAnswer' && mode === 'create') {
      const defaultIteration = getDefaultIterationScope(resourceType);
      setIterationScope(defaultIteration);
    }
  }, [ruleType, resourceType, mode]);

  // === COMPUTED ERROR CODE ===
  const computedErrorCode = (() => {
    if (errorCodeMode === 'fixed') return getFixedErrorCode(ruleType);
    if (errorCodeMode === 'runtime-determined' && constraint) {
      return CONSTRAINT_TO_ERROR_CODE[constraint];
    }
    if (errorCodeMode === 'governed') return governedErrorCode;
    return '';
  })();

  // === VALIDATION & SAVE ===
  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    // Validate shared fields
    if (!resourceType) newErrors.resourceType = 'Resource type is required';

    // Validate rule-specific fields
    if (ruleType === 'Required') {
      if (!fieldPath) newErrors.fieldPath = 'Please select a field';
    }

    if (ruleType === 'Regex') {
      if (!fieldPath) newErrors.fieldPath = 'Please select a field';
      if (!pattern) newErrors.pattern = 'Pattern is required';
    }

    if (ruleType === 'QuestionAnswer') {
      if (!iterationScope) newErrors.iterationScope = 'Iteration scope is required';
      if (!questionPath) newErrors.questionPath = 'Question path is required';
      if (!answerPath) newErrors.answerPath = 'Answer path is required';
      if (!questionSetId) newErrors.questionSetId = 'Please select a question set';
      if (!constraint) newErrors.constraint = 'Constraint is required';
    }

    if (ruleType === 'FixedValue') {
      if (!fieldPath) newErrors.fieldPath = 'Please select a field';
      if (!expectedValue && expectedValue !== '0' && expectedValue !== 'false') {
        newErrors.expectedValue = 'Expected value is required';
      }
    }

    if (ruleType === 'AllowedValues') {
      if (!fieldPath) newErrors.fieldPath = 'Please select a field';
      if (allowedValues.length === 0) {
        newErrors.allowedValues = 'At least one allowed value is required';
      }
    }

    if (ruleType === 'ArrayLength') {
      if (!fieldPath) newErrors.arrayPath = 'Please select an array field';
      if (minLength === undefined && maxLength === undefined) {
        newErrors.constraint = 'At least one of min or max is required';
      }
      if (minLength !== undefined && minLength < 0) {
        newErrors.min = 'Minimum must be non-negative';
      }
      if (maxLength !== undefined && maxLength < 0) {
        newErrors.max = 'Maximum must be non-negative';
      }
      if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
        newErrors.constraint = 'Minimum cannot be greater than maximum';
      }
    }

    if (ruleType === 'CustomFHIRPath') {
      if (!customExpression) newErrors.expression = 'FHIRPath expression is required';
      if (!customErrorCode) newErrors.errorCode = 'Error code is required';
    }

    if (ruleType === 'RequiredResources') {
      if (resourceRequirements.length === 0) {
        newErrors.requirements = 'At least one resource requirement is required';
      }
      // Validate each requirement
      resourceRequirements.forEach((req, index) => {
        if (!req.resourceType) {
          newErrors[`requirement_${index}`] = 'Resource type is required';
        }
        if (req.count < 1) {
          newErrors[`requirement_${index}`] = 'Count must be at least 1';
        }
      });
      // Check for duplicate resourceTypes
      const resourceTypes = resourceRequirements.map(r => r.resourceType);
      const duplicates = resourceTypes.filter((item, index) => resourceTypes.indexOf(item) !== index);
      if (duplicates.length > 0) {
        newErrors.requirements = `Duplicate resource types: ${duplicates.join(', ')}`;
      }
    }

    if (ruleType === 'Resource') {
      if (requirements.length === 0) {
        newErrors.requirements = 'At least one resource requirement is required';
      }
      // Validate each requirement
      requirements.forEach((req, index) => {
        if (!req.resourceType) {
          newErrors[`requirement_${index}`] = 'Resource type is required';
        }
        if (req.count < 1) {
          newErrors[`requirement_${index}`] = 'Count must be at least 1';
        }
        // Validate where filters
        if (req.where && req.where.length > 0) {
          req.where.forEach((filter, filterIndex) => {
            if (!filter.path) {
              newErrors[`filter_${index}_${filterIndex}`] = 'Filter path is required';
            }
            if (!filter.value) {
              newErrors[`filter_${index}_${filterIndex}`] = 'Filter value is required';
            }
          });
        }
      });
      // Check for duplicate resourceTypes
      const resourceTypes = requirements.map(r => r.resourceType);
      const duplicates = resourceTypes.filter((item, index) => resourceTypes.indexOf(item) !== index);
      if (duplicates.length > 0) {
        newErrors.requirements = `Duplicate resource types: ${duplicates.join(', ')}`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build rule based on type
    let rule: Rule;

    if (ruleType === 'Required') {
      if (!requiredParams) {
        throw new Error('Required params not set');
      }
      
      // Check if field mode or resource mode
      if ('path' in requiredParams) {
        // Field mode - use existing buildRequiredRule
        rule = buildRequiredRule({
          resourceType,
          instanceScope,
          fieldPath: requiredParams.path,
          severity,
          errorCode: computedErrorCode,
          userHint: userHint || undefined,
        });
      } else {
        // Resource mode - store resourceRequirement in params
        const fullPath = composeInstanceScopedPath(resourceType, instanceScope);
        rule = {
          id: mode === 'edit' && initialRule?.id ? initialRule.id : `rule-${Date.now()}`,
          type: 'Required',
          resourceType,
          path: fullPath,
          severity,
          errorCode: computedErrorCode,
          userHint: userHint || undefined,
          params: requiredParams,
          origin: 'manual',
          enabled: true,
          isMessageCustomized: false,
        };
      }
    } else if (ruleType === 'Regex') {
      rule = buildPatternRule({
        resourceType,
        instanceScope,
        fieldPath,
        pattern,
        negate,
        caseSensitive,
        severity,
        errorCode: computedErrorCode,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'QuestionAnswer') {
      rule = buildQuestionAnswerRule({
        resourceType,
        instanceScope: instanceScope.kind === 'all' ? 'all' : 'first',
        iterationScope,
        questionPath,
        answerPath,
        questionSetId,
        severity,
        constraint: constraint as QuestionAnswerConstraint,
        errorCode: computedErrorCode,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'FixedValue') {
      rule = buildFixedValueRule({
        resourceType,
        instanceScope,
        fieldPath,
        expectedValue,
        severity,
        errorCode: computedErrorCode,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'AllowedValues') {
      rule = buildAllowedValuesRule({
        resourceType,
        instanceScope,
        fieldPath,
        allowedValues,
        severity,
        errorCode: computedErrorCode,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'ArrayLength') {
      rule = buildArrayLengthRule({
        resourceType,
        instanceScope,
        arrayPath: fieldPath,
        min: minLength,
        max: maxLength,
        severity,
        errorCode: computedErrorCode,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'CustomFHIRPath') {
      rule = buildCustomFHIRPathRule({
        resourceType,
        instanceScope,
        expression: customExpression,
        errorCode: customErrorCode,
        severity,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'RequiredResources') {
      rule = buildRequiredResourcesRule({
        requirements: resourceRequirements,
        severity,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'Resource') {
      rule = buildResourceRule({
        requirements: requirements,
        severity,
        userHint: userHint || undefined,
      });
    } else {
      // Other types - not yet implemented
      return;
    }

    // If editing, preserve the original ID
    if (mode === 'edit' && initialRule?.id) {
      rule = { ...rule, id: initialRule.id };
    }

    onSave(rule);
  };

  // === RENDER ===
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Create' : 'Edit'} {RULE_TYPE_LABELS[ruleType]} Rule
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {RULE_TYPE_DESCRIPTIONS[ruleType]}
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
        {/* 1️⃣ SHARED: Resource Selector (hidden for bundle-level rules) */}
        {ruleType !== 'RequiredResources' && ruleType !== 'Resource' && (
          <ResourceSelector
            value={resourceType}
            onChange={setResourceType}
            disabled={mode === 'edit'} // Lock resource type in edit mode
            projectBundle={projectBundle} // Pass bundle for availability check
          />
        )}

        {/* 2️⃣ SHARED: Rule Scope Selector (hidden for bundle-level rules) */}
        {ruleType !== 'RequiredResources' && ruleType !== 'Resource' && (
          <RuleScopeSelector
            resourceType={resourceType}
            value={instanceScope}
            onSelect={() => setIsScopeDrawerOpen(true)}
            error={errors.instanceScope}
          />
        )}

        {/* 3️⃣ RULE-SPECIFIC CONFIG SECTION */}
        {ruleType === 'Required' && (
          <RequiredConfigSection
            mode={mode}
            resourceType={resourceType}
            initialParams={requiredParams || undefined}
            onParamsChange={(params, isValid) => {
              setRequiredParams(params);
              setRequiredParamsValid(isValid);
              setErrors({ ...errors, requiredParams: undefined });
            }}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
          />
        )}

        {ruleType === 'Regex' && (
          <PatternConfigSection
            resourceType={resourceType}
            fieldPath={fieldPath}
            pattern={pattern}
            negate={negate}
            caseSensitive={caseSensitive}
            onFieldPathChange={(path) => {
              setFieldPath(path);
              setErrors({ ...errors, fieldPath: undefined });
            }}
            onPatternChange={(p) => {
              setPattern(p);
              setErrors({ ...errors, pattern: undefined });
            }}
            onNegateChange={setNegate}
            onCaseSensitiveChange={setCaseSensitive}
            errors={{
              fieldPath: errors.fieldPath,
              pattern: errors.pattern,
            }}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
          />
        )}

        {ruleType === 'QuestionAnswer' && (
          <QuestionAnswerConfigSection
            projectId={projectId}
            resourceType={resourceType}
            iterationScope={iterationScope}
            questionPath={questionPath}
            answerPath={answerPath}
            questionSetId={questionSetId}
            constraint={constraint}
            onIterationScopeChange={(scope) => {
              setIterationScope(scope);
              setErrors({ ...errors, iterationScope: undefined });
            }}
            onQuestionPathChange={(path) => {
              setQuestionPath(path);
              setErrors({ ...errors, questionPath: undefined });
            }}
            onAnswerPathChange={(path) => {
              setAnswerPath(path);
              setErrors({ ...errors, answerPath: undefined });
            }}
            onQuestionSetIdChange={(id) => {
              setQuestionSetId(id);
              setErrors({ ...errors, questionSetId: undefined });
            }}
            onConstraintChange={(c) => {
              setConstraint(c);
              setErrors({ ...errors, constraint: undefined });
            }}
            errors={{
              iterationScope: errors.iterationScope,
              questionPath: errors.questionPath,
              answerPath: errors.answerPath,
              questionSetId: errors.questionSetId,
              constraint: errors.constraint,
            }}
            projectBundle={projectBundle}
            questionSets={questionSets}
          />
        )}

        {ruleType === 'FixedValue' && (
          <FixedValueConfigSection
            fieldPath={fieldPath}
            expectedValue={expectedValue}
            onFieldPathChange={(path) => {
              setFieldPath(path);
              setErrors({ ...errors, fieldPath: undefined });
            }}
            onExpectedValueChange={(value) => {
              setExpectedValue(value);
              setErrors({ ...errors, expectedValue: undefined });
            }}
            errors={{
              fieldPath: errors.fieldPath,
              expectedValue: errors.expectedValue,
            }}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            resourceType={resourceType}
          />
        )}

        {ruleType === 'AllowedValues' && (
          <AllowedValuesConfigSection
            fieldPath={fieldPath}
            allowedValues={allowedValues}
            onFieldPathChange={(path) => {
              setFieldPath(path);
              setErrors({ ...errors, fieldPath: undefined });
            }}
            onAllowedValuesChange={(values) => {
              setAllowedValues(values);
              setErrors({ ...errors, allowedValues: undefined });
            }}
            errors={{
              fieldPath: errors.fieldPath,
              allowedValues: errors.allowedValues,
            }}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            resourceType={resourceType}
          />
        )}

        {ruleType === 'ArrayLength' && (
          <ArrayLengthConfigSection
            arrayPath={fieldPath}
            min={minLength}
            max={maxLength}
            onArrayPathChange={(path) => {
              setFieldPath(path);
              setErrors({ ...errors, arrayPath: undefined });
            }}
            onMinChange={(value) => {
              setMinLength(value);
              setErrors({ ...errors, min: undefined, constraint: undefined });
            }}
            onMaxChange={(value) => {
              setMaxLength(value);
              setErrors({ ...errors, max: undefined, constraint: undefined });
            }}
            errors={{
              arrayPath: errors.arrayPath,
              min: errors.min,
              max: errors.max,
              constraint: errors.constraint,
            }}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            resourceType={resourceType}
          />
        )}

        {ruleType === 'CustomFHIRPath' && (
          <CustomFHIRPathConfigSection
            expression={customExpression}
            errorCode={customErrorCode}
            onExpressionChange={(expr) => {
              setCustomExpression(expr);
              setErrors({ ...errors, expression: undefined });
            }}
            onErrorCodeChange={(code) => {
              setCustomErrorCode(code);
              setGovernedErrorCode(code);
              setErrors({ ...errors, errorCode: undefined });
            }}
            errors={{
              expression: errors.expression,
              errorCode: errors.errorCode,
            }}
            resourceType={resourceType}
          />
        )}

        {ruleType === 'RequiredResources' && (
          <RequiredResourcesConfigSection
            requirements={resourceRequirements}
            onRequirementsChange={(reqs) => {
              setResourceRequirements(reqs);
              setErrors({ ...errors, requirements: undefined });
            }}
            errors={errors}
            projectBundle={projectBundle}
          />
        )}

        {ruleType === 'Resource' && (
          <ResourceConfigSection
            requirements={requirements}
            onRequirementsChange={(reqs) => {
              setRequirements(reqs);
              setErrors({ ...errors, requirements: undefined });
            }}
            errors={errors}
            projectBundle={projectBundle}
          />
        )}

        {/* 4️⃣ SHARED: Severity Selector */}
        <SeveritySelector
          value={severity}
          onChange={setSeverity}
        />

        {/* 5️⃣ CENTRALIZED: Error Code Handling */}
        {/* Note: CustomFHIRPath handles errorCode in its config section */}
        {ruleType !== 'CustomFHIRPath' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Error Code
            </label>

            {/* Fixed Error Code (Required, Pattern, FixedValue, AllowedValues, ArrayLength) */}
            {errorCodeMode === 'fixed' && (
              <div className="px-4 py-3 border border-blue-200 bg-blue-50 rounded-md">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-blue-600" />
                  <code className="text-sm font-semibold text-blue-900">{computedErrorCode}</code>
                  <span className="text-xs text-blue-700">(fixed)</span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  This rule type uses a fixed error code
                </p>
              </div>
            )}

            {/* Runtime-Determined Error Code (QuestionAnswer) */}
            {errorCodeMode === 'runtime-determined' && (
              <div className="px-4 py-3 border border-green-200 bg-green-50 rounded-md">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-green-600" />
                  <span className="text-sm font-semibold text-green-900">Automatic at runtime</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Error code is determined based on validation outcome (see info panel above)
                </p>
              </div>
            )}
          </div>
        )}

        {/* 6️⃣ SHARED: User Hint Input */}
        <UserHintInput
          value={userHint}
          onChange={setUserHint}
        />

        {/* 7️⃣ SHARED: Rule Preview Panel */}
        <RulePreviewPanel
          resourceType={resourceType}
          errorCode={computedErrorCode}
          severity={severity}
          fieldPath={fieldPath}
          userHint={userHint}
          collapsed={!showPreview}
          onToggle={() => setShowPreview(!showPreview)}
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
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          {mode === 'create' ? 'Create Rule' : 'Save Changes'}
        </button>
      </div>

      {/* Instance Scope Drawer */}
      <InstanceScopeDrawer
        isOpen={isScopeDrawerOpen}
        resourceType={resourceType}
        bundle={projectBundle || {}}
        value={instanceScope}
        onChange={(scope) => {
          setInstanceScope(scope);
          setErrors({ ...errors, instanceScope: undefined });
        }}
        onClose={() => setIsScopeDrawerOpen(false)}
      />
    </div>
  );
};
