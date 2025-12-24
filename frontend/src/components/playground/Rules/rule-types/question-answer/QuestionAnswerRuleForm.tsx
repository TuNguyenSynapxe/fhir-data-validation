import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Check } from 'lucide-react';
import { MessageEditor } from '../../../MessageEditor';
import { QuestionSetSelector } from './QuestionSetSelector';
import { RelativePathFields } from './RelativePathFields';
import { InstanceScopeDrawer } from '../../common/InstanceScopeDrawer';
import type { InstanceScope } from '../../common/InstanceScope.types';
import { getInstanceScopeSummary } from '../../common/InstanceScope.utils';
import {
  buildQuestionAnswerRule,
  getDefaultQuestionPath,
  getDefaultAnswerPath,
  getDefaultIterationScope,
  getDefaultErrorMessage,
  QA_RESOURCE_TYPES,
  SEVERITY_LEVELS,
} from './QuestionAnswerRuleHelpers';

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
  questionPath?: string;
  answerPath?: string;
}

interface QuestionAnswerRuleFormProps {
  projectId: string;
  onCancel: () => void;
  onSave: (rule: Rule) => void;
  projectBundle?: object;
  hl7Samples?: any[];
  initialResourceType?: string;
}

export const QuestionAnswerRuleForm: React.FC<QuestionAnswerRuleFormProps> = ({
  projectId,
  onCancel,
  onSave,
  projectBundle,
  hl7Samples,
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
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isScopeDrawerOpen, setIsScopeDrawerOpen] = useState(false);
  const [errors, setErrors] = useState<{
    questionSetId?: string;
    iterationScope?: string;
    questionPath?: string;
    answerPath?: string;
  }>({});

  // Initialize defaults when resource type changes
  useEffect(() => {
    setInstanceScope({ kind: 'all' });
    setIterationScope(getDefaultIterationScope(resourceType));
    setQuestionPath(getDefaultQuestionPath(resourceType));
    setAnswerPath(getDefaultAnswerPath(resourceType));
  }, [resourceType]);

  const handleSelectScope = () => {
    setIsScopeDrawerOpen(true);
  };

  const handleScopeChange = (scope: InstanceScope) => {
    setInstanceScope(scope);
  };

  const handleSave = () => {
    // Validate required fields
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build rule
    const rule = buildQuestionAnswerRule({
      resourceType,
      instanceScope,
      iterationScope,
      questionPath,
      answerPath,
      questionSetId,
      severity,
      message: customMessage,
    });

    // Save and close
    onSave(rule);
  };

  const displayMessage = customMessage || getDefaultErrorMessage();

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
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Question Set Selector */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-gray-700">
              Question Set <span className="text-red-500">*</span>
            </label>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                Defines what questions and allowed answers apply
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

        {/* Iteration Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Iteration Scope <span className="text-red-500">*</span>
          </label>
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
            Iterates over elements that contain question–answer pairs (relative to resource)
          </p>
          <div className="mt-1 text-xs text-gray-500">
            Examples: <code className="bg-gray-100 px-1 rounded">component[*]</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">item[*]</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">entry[*]</code>
          </div>
        </div>

        {/* Question & Answer Paths */}
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
        />

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
              path: iterationScope,
              ruleType: 'QuestionAnswer',
              severity,
            }}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use default: "{getDefaultErrorMessage()}"
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
          disabled={!questionSetId || !iterationScope || !questionPath || !answerPath}
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
