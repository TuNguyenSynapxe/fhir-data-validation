import React, { useEffect, useState } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { validateRelativePath } from './QuestionAnswerRuleHelpers';

interface RelativePathFieldsProps {
  questionPath: string;
  answerPath: string;
  onQuestionPathChange: (path: string) => void;
  onAnswerPathChange: (path: string) => void;
  errors?: {
    questionPath?: string;
    answerPath?: string;
  };
}

export const RelativePathFields: React.FC<RelativePathFieldsProps> = ({
  questionPath,
  answerPath,
  onQuestionPathChange,
  onAnswerPathChange,
  errors = {},
}) => {
  const [questionPathError, setQuestionPathError] = useState<string | null>(null);
  const [answerPathError, setAnswerPathError] = useState<string | null>(null);

  // Validate question path on change
  useEffect(() => {
    if (questionPath) {
      const validationError = validateRelativePath(questionPath);
      setQuestionPathError(validationError);
    } else {
      setQuestionPathError(null);
    }
  }, [questionPath]);

  // Validate answer path on change
  useEffect(() => {
    if (answerPath) {
      const validationError = validateRelativePath(answerPath);
      setAnswerPathError(validationError);
    } else {
      setAnswerPathError(null);
    }
  }, [answerPath]);

  const displayQuestionError = errors.questionPath || questionPathError;
  const displayAnswerError = errors.answerPath || answerPathError;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">Relative paths required</p>
            <p>
              These paths are evaluated <strong>relative to each iterated element</strong>.
              Do not include the resource type or absolute paths.
            </p>
          </div>
        </div>
      </div>

      {/* Question Path */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Field (relative) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={questionPath}
          onChange={(e) => onQuestionPathChange(e.target.value)}
          placeholder="e.g., code.coding"
          className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            displayQuestionError ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
        {displayQuestionError && (
          <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
            <AlertCircle size={12} />
            <span>{displayQuestionError}</span>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Path to the field containing the question identifier (relative to iteration scope)
        </p>
        <div className="mt-1 text-xs text-gray-500">
          Examples: <code className="bg-gray-100 px-1 rounded">code.coding</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">linkId</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">code.coding[0].code</code>
        </div>
      </div>

      {/* Answer Path */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Answer Field (relative) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={answerPath}
          onChange={(e) => onAnswerPathChange(e.target.value)}
          placeholder="e.g., value[x]"
          className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            displayAnswerError ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
        {displayAnswerError && (
          <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
            <AlertCircle size={12} />
            <span>{displayAnswerError}</span>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Path to the field containing the answer value (relative to iteration scope)
        </p>
        <div className="mt-1 text-xs text-gray-500">
          Examples: <code className="bg-gray-100 px-1 rounded">value[x]</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">answer[0].value[x]</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">valueCodeableConcept</code>
        </div>
      </div>
    </div>
  );
};
