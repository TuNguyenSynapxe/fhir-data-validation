import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Check, AlertCircle } from 'lucide-react';
import { ErrorCodeSelector, UserHintInput, RuleErrorPreview } from '../../common';
import { QuestionSetSelector } from './QuestionSetSelector';
import { RelativePathFields } from './RelativePathFields';
import { FhirPathPreview } from './FhirPathPreview';
import { InstanceScopeDrawer } from '../../common/InstanceScopeDrawer';
import type { InstanceScope } from '../../common/InstanceScope.types';
import { getInstanceScopeSummary } from '../../common/InstanceScope.utils';
import {
  buildQuestionAnswerRule,
  deriveQuestionPath,
  deriveAnswerPath,
  getDefaultIterationScope,
  validatePathAlignment,
  QA_RESOURCE_TYPES,
  SEVERITY_LEVELS,
} from './QuestionAnswerRuleHelpers';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  errorCode: string;           // PHASE 3: errorCode is now primary
  userHint?: string;            // PHASE 3: optional short hint
  message?: string;             // DEPRECATED: backward compat only
  params?: Record<string, any>;
  origin?: string;
  enabled?: boolean;
  isMessageCustomized?: boolean;
  questionPath?: string;
  answerPath?: string;
}

interface QuestionAnswerRuleFormProps {
  projectId: string;
  onCancel: () => void;
  onSave: (rule: Rule) => void;
  projectBundle?: object;
  initialResourceType?: string;
}

