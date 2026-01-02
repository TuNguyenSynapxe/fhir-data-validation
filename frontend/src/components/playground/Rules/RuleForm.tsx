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
import { RequiredConfigSection, type RequiredParams } from './rule-types/required/RequiredConfigSection';
import { PatternConfigSection } from './rule-types/pattern/PatternConfigSection';
import { QuestionAnswerConfigSection } from './rule-types/question-answer/QuestionAnswerConfigSection';
import { FixedValueConfigSection } from './rule-types/fixed-value/FixedValueConfigSection';
import { AllowedValuesConfigSection } from './rule-types/allowed-values/AllowedValuesConfigSection';
import { ArrayLengthConfigSection } from './rule-types/array-length/ArrayLengthConfigSection';
import { CustomFHIRPathConfigSection } from './rule-types/custom-fhirpath/CustomFHIRPathConfigSection';
import { ResourceConfigSection, type ResourceRequirement } from './rule-types/resource/ResourceConfigSection';
import { TerminologyConfigSection, type TerminologyParams } from './rule-types/terminology/TerminologyConfigSection';
import { buildRequiredRule } from './rule-types/required/RequiredRuleHelpers';
import { buildPatternRule } from './rule-types/pattern/PatternRuleHelpers';
import { buildQuestionAnswerRule, getDefaultIterationScope } from './rule-types/question-answer/QuestionAnswerRuleHelpers';
import { buildFixedValueRule } from './rule-types/fixed-value/FixedValueRuleHelpers';
import { buildAllowedValuesRule } from './rule-types/allowed-values/AllowedValuesRuleHelpers';
import { buildArrayLengthRule } from './rule-types/array-length/ArrayLengthRuleHelpers';
import { buildCustomFHIRPathRule, parseCustomFHIRPathRule } from './rule-types/custom-fhirpath/CustomFHIRPathRuleHelpers';
import { buildResourceRule, parseResourceRule } from './rule-types/resource/ResourceRuleHelpers';
import { buildTerminologyRule, parseTerminologyRule } from './rule-types/terminology/TerminologyRuleHelpers';
import type { Rule } from '../../../types/rightPanelProps';

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

type RuleType = 'Required' | 'Regex' | 'QuestionAnswer' | 'FixedValue' | 'AllowedValues' | 'ArrayLength' | 'CustomFHIRPath' | 'Resource' | 'Terminology';

interface RuleFormProps {
  mode: 'create' | 'edit';
  ruleType: RuleType;
  initialRule?: Partial<Rule>;
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
  if (ruleType === 'Required' || ruleType === 'Regex' || ruleType === 'FixedValue' || ruleType === 'AllowedValues' || ruleType === 'ArrayLength' || ruleType === 'Resource' || ruleType === 'Terminology') return 'fixed';
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
  if (ruleType === 'Resource') return 'RESOURCE_REQUIREMENT_VIOLATION';
  if (ruleType === 'Terminology') return 'CODESYSTEM_VIOLATION';
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
  Resource: 'Resource (Bundle Composition)',
  Terminology: 'Terminology / CodeSet',
};

