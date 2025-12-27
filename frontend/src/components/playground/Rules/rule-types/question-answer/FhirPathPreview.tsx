import React from 'react';
import { Eye } from 'lucide-react';

interface FhirPathPreviewProps {
  iterationScope: string;
  questionPath: string;
  answerPath: string;
}

/**
 * UI-ONLY COMPONENT
 * Shows a read-only preview of how the relative paths will be resolved.
 * Does NOT perform any validation or affect backend behavior.
 */
export const FhirPathPreview: React.FC<FhirPathPreviewProps> = ({
  iterationScope,
  questionPath,
  answerPath,
}) => {
  // UI-ONLY: Construct preview paths
  const resolvedQuestionPath = iterationScope && questionPath 
    ? `${iterationScope}.${questionPath}`
    : questionPath || '(not set)';

  const resolvedAnswerPath = iterationScope && answerPath
    ? `${iterationScope}.${answerPath}`
    : answerPath || '(not set)';

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-blue-900">
          Resolved Path Preview
        </h4>
      </div>
      
      <div className="space-y-2">
        <div>
          <div className="text-xs font-medium text-blue-700 mb-0.5">
            Question Path:
          </div>
          <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-900 break-all block">
            {resolvedQuestionPath}
          </code>
        </div>

        <div>
          <div className="text-xs font-medium text-blue-700 mb-0.5">
            Answer Path:
          </div>
          <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-900 break-all block">
            {resolvedAnswerPath}
          </code>
        </div>
      </div>

      <p className="text-xs text-blue-700 mt-3 italic">
        These paths are evaluated at runtime for each iterated element
      </p>
    </div>
  );
};
