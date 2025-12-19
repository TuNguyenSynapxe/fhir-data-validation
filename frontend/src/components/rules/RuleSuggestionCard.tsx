import React from 'react';
import type { RuleSuggestion, ConfidenceLevel } from '../../types/ruleTemplate';

/**
 * RuleSuggestionCard - Individual suggestion card with preview and apply
 * 
 * BEHAVIOR:
 * - Shows template name and confidence
 * - Explains reasoning
 * - Previews generated rule
 * - Provides "Apply" button (manual acceptance)
 * - Never auto-applies
 */
interface RuleSuggestionCardProps {
  suggestion: RuleSuggestion;
  onApply: (suggestion: RuleSuggestion) => void;
  onDismiss?: (suggestion: RuleSuggestion) => void;
}

const RuleSuggestionCard: React.FC<RuleSuggestionCardProps> = ({
  suggestion,
  onApply,
  onDismiss,
}) => {
  const confidenceColors: Record<ConfidenceLevel, { bg: string; text: string; border: string }> = {
    high: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    },
    medium: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    low: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
    },
  };

  const colors = confidenceColors[suggestion.confidence];

  return (
    <div className={`border ${colors.border} rounded-lg p-4 ${colors.bg}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900">
              {suggestion.templateName}
            </h4>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.text} ${colors.bg} border ${colors.border}`}>
              {suggestion.confidence}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {suggestion.reason}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(suggestion)}
            className="text-gray-400 hover:text-gray-600 ml-2"
            aria-label="Dismiss suggestion"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="mt-3 p-2 bg-white border border-gray-200 rounded text-xs">
        <div className="font-semibold text-gray-700 mb-1">Preview:</div>
        <div className="font-mono text-gray-900 space-y-1">
          <div>
            <span className="text-gray-500">FHIRPath:</span>{' '}
            <span className="text-blue-600">{suggestion.preview.fhirPath}</span>
          </div>
          <div>
            <span className="text-gray-500">Operator:</span>{' '}
            <span className="text-purple-600">{suggestion.preview.operator}</span>
          </div>
          {suggestion.preview.value !== undefined && (
            <div>
              <span className="text-gray-500">Value:</span>{' '}
              <span className="text-green-600">{JSON.stringify(suggestion.preview.value)}</span>
            </div>
          )}
          {suggestion.preview.message && (
            <div>
              <span className="text-gray-500">Message:</span>{' '}
              <span className="text-gray-700">{suggestion.preview.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => onApply(suggestion)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          Apply Suggestion
        </button>
      </div>
    </div>
  );
};

export default RuleSuggestionCard;