export const QuestionAnswerRuleForm: React.FC<QuestionAnswerRuleFormProps> = ({
  projectId,
  onCancel,
  onSave,
  projectBundle,
  initialResourceType = 'Observation',
}) => {
  const [resourceType, setResourceType] = useState<string>(initialResourceType);
  // Instance scope uses structured drawer-based selection (RULE: Instance Scope must ALWAYS open in a drawer)
  const [instanceScope, setInstanceScope] = useState<InstanceScope>({ kind: 'all' });
  const [iterationScope, setIterationScope] = useState<string>('');
  const [questionPath, setQuestionPath] = useState<string>('');
  const [answerPath, setAnswerPath] = useState<string>('');
  const [questionSetId, setQuestionSetId] = useState<string>('');
  const [severity, setSeverity] = useState<'error' | 'warning' | 'information'>('error');
  // PHASE 3: Replace customMessage with errorCode + userHint
  const [errorCode, setErrorCode] = useState<string>('');
  const [userHint, setUserHint] = useState<string>('');
  const [isScopeDrawerOpen, setIsScopeDrawerOpen] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false); // Advanced path editing toggle
  const [errors, setErrors] = useState<{
    questionSetId?: string;
    iterationScope?: string;
    questionPath?: string;
    answerPath?: string;
    errorCode?: string;
  }>({});

  // Initialize defaults when resource type changes
  useEffect(() => {
    setInstanceScope({ kind: 'all' });
    const defaultIteration = getDefaultIterationScope(resourceType);
    setIterationScope(defaultIteration);
    // Auto-derive paths from iteration scope
    setQuestionPath(deriveQuestionPath(resourceType, defaultIteration));
    setAnswerPath(deriveAnswerPath(resourceType, defaultIteration));
  }, [resourceType]);

  // Auto-update derived paths when iteration scope changes (only in non-advanced mode)
  useEffect(() => {
    if (!isAdvancedMode && iterationScope) {
      setQuestionPath(deriveQuestionPath(resourceType, iterationScope));
      setAnswerPath(deriveAnswerPath(resourceType, iterationScope));
    }
  }, [iterationScope, resourceType, isAdvancedMode]);

  const handleSelectScope = () => {
    setIsScopeDrawerOpen(true);
  };

  const handleScopeChange = (scope: InstanceScope) => {
    setInstanceScope(scope);
  };

  const handleSave = () => {
    // PHASE 3: Validate required fields (errorCode is now mandatory)
    const newErrors: typeof errors = {};

    if (!questionSetId) {
      newErrors.questionSetId = 'Please select a question set';
    }

    if (!iterationScope) {
      newErrors.iterationScope = 'Iteration scope is required';
    }

    if (!questionPath) {
      newErrors.questionPath = 'Question path is required';
    }

    if (!answerPath) {
      newErrors.answerPath = 'Answer path is required';
    }

    if (!errorCode || errorCode.trim() === '') {
      newErrors.errorCode = 'Error code is required';
    }

    // Validate path alignment (non-blocking warning shown inline)
    const alignmentWarning = validatePathAlignment(iterationScope, questionPath, answerPath);
    if (alignmentWarning) {
      // Don't block save, but warning is shown inline
      console.warn('Path alignment warning:', alignmentWarning);
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // PHASE 3: Build rule with errorCode + userHint (NO message)
    const rule = buildQuestionAnswerRule({
      resourceType,
      instanceScope: instanceScope.kind === 'all' ? 'all' : 'first',
      iterationScope,
      questionPath,
      answerPath,
      questionSetId,
      severity,
      errorCode,
      userHint: userHint || undefined,
    });

    // Save and close
    onSave(rule);
  };

  const pathAlignmentWarning = validatePathAlignment(iterationScope, questionPath, answerPath);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Create Question & Answer Rule
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Validate answers against allowed values defined in a question set
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
        {/* Conceptual Model Hint */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-blue-900">
                How Question & Answer Rules Work
              </div>
              <div className="text-xs text-blue-800 mt-1 space-y-1">
                <div>• <strong>QuestionSet</strong>: Declares what questions exist and what answers are valid</div>
                <div>• <strong>Rule</strong>: Defines where and how validation runs (can reuse QuestionSets)</div>
                <div>• <strong>Paths</strong>: Auto-derived from iteration scope, can be overridden if needed</div>
              </div>
            </div>
          </div>
        </div>

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
            {QA_RESOURCE_TYPES.map((type) => (
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
                <div className="text-sm font-medium text-gray-900 break-words">{getInstanceScopeSummary(resourceType, instanceScope).text}</div>
                <div className="text-xs font-mono text-gray-500 mt-0.5 break-all">{getInstanceScopeSummary(resourceType, instanceScope).fhirPath}</div>
              </div>
              <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            </div>
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Click to change which {resourceType} instances this rule applies to
          </p>
        </div>

        {/* Parent Iteration Path */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-gray-700">
              Parent Iteration Path <span className="text-red-500">*</span>
            </label>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                Specifies which repeating elements contain question-answer pairs. Question and answer paths are evaluated relative to this.
              </div>
            </div>
          </div>
          <input
            type="text"
            value={iterationScope}
            onChange={(e) => {
              setIterationScope(e.target.value);
              setErrors({ ...errors, iterationScope: undefined });
            }}
            placeholder="component[*]"
            className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.iterationScope ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.iterationScope && (
            <div className="text-xs text-red-600 mt-1">{errors.iterationScope}</div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Examples: <code className="bg-gray-100 px-1 rounded">component[*]</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">item[*]</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">entry[*]</code>
          </p>
        </div>

        {/* Question Set Selector */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-gray-700">
              Question Set <span className="text-red-500">*</span>
            </label>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                Defines what questions exist and what answers are valid. Same QuestionSet can be reused by multiple rules with different traversal logic.
              </div>
            </div>
          </div>
          <QuestionSetSelector
            projectId={projectId}
            value={questionSetId}
            onChange={(value) => {
              setQuestionSetId(value);
              setErrors({ ...errors, questionSetId: undefined });
            }}
            error={errors.questionSetId}
          />
        </div>

        {/* Derived Paths (read-only preview) */}
        {!isAdvancedMode && iterationScope && (questionPath || answerPath) && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">
                Derived Paths (auto-generated)
              </div>
              <button
                onClick={() => setIsAdvancedMode(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit Manually ▸
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-600 mb-1">Question Path:</div>
                <code className="text-xs font-mono text-gray-900 bg-white px-2 py-1 rounded border border-gray-300 block">
                  {questionPath}
                </code>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Answer Path:</div>
                <code className="text-xs font-mono text-gray-900 bg-white px-2 py-1 rounded border border-gray-300 block">
                  {answerPath}
                </code>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <div>
                  Paths are evaluated relative to each <code className="bg-white px-1 rounded border border-gray-300">{iterationScope}</code> element
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Path Editing */}
        {isAdvancedMode && (
          <div className="border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-700">
                  Advanced Path Editing
                </div>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    <strong>Warning:</strong> Paths must align with backend traversal. No implicit resolution is applied. Incorrect paths will cause validation to be skipped.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdvancedMode(false);
                  // Re-derive paths when switching back
                  setQuestionPath(deriveQuestionPath(resourceType, iterationScope));
                  setAnswerPath(deriveAnswerPath(resourceType, iterationScope));
                }}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                ▾ Use Auto-Derived Paths
              </button>
            </div>
            
            {pathAlignmentWarning && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    {pathAlignmentWarning}
                  </div>
                </div>
              </div>
            )}
            
            <RelativePathFields
              questionPath={questionPath}
              answerPath={answerPath}
              onQuestionPathChange={(value) => {
                setQuestionPath(value);
                setErrors({ ...errors, questionPath: undefined });
              }}
              onAnswerPathChange={(value) => {
                setAnswerPath(value);
                setErrors({ ...errors, answerPath: undefined });
              }}
              errors={errors}
              iterationScope={iterationScope}
            />
          </div>
        )}

        {/* Resolved Path Preview (always show) */}
        {iterationScope && (questionPath || answerPath) && (
          <FhirPathPreview
            iterationScope={iterationScope}
            questionPath={questionPath}
            answerPath={answerPath}
          />
        )}

        {/* Remove old Iteration Scope field - moved to Parent Iteration Path above */}
        {/* Remove old Question & Answer Paths - now in Derived Paths or Advanced section */}

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

        {/* PHASE 3: ErrorCode Selector (REQUIRED) */}
        <ErrorCodeSelector
          ruleType="QuestionAnswer"
          value={errorCode}
          onChange={setErrorCode}
          required
        />
        {errors.errorCode && (
          <div className="flex items-center gap-1 -mt-4 text-xs text-red-600">
            <AlertCircle size={12} />
            <span>{errors.errorCode}</span>
          </div>
        )}

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
          path={iterationScope || 'component'}
          details={{
            question: { system: '<system>', code: '<code>' },
            expected: { answerType: 'string' },
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
          disabled={!questionSetId || !iterationScope || !questionPath || !answerPath || !errorCode}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Rule
        </button>
      </div>

      {/* DRAWER: Instance Scope Selection */}
      <InstanceScopeDrawer
        isOpen={isScopeDrawerOpen}
        resourceType={resourceType}
        bundle={projectBundle || {}}
        value={instanceScope}
        onChange={handleScopeChange}
        onClose={() => setIsScopeDrawerOpen(false)}
      />
    </div>
  );
};
