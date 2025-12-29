import React from 'react';
import { HelpCircle, Info } from 'lucide-react';
import { QuestionSetSelector } from './QuestionSetSelector';
import { RelativePathFields } from './RelativePathFields';
import { FhirPathPreview } from './FhirPathPreview';

/**
 * QUESTION ANSWER CONFIG SECTION
 * 
 * Rule-specific configuration for QuestionAnswer rules.
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * CONTRACT v2 (Contract-Safe):
 * - QuestionSet is the single source of truth for constraints
 * - Rule stores ONLY: questionSetId, questionPath, answerPath
 * - NO answer type selection (inferred from QuestionSet)
 * - NO constraint selection (defined in QuestionSet)
 * - errorCode is runtime-determined (not configured)
 * 
 * The parent RuleForm handles: resource, scope (instance), severity, userHint, preview, save/cancel.
 */

interface QuestionAnswerConfigSectionProps {
  projectId: string;
  resourceType: string;
  iterationScope: string;
  questionPath: string;
  questionSetId: string;
  onIterationScopeChange: (scope: string) => void;
  onQuestionPathChange: (path: string) => void;
  onQuestionSetIdChange: (id: string) => void;
  errors?: {
    iterationScope?: string;
    questionPath?: string;
    questionSetId?: string;
  };
  projectBundle?: object;
  questionSets?: any[];
}

export const QuestionAnswerConfigSection: React.FC<QuestionAnswerConfigSectionProps> = ({
  projectId,
  resourceType,
  iterationScope,
  questionPath,
  questionSetId,
  onIterationScopeChange,
  onQuestionPathChange,
  onQuestionSetIdChange,
  errors = {},
  projectBundle,
  questionSets,
}) => {
  return (
    <div className="space-y-6">
      {/* How Question & Answer Mapping Works */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-blue-900 mb-2">
              How Question & Answer Mapping Works
            </div>
            <div className="text-xs text-blue-800 space-y-2">
              <div>
                <strong>This rule links FHIR data to questions defined in a Question Set.</strong>
              </div>
              
              <div>
                <div className="font-semibold mb-1">Question identification</div>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Questions are matched using Coding, Identifier, or LinkId</li>
                  <li>The system finds the matching question inside the selected Question Set</li>
                </ul>
              </div>
              
              <div>
                <div className="font-semibold mb-1">Answer validation</div>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Allowed answers, data type, and constraints come from the Question Set</li>
                  <li>This rule does NOT define answer rules</li>
                </ul>
              </div>
              
              <div>
                <div className="font-semibold mb-1">Runtime behavior</div>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>If a question is not found → validation fails</li>
                  <li>If an answer does not match the Question Set → validation fails</li>
                  <li>Error codes are assigned automatically at runtime</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Iteration Scope (Parent Path) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parent Iteration Path <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={iterationScope}
          onChange={(e) => onIterationScopeChange(e.target.value)}
          placeholder="e.g., Observation.component"
          className={`
            w-full px-3 py-2 border rounded-md font-mono text-sm
            ${errors.iterationScope ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
        />
        {errors.iterationScope && (
          <p className="mt-1 text-sm text-red-600">{errors.iterationScope}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The collection path containing question-answer pairs
        </p>
      </div>

      {/* Question Set Selector */}
      <QuestionSetSelector
        projectId={projectId}
        value={questionSetId}
        onChange={onQuestionSetIdChange}
        error={errors.questionSetId}
      />

      {/* Question Path */}
      <RelativePathFields
        questionPath={questionPath}
        onQuestionPathChange={onQuestionPathChange}
        errors={{
          questionPath: errors.questionPath,
        }}
        iterationScope={iterationScope}
      />

      {/* Resolved Path Preview */}
      {iterationScope && questionPath && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Resolved Paths
          </div>
          <div className="space-y-1 font-mono text-xs text-gray-600">
            <div>
              <span className="text-gray-500">Question Path:</span>{' '}
              <span className="text-blue-600">{iterationScope}.{questionPath}</span>
            </div>
            <div>
              <span className="text-gray-500">Answer Path:</span>{' '}
              <span className="text-blue-600">{iterationScope}.value[x]</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 italic">
            Answer type is resolved from the Question Set at runtime
          </div>
        </div>
      )}
    </div>
  );
};