const RULE_TYPE_DESCRIPTIONS = {
  Required: 'Ensure a field or element is present and not empty',
  Regex: 'Validate field values using regular expressions or format patterns',
  QuestionAnswer: 'Validate answers against allowed values defined in a question set',
  FixedValue: 'Validate that a field always contains a specific fixed value',
  AllowedValues: 'Validate that a field value is within a predefined set of allowed values',
  ArrayLength: 'Validate that an array has a minimum and/or maximum number of elements',
  CustomFHIRPath: 'Custom validation logic using FHIRPath expressions',
  Resource: 'Define complete bundle composition with resource requirements and attribute filters',
  Terminology: 'Validate coded fields against ValueSets, CodeSystems, or specific system/code pairs',
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
    initialRule?.instanceScope || { kind: 'all' }
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
  const [questionSetId, setQuestionSetId] = useState<string>('');

  // FixedValue
  const [expectedValue, setExpectedValue] = useState<string>('');

  // AllowedValues
  const [allowedValues, setAllowedValues] = useState<string[]>([]);

  // ArrayLength
  const [minLength, setMinLength] = useState<number | undefined>(undefined);
  const [maxLength, setMaxLength] = useState<number | undefined>(undefined);

  // CustomFHIRPath
  const [customExpression, setCustomExpression] = useState<string>('');

  // Resource (new unified bundle rule)
  const [requirements, setRequirements] = useState<ResourceRequirement[]>([]);

  // Terminology
  const [terminologyParams, setTerminologyParams] = useState<TerminologyParams>({
    fieldPath: '',
    validationType: 'AllowedCode',
  });
  const [isTerminologyValid, setIsTerminologyValid] = useState(false);

  // === ERROR CODE STATE ===
  const errorCodeMode = getErrorCodeMode(ruleType);
  const [governedErrorCode, setGovernedErrorCode] = useState<string>(''); // For CustomFHIRPath

  // === VALIDATION ERRORS ===
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // === INITIALIZE FROM INITIAL RULE (EDIT MODE) ===
  useEffect(() => {
    if (mode === 'edit' && initialRule) {
      console.log('[RuleForm] Initializing from rule:', {
        ruleType,
        path: initialRule.path,
        params: initialRule.params,
        resourceType: initialRule.resourceType
      });
      
      // Shared fields
      setResourceType(initialRule.resourceType || 'Patient');
      setInstanceScope(initialRule.instanceScope || { kind: 'all' });
      setSeverity((initialRule.severity as 'error' | 'warning' | 'information') || 'error');
      setUserHint(initialRule.userHint || '');

      // Rule-specific fields
      if (ruleType === 'Required') {
        // Check if this is a resource requirement or field requirement
        if (initialRule.params && 'resourceRequirement' in initialRule.params) {
          // Resource mode
          setRequiredParams(initialRule.params as RequiredParams);
        } else if (initialRule.fieldPath) {
          // NEW FORMAT: Direct fieldPath property (field mode)
          setRequiredParams({ path: initialRule.fieldPath });
        } else if (initialRule.path) {
          // LEGACY FORMAT: Extract field path from full path (field mode)
          const pathParts = initialRule.path.split('.');
          const fieldPath = pathParts.slice(1).join('.');
          setRequiredParams({ path: fieldPath });
        }
      }

      if (ruleType === 'Regex') {
        // Extract field path - check new format first, then legacy
        if (initialRule.fieldPath) {
          // NEW FORMAT: Direct fieldPath property
          console.log('[RuleForm] Regex - Using fieldPath:', initialRule.fieldPath);
          setFieldPath(initialRule.fieldPath);
        } else if (initialRule.path) {
          // LEGACY FORMAT: Extract from composed path
          const pathParts = initialRule.path.split('.');
          const fieldPath = pathParts.slice(1).join('.');
          console.log('[RuleForm] Regex - Extracted from path:', { fullPath: initialRule.path, fieldPath });
          setFieldPath(fieldPath);
        } else {
          console.log('[RuleForm] Regex - No path or fieldPath in initialRule');
        }
        
        // Extract params if available
        if (initialRule.params) {
          setPattern(initialRule.params.pattern || '');
          setNegate(initialRule.params.negate || false);
          setCaseSensitive(initialRule.params.caseSensitive !== false);
        }
      }

      if (ruleType === 'QuestionAnswer' && initialRule.params) {
        // Extract iterationScope from fieldPath (NEW FORMAT) or path (LEGACY)
        if (initialRule.fieldPath) {
          // NEW FORMAT: Direct fieldPath property
          console.log('[RuleForm] QuestionAnswer - Using fieldPath as iterationScope:', initialRule.fieldPath);
          setIterationScope(initialRule.fieldPath);
        } else if (initialRule.path) {
          // LEGACY FORMAT: Extract from composed path
          // Path format: Observation[*].component[*] or Observation[0].component[*]
          // We need to extract: component[*]
          const pathParts = initialRule.path.split('.');
          const iterationScopeParts = pathParts.slice(1);
          const extractedIterationScope = iterationScopeParts.join('.');
          console.log('[RuleForm] QuestionAnswer - Extracted from path:', { fullPath: initialRule.path, iterationScope: extractedIterationScope });
          setIterationScope(extractedIterationScope);
        }
        
        setQuestionPath(initialRule.params.questionPath || '');
        setQuestionSetId(initialRule.params.questionSetId || '');
      }

      if (ruleType === 'FixedValue') {
        // Extract field path - check new format first, then legacy
        if (initialRule.fieldPath) {
          // NEW FORMAT: Direct fieldPath property
          console.log('[RuleForm] FixedValue - Using fieldPath:', initialRule.fieldPath);
          setFieldPath(initialRule.fieldPath);
        } else if (initialRule.path) {
          // LEGACY FORMAT: Extract from composed path
          const pathParts = initialRule.path.split('.');
          const fieldPath = pathParts.slice(1).join('.');
          console.log('[RuleForm] FixedValue - Extracted from path:', { fullPath: initialRule.path, fieldPath });
          setFieldPath(fieldPath);
        } else {
          console.log('[RuleForm] FixedValue - No path or fieldPath in initialRule');
        }
        
        // Extract params if available
        if (initialRule.params) {
          setExpectedValue(initialRule.params.value?.toString() || '');
        }
      }

      if (ruleType === 'AllowedValues') {
        // Extract field path - check new format first, then legacy
        if (initialRule.fieldPath) {
          // NEW FORMAT: Direct fieldPath property
          setFieldPath(initialRule.fieldPath);
        } else if (initialRule.path) {
          // LEGACY FORMAT: Extract from composed path
          const pathParts = initialRule.path.split('.');
          const fieldPath = pathParts.slice(1).join('.');
          setFieldPath(fieldPath);
        }
        
        // Extract params if available
        if (initialRule.params) {
          const values = Array.isArray(initialRule.params.values) 
            ? initialRule.params.values.map((v: any) => v.toString())
            : [];
          setAllowedValues(values);
        }
      }

      if (ruleType === 'ArrayLength') {
        // Extract field path - check new format first, then legacy
        if (initialRule.fieldPath) {
          // NEW FORMAT: Direct fieldPath property
          setFieldPath(initialRule.fieldPath);
        } else if (initialRule.path) {
          // LEGACY FORMAT: Extract from composed path
          const pathParts = initialRule.path.split('.');
          const arrayPath = pathParts.slice(1).join('.');
          setFieldPath(arrayPath);
        }
        
        // Extract params if available
        if (initialRule.params) {
          setMinLength(initialRule.params.min !== undefined ? Number(initialRule.params.min) : undefined);
          setMaxLength(initialRule.params.max !== undefined ? Number(initialRule.params.max) : undefined);
        }
      }

      if (ruleType === 'CustomFHIRPath' && initialRule) {
        const parsed = parseCustomFHIRPathRule(initialRule as Rule);
        setCustomExpression(parsed.expression);
      }

      if (ruleType === 'Resource' && initialRule) {
        const parsed = parseResourceRule(initialRule as Rule);
        setRequirements(parsed.requirements);
      }

      if (ruleType === 'Terminology' && initialRule) {
        const parsed = parseTerminologyRule(initialRule as Rule);
        setTerminologyParams(parsed);
        setIsTerminologyValid(true); // Assume valid if editing existing rule
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
    if (errorCodeMode === 'runtime-determined') return ''; // QuestionAnswer: runtime-determined only
    if (errorCodeMode === 'governed') return governedErrorCode;
    return '';
  })();

  // === VALIDATION & SAVE ===
  const handleSave = () => {
    console.log('[RuleForm:handleSave] Called', { 
      ruleType, 
      mode, 
      requiredParams,
      requiredParamsValid,
      fieldPath,
      resourceType,
      instanceScope
    });
    
    const newErrors: Record<string, string> = {};

    // Validate shared fields
    if (!resourceType) newErrors.resourceType = 'Resource type is required';

    // Validate rule-specific fields
    if (ruleType === 'Required') {
      console.log('[RuleForm:handleSave] Validating Required rule...');
      if (!requiredParams) {
        console.log('[RuleForm:handleSave] ERROR: requiredParams is null/undefined');
        newErrors.requiredParams = 'Please configure the required rule parameters';
      } else if (!requiredParamsValid) {
        console.log('[RuleForm:handleSave] ERROR: requiredParamsValid is false');
        newErrors.requiredParams = 'Please complete all required fields';
      } else {
        console.log('[RuleForm:handleSave] Required validation passed', { requiredParams });
      }
    }

    if (ruleType === 'Regex') {
      if (!fieldPath) newErrors.fieldPath = 'Please select a field';
      if (!pattern) newErrors.pattern = 'Pattern is required';
    }

    if (ruleType === 'QuestionAnswer') {
      if (!iterationScope) newErrors.iterationScope = 'Iteration scope is required';
      if (!questionPath) newErrors.questionPath = 'Question path is required';
      if (!questionSetId) newErrors.questionSetId = 'Please select a question set';
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
    }

    if (ruleType === 'Terminology') {
      if (!isTerminologyValid) {
        newErrors.terminology = 'Please complete all required terminology fields';
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
      console.log('[RuleForm:handleSave] Validation failed with errors:', newErrors);
      setErrors(newErrors);
      return;
    }

    console.log('[RuleForm:handleSave] Validation passed, building rule...');
    
    // Build rule based on type
    let rule: Rule;

    if (ruleType === 'Required') {
      console.log('[RuleForm:handleSave] Building Required rule...');
      if (!requiredParams) {
        throw new Error('Required params not set');
      }
      
      // Check if field mode or resource mode
      if ('path' in requiredParams) {
        console.log('[RuleForm:handleSave] Field mode - building with buildRequiredRule');
        // Field mode - use existing buildRequiredRule
        rule = buildRequiredRule({
          resourceType,
          instanceScope,
          fieldPath: requiredParams.path,
          severity,
          userHint: userHint || undefined,
        });
        console.log('[RuleForm:handleSave] Rule built:', rule);
      } else {
        // Resource mode - store resourceRequirement in params
        rule = {
          id: mode === 'edit' && initialRule?.id ? initialRule.id : `rule-${Date.now()}`,
          type: 'Required',
          resourceType,
          instanceScope,
          severity,
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
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'QuestionAnswer') {
      rule = buildQuestionAnswerRule({
        resourceType,
        instanceScope: instanceScope.kind === 'all' ? 'all' : 'first',
        iterationScope,
        questionPath,
        answerPath: 'value[x]',  // ALWAYS hardcoded - answer type comes from QuestionSet
        questionSetId,
        severity,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'FixedValue') {
      rule = buildFixedValueRule({
        resourceType,
        instanceScope,
        fieldPath,
        expectedValue,
        severity,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'AllowedValues') {
      rule = buildAllowedValuesRule({
        resourceType,
        instanceScope,
        fieldPath,
        allowedValues,
        severity,
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
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'CustomFHIRPath') {
      rule = buildCustomFHIRPathRule({
        resourceType,
        instanceScope,
        expression: customExpression,
        severity,
        userHint: userHint || undefined,
      });
    } else if (ruleType === 'Terminology') {
      rule = buildTerminologyRule({
        resourceType,
        fieldPath: terminologyParams.fieldPath,
        validationType: terminologyParams.validationType,
        codeSystemUrl: terminologyParams.codeSystemUrl,
        allowedCodes: terminologyParams.allowedCodes,
        system: terminologyParams.system,
        exactCode: terminologyParams.exactCode,
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
      console.log('[RuleForm:handleSave] ERROR: Rule type not implemented:', ruleType);
      return;
    }

    // If editing, preserve the original ID
    if (mode === 'edit' && initialRule?.id) {
      rule = { ...rule, id: initialRule.id };
    }

    console.log('[RuleForm:handleSave] Final rule built, calling onSave:', rule);
    onSave(rule);
    console.log('[RuleForm:handleSave] onSave completed');
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
        {ruleType !== 'Resource' && (
          <ResourceSelector
            value={resourceType}
            onChange={setResourceType}
            disabled={mode === 'edit'} // Lock resource type in edit mode
            projectBundle={projectBundle} // Pass bundle for availability check
          />
        )}

        {/* 2️⃣ SHARED: Rule Scope Selector (hidden for bundle-level rules) */}
        {ruleType !== 'Resource' && (
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
            questionSetId={questionSetId}
            onIterationScopeChange={(scope) => {
              setIterationScope(scope);
              setErrors({ ...errors, iterationScope: undefined });
            }}
            onQuestionPathChange={(path) => {
              setQuestionPath(path);
              setErrors({ ...errors, questionPath: undefined });
            }}
            onQuestionSetIdChange={(id) => {
              setQuestionSetId(id);
              setErrors({ ...errors, questionSetId: undefined });
            }}
            errors={{
              iterationScope: errors.iterationScope,
              questionPath: errors.questionPath,
              questionSetId: errors.questionSetId,
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
            onExpressionChange={(expr) => {
              setCustomExpression(expr);
              setErrors({ ...errors, expression: undefined });
            }}
            errors={{
              expression: errors.expression,
            }}
            resourceType={resourceType}
          />
        )}

        {ruleType === 'Terminology' && (
          <TerminologyConfigSection
            mode={mode}
            resourceType={resourceType}
            initialParams={mode === 'edit' ? terminologyParams : undefined}
            onParamsChange={(params, isValid) => {
              setTerminologyParams(params);
              setIsTerminologyValid(isValid);
            }}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            projectId={projectId}
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
