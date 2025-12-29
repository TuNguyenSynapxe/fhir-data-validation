import React from 'react';
import { HelpCircle } from 'lucide-react';
import { QuestionSetSelector } from './QuestionSetSelector';
import { RelativePathFields } from './RelativePathFields';
import { FhirPathPreview } from './FhirPathPreview';
import { QuestionAnswerConstraintSelector } from './QuestionAnswerConstraintSelector';
import type { QuestionAnswerConstraint } from './QuestionAnswerConstraint.types';

/**
 * QUESTION ANSWER CONFIG SECTION
 * 
 * Rule-specific configuration for QuestionAnswer rules.
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Iteration scope / parent path configuration
 * - Question set selection
 * - Question/Answer path configuration
 * - Constraint selection (REQUIRED, TYPE, RANGE, VALUESET)
 * - Runtime error code info panel
 * 
 * The parent RuleForm handles: resource, scope (instance), severity, userHint, preview, save/cancel.
 * 
 * NOTE: errorCode is OMITTED from config - QuestionAnswer uses runtime-determined errorCode.
 */

interface QuestionAnswerConfigSectionProps {
  projectId: string;
  resourceType: string;
  iterationScope: string;
  questionPath: string;
  answerPath: string;
  questionSetId: string;
  constraint: QuestionAnswerConstraint | '';
  onIterationScopeChange: (scope: string) => void;
  onQuestionPathChange: (path: string) => void;
  onAnswerPathChange: (path: string) => void;
  onQuestionSetIdChange: (id: string) => void;
  onConstraintChange: (constraint: QuestionAnswerConstraint) => void;
  errors?: {
    iterationScope?: string;
    questionPath?: string;
    answerPath?: string;
    questionSetId?: string;
    constraint?: string;
  };
  projectBundle?: object;
  questionSets?: any[];
}

export const QuestionAnswerConfigSection: React.FC<QuestionAnswerConfigSectionProps> = ({
  projectId,
  resourceType,
  iterationScope,
  questionPath,
  answerPath,
  questionSetId,
  constraint,
  onIterationScopeChange,
  onQuestionPathChange,
  onAnswerPathChange,
  onQuestionSetIdChange,
  onConstraintChange,
  errors = {},
  projectBundle,
  questionSets,
}) => {
  return (
    <div className="space-y-6">
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

      {/* Question & Answer Paths */}
      <RelativePathFields
        questionPath={questionPath}
        answerPath={answerPath}
        onQuestionPathChange={onQuestionPathChange}
        onAnswerPathChange={onAnswerPathChange}
        errors={{
          questionPath: errors.questionPath,
          answerPath: errors.answerPath,
        }}
        iterationScope={iterationScope}
      />

      {/* Resolved Path Preview */}
      {iterationScope && (questionPath || answerPath) && (
        <FhirPathPreview
          iterationScope={iterationScope}
          questionPath={questionPath}
          answerPath={answerPath}
        />
      )}

      {/* Constraint Selector */}
      <QuestionAnswerConstraintSelector
        value={constraint}
        onChange={onConstraintChange}
        error={errors.constraint}
      />

      {/* Runtime Error Code Info (Contract v1) */}
      {constraint && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Runtime Error Code (Automatic)
          </div>
          <div className="space-y-1 text-blue-800">
            <div>
              The error code is determined automatically at runtime based on the validation outcome. Possible error codes:
            </div>
            <ul className="list-disc ml-4 mt-2 space-y-0.5">
              <li><code className="bg-white px-1 py-0.5 rounded text-xs">ANSWER_REQUIRED</code> — Required answer missing</li>
              <li><code className="bg-white px-1 py-0.5 rounded text-xs">INVALID_ANSWER_VALUE</code> — Answer type/format mismatch</li>
              <li><code className="bg-white px-1 py-0.5 rounded text-xs">ANSWER_OUT_OF_RANGE</code> — Numeric value outside range</li>
              <li><code className="bg-white px-1 py-0.5 rounded text-xs">ANSWER_NOT_IN_VALUESET</code> — Code not in allowed ValueSet</li>
              <li><code className="bg-white px-1 py-0.5 rounded text-xs">QUESTION_NOT_FOUND</code> — Question not in QuestionSet</li>
              <li><code className="bg-white px-1 py-0.5 rounded text-xs">QUESTIONSET_DATA_MISSING</code> — QuestionSet data unavailable</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
