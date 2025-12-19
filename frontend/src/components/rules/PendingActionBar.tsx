import React from 'react';
import { CheckSquare, Eye, X } from 'lucide-react';

/**
 * PendingActionBar - Sticky action bar for pending rule intents
 * 
 * Requirements:
 * - Show only when intents.length > 0
 * - Sticky positioning (stays visible during scroll)
 * - Three actions: Preview, Apply, Clear
 * - Show count of pending intents
 * 
 * UX:
 * - Fixed at bottom or top (choose based on layout)
 * - Prominent but not blocking
 * - Clear visual hierarchy (Apply = primary)
 */
interface PendingActionBarProps {
  count: number;
  onPreview: () => void;
  onApply: () => void;
  onClear: () => void;
  isApplying?: boolean;
  hasValidationErrors?: boolean;
  validationErrors?: string[];
}

const PendingActionBar: React.FC<PendingActionBarProps> = ({
  count,
  onPreview,
  onApply,
  onClear,
  isApplying = false,
  hasValidationErrors = false,
  validationErrors = [],
}) => {
  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`bg-white border-2 rounded-lg shadow-lg px-6 py-4 ${
        hasValidationErrors ? 'border-red-500' : 'border-blue-500'
      }`}>
        {/* Validation Errors */}
        {hasValidationErrors && validationErrors.length > 0 && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <div className="font-semibold mb-1">Cannot Apply - Validation Errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-4">
        {/* Count Badge */}
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">
            {count} pending rule{count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Preview Button */}
          <button
            onClick={onPreview}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            disabled={isApplying}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>

          {/* Apply Button (Primary) */}
          <button
            onClick={onApply}
            disabled={isApplying || hasValidationErrors}
            className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors shadow-sm"
            title={hasValidationErrors ? 'Fix validation errors before applying' : ''}
          >
            <CheckSquare className="w-4 h-4" />
            {isApplying ? 'Applying...' : 'Apply Rules'}
          </button>

          {/* Clear Button */}
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            disabled={isApplying}
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default PendingActionBar;
