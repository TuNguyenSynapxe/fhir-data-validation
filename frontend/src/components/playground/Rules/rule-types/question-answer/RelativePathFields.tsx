import React, { useEffect, useState } from 'react';
import { HelpCircle, Code } from 'lucide-react';
import { validateRelativePath } from './QuestionAnswerRuleHelpers';
import { QuestionFieldBuilder } from './QuestionFieldBuilder';

interface RelativePathFieldsProps {
  questionPath: string;
  onQuestionPathChange: (path: string) => void;
  errors?: {
    questionPath?: string;
  };
  iterationScope?: string; // Used for the relative scope badge
}

/**
 * UI-ONLY REFACTOR
 * Provides both assisted and advanced modes for editing question/answer paths.
 * Backend contracts, validation logic, and rule schemas remain unchanged.
 */
export const RelativePathFields: React.FC<RelativePathFieldsProps> = ({
  questionPath,
  onQuestionPathChange,
  errors = {},
  iterationScope,
}) => {
  // UI-ONLY: Mode toggle state
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  
  const [questionPathError, setQuestionPathError] = useState<string | null>(null);

  // Validate question path on change
  useEffect(() => {
    if (questionPath) {
      const validationError = validateRelativePath(questionPath);
      setQuestionPathError(validationError);
    } else {
      setQuestionPathError(null);
    }
  }, [questionPath]);

  // UI-ONLY: Auto-switch to advanced mode if path looks custom
  useEffect(() => {
    const standardPaths = [
      'code.coding',
      'code.coding[0]',
      'identifier',
      'linkId',
    ];

    const isQuestionStandard = !questionPath || standardPaths.some(p => 
      questionPath.toLowerCase() === p.toLowerCase()
    );

    // If path is non-standard and we're not already in advanced mode, switch
    if (!isQuestionStandard && !isAdvancedMode) {
      setIsAdvancedMode(true);
    }
  }, [questionPath, isAdvancedMode]);

  const displayQuestionError = errors.questionPath || questionPathError;

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {isAdvancedMode ? 'Advanced Mode' : 'Assisted Mode'}
          </span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-600">Edit as FHIRPath</span>
          <input
            type="checkbox"
            checked={isAdvancedMode}
            onChange={(e) => setIsAdvancedMode(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>

      {/* Relative Scope Badge */}
      {iterationScope && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
          <span className="text-xs font-medium text-blue-900">
            Relative to:
          </span>
          <code className="text-xs font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-300">
            {iterationScope}
          </code>
          <div className="group relative">
            <HelpCircle className="w-3 h-3 text-blue-600 cursor-help" />
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
              Paths below are evaluated relative to each repeated element
            </div>
          </div>
        </div>
      )}

      {/* Question Path */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Field <span className="text-red-500">*</span>
        </label>
        <QuestionFieldBuilder
          value={questionPath}
          onChange={onQuestionPathChange}
          isAdvancedMode={isAdvancedMode}
          error={displayQuestionError || undefined}
        />
        {!isAdvancedMode && (
          <p className="text-xs text-gray-500 mt-2">
            Path to the field containing the question identifier
          </p>
        )}
        {isAdvancedMode && (
          <>
            <p className="text-xs text-gray-500 mt-2">
              Path to the field containing the question identifier (relative to iteration scope)
            </p>
            <div className="mt-1 text-xs text-gray-500">
              Examples: <code className="bg-gray-100 px-1 rounded">code.coding</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">linkId</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">code.coding[0].code</code>
            </div>
          </>
        )}
      </div>

      {/* Answer Path (Read-Only) */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Answer Path (Auto-Resolved)
        </label>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md">
          <code className="text-sm font-mono text-gray-700">value[x]</code>
          <span className="text-xs text-gray-500">(relative to iteration scope)</span>
        </div>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
          <strong>Answer type, allowed values, and constraints are defined in the selected Question Set.</strong>
          <br />
          This rule only links questions in FHIR data to Question Set definitions.
        </div>
      </div>
    </div>
  );
};
