import type { SystemRuleSuggestion } from '../api/projects';
import { Lightbulb, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

interface SuggestionsPanelProps {
  suggestions: SystemRuleSuggestion[];
  onAccept?: (suggestion: SystemRuleSuggestion) => void;
  onReject?: (suggestionId: string) => void;
}

export default function SuggestionsPanel({ 
  suggestions, 
  onAccept, 
  onReject 
}: SuggestionsPanelProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRuleTypeIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'FixedValue':
        return '🔒';
      case 'AllowedValues':
        return '📋';
      case 'CodeSystem':
        return '🏥';
      case 'Required':
        return '⚠️';
      case 'ArrayLength':
        return '📊';
      default:
        return '📝';
    }
  };

  const formatParams = (params: Record<string, unknown>) => {
    return Object.entries(params).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.join(', ')}]`;
      }
      return `${key}: ${value}`;
    }).join(', ');
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-blue-900">
          System Rule Suggestions ({suggestions.length})
        </h3>
        <span className="text-sm text-blue-600 ml-2">
          Debug mode only
        </span>
      </div>

      <p className="text-sm text-blue-700 mb-4">
        Based on patterns detected in your sample data, the system suggests the following rules. 
        Review each suggestion and accept to create the rule.
      </p>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.suggestionId}
            className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getRuleTypeIcon(suggestion.ruleType || '')}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {suggestion.ruleType || 'Observation'}
                      </span>
                      <span className="text-gray-500">•</span>
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                        {suggestion.resourceType}.{suggestion.path}
                      </code>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border font-medium ${getConfidenceBadgeColor(
                          suggestion.confidence
                        )}`}
                      >
                        {suggestion.confidence.toUpperCase()} CONFIDENCE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <p className="text-sm text-gray-700 mb-3">
                  {suggestion.reasoning}
                </p>

                {/* Parameters */}
                {Object.keys(suggestion.params).length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs font-semibold text-gray-600 uppercase">
                      Rule Parameters:
                    </span>
                    <div className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded mt-1 font-mono">
                      {formatParams(suggestion.params)}
                    </div>
                  </div>
                )}

                {/* Evidence */}
                <div className="flex items-start gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>
                      <strong>{suggestion.sampleEvidence.resourceCount}</strong> resources analyzed
                    </span>
                  </div>
                  {suggestion.sampleEvidence.exampleValues.length > 0 && (
                    <div>
                      <span className="font-semibold">Examples:</span>
                      <span className="ml-1">
                        {suggestion.sampleEvidence.exampleValues.slice(0, 3).join(', ')}
                        {suggestion.sampleEvidence.exampleValues.length > 3 && '...'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 ml-4">
                {onAccept && (
                  <button
                    onClick={() => onAccept(suggestion)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                    title="Accept and create rule"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => onReject(suggestion.suggestionId)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
                    title="Reject suggestion"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-blue-600 bg-blue-100 border border-blue-200 rounded p-2">
        💡 <strong>Tip:</strong> These suggestions are generated deterministically from your sample data. 
        They won't overlap with existing rules or HL7 SPEC_HINT requirements.
      </div>
    </div>
  );
}
