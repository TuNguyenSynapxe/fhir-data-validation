import React, { useState, useEffect, useMemo } from 'react';
import RuleSuggestionCard from './RuleSuggestionCard';
import { suggestRules } from '../utils/ruleSuggestionEngine';
import type { RuleSuggestion, RuleSuggestionContext } from '../types/ruleTemplate';

/**
 * RuleSuggestionPanel - Display and manage rule suggestions
 * 
 * BEHAVIOR:
 * - Analyzes bundle/sample on demand
 * - Shows suggestions grouped by confidence
 * - User must explicitly apply suggestions
 * - Can dismiss suggestions
 * - No auto-creation
 * - No persistence
 * 
 * CONSTRAINTS:
 * - Read-only context
 * - No bundle mutation
 * - No API calls
 * - Deterministic analysis only
 */
interface RuleSuggestionPanelProps {
  resourceType: string;
  projectBundle?: any;
  selectedSample?: any;
  existingRules?: any[];
  onApplySuggestion: (suggestion: RuleSuggestion) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

const RuleSuggestionPanel: React.FC<RuleSuggestionPanelProps> = ({
  resourceType,
  projectBundle,
  selectedSample,
  existingRules = [],
  onApplySuggestion,
  isOpen = false,
  onToggle,
}) => {
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Generate suggestions
  const suggestions = useMemo(() => {
    if (!isOpen) return [];

    const context: RuleSuggestionContext = {
      resourceType,
      projectBundle,
      selectedSample,
      existingRules,
    };

    const allSuggestions = suggestRules(context);
    
    // Filter out dismissed suggestions
    return allSuggestions.filter(s => !dismissedSuggestions.has(s.id));
  }, [resourceType, projectBundle, selectedSample, existingRules, dismissedSuggestions, isOpen]);

  const handleDismiss = (suggestion: RuleSuggestion) => {
    setDismissedSuggestions(prev => new Set(prev).add(suggestion.id));
  };

  const handleApply = (suggestion: RuleSuggestion) => {
    onApplySuggestion(suggestion);
    // Optionally auto-dismiss after applying
    handleDismiss(suggestion);
  };

  // Reset dismissed when context changes significantly
  useEffect(() => {
    setDismissedSuggestions(new Set());
  }, [resourceType]);

  if (!isOpen) {
    return (
      <div className="mb-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Show Rule Suggestions
        </button>
      </div>
    );
  }

  // Group suggestions by confidence
  const highConfidence = suggestions.filter(s => s.confidence === 'high');
  const mediumConfidence = suggestions.filter(s => s.confidence === 'medium');
  const lowConfidence = suggestions.filter(s => s.confidence === 'low');

  return (
    <div className="mb-6 border border-gray-300 rounded-lg p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">
            Rule Suggestions
          </h3>
          {suggestions.length > 0 && (
            <span className="text-sm text-gray-500">
              ({suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Hide suggestions"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Info Banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-900">
          <strong>Deterministic Analysis:</strong> Suggestions are based on patterns found in your bundle/sample data. 
          Review each suggestion carefully before applying.
        </p>
      </div>

      {/* Empty State */}
      {suggestions.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">
            No suggestions available. Try loading a bundle or sample with {resourceType} resources.
          </p>
        </div>
      )}

      {/* High Confidence Suggestions */}
      {highConfidence.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            High Confidence ({highConfidence.length})
          </h4>
          <div className="space-y-2">
            {highConfidence.map(suggestion => (
              <RuleSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApply}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Medium Confidence Suggestions */}
      {mediumConfidence.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Medium Confidence ({mediumConfidence.length})
          </h4>
          <div className="space-y-2">
            {mediumConfidence.map(suggestion => (
              <RuleSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApply}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Low Confidence Suggestions */}
      {lowConfidence.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Low Confidence ({lowConfidence.length})
          </h4>
          <div className="space-y-2">
            {lowConfidence.map(suggestion => (
              <RuleSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={handleApply}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleSuggestionPanel;
