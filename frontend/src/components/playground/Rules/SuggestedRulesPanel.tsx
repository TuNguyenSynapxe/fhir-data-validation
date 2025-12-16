import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Lightbulb, Sparkles } from 'lucide-react';
import type { SystemRuleSuggestion } from '../../../api/projects';
import { RuleSuggestionCard } from './RuleSuggestionCard';

interface SuggestedRulesPanelProps {
  suggestions: SystemRuleSuggestion[];
  onApplySuggestion: (suggestion: SystemRuleSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onNavigateToPath?: (path: string) => void;
}

export const SuggestedRulesPanel: React.FC<SuggestedRulesPanelProps> = ({
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  onNavigateToPath,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-t-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-blue-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-blue-600" />
          )}
          <Lightbulb className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-blue-900">
            Suggested Rules
          </h4>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full border border-blue-200">
            {suggestions.length}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded border border-gray-200">
            <Sparkles className="w-3 h-3" />
            System
          </span>
        </div>
        <span className="text-xs text-blue-600">
          {isExpanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {/* Subtitle - always visible */}
      {isExpanded && (
        <div className="px-3 py-2 bg-blue-50 border-x border-blue-200 text-xs text-blue-700">
          Semantic pattern analysis—observations marked "Draft" can be converted to rules, instance data flagged for review
        </div>
      )}

      {/* Suggestions List */}
      {isExpanded && (
        <div className="border-x border-b border-blue-200 rounded-b-lg bg-gradient-to-b from-blue-50/50 to-white p-3 space-y-2">
          {suggestions.map((suggestion) => (
            <RuleSuggestionCard
              key={suggestion.suggestionId}
              suggestion={suggestion}
              onApply={onApplySuggestion}
              onDismiss={onDismissSuggestion}
              onNavigateToPath={onNavigateToPath}
            />
          ))}

          {/* Footer tip */}
          <div className="mt-3 pt-3 border-t border-blue-100">
            <p className="text-xs text-blue-600 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tip:</strong> Click "Apply Rule" to convert suggestions into editable project rules. 
                Suggestions won't overlap with existing rules or HL7 SPEC_HINT requirements.
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
