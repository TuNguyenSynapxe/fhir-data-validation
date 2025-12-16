import React from 'react';
import { CheckCircle, X, ExternalLink } from 'lucide-react';
import type { SystemRuleSuggestion } from '../../../api/projects';

interface RuleSuggestionCardProps {
  suggestion: SystemRuleSuggestion;
  onApply: (suggestion: SystemRuleSuggestion) => void;
  onDismiss: (suggestionId: string) => void;
  onNavigateToPath?: (path: string) => void;
}

const getRuleTypeIcon = (ruleType: string | null): string => {
  if (!ruleType) return '👁️'; // Observation only, no rule
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
    case 'ReferenceExists':
      return '🔗';
    default:
      return '📝';
  }
};

const getSemanticTypeBadge = (semanticType: string): { label: string; color: string } => {
  switch (semanticType) {
    case 'TerminologyBoundField':
      return { label: 'Terminology', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'ReferenceField':
      return { label: 'Reference', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'StatusOrLifecycleField':
      return { label: 'Status', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'IdentifierField':
      return { label: 'Identifier', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'FreeTextField':
      return { label: 'Text', color: 'bg-gray-50 text-gray-700 border-gray-200' };
    case 'CodedAnswerField':
      return { label: 'Coded', color: 'bg-violet-50 text-violet-700 border-violet-200' };
    default:
      return { label: 'Unknown', color: 'bg-gray-50 text-gray-600 border-gray-200' };
  }
};

const getObservationTypeBadge = (observationType: string): { label: string; color: string } => {
  switch (observationType) {
    case 'ConstantValue':
      return { label: 'Constant', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'SmallValueSet':
      return { label: 'Small Set', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    case 'AlwaysPresent':
      return { label: 'Always Present', color: 'bg-green-50 text-green-700 border-green-200' };
    case 'InstanceData':
      return { label: 'Instance Data', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    case 'ReferenceTargetConsistent':
      return { label: 'Target Consistent', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'PatternDetected':
      return { label: 'Pattern', color: 'bg-pink-50 text-pink-700 border-pink-200' };
    case 'NoPattern':
      return { label: 'No Pattern', color: 'bg-gray-50 text-gray-600 border-gray-200' };
    default:
      return { label: observationType, color: 'bg-gray-50 text-gray-600 border-gray-200' };
  }
};

const getConfidenceBadgeColor = (confidence: string): string => {
  switch (confidence) {
    case 'high':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'medium':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'low':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const formatParamValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
};

export const RuleSuggestionCard: React.FC<RuleSuggestionCardProps> = ({
  suggestion,
  onApply,
  onDismiss,
  onNavigateToPath,
}) => {
  const fhirPath = `${suggestion.resourceType}.${suggestion.path}`;

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateToPath) {
      onNavigateToPath(fhirPath);
    }
  };

  return (
    <div className="bg-white border border-blue-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-2xl mt-0.5">
          {getRuleTypeIcon(suggestion.ruleType)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-gray-900 text-sm">
                  {suggestion.ruleType || 'Observation'}
                </span>
                {suggestion.ruleType && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    DRAFT
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded border font-medium ${getConfidenceBadgeColor(
                    suggestion.confidence
                  )}`}
                >
                  {suggestion.confidence.toUpperCase()}
                </span>
              </div>
              
              {/* Semantic and Observation Type Badges */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded border ${getSemanticTypeBadge(suggestion.semanticType).color}`}
                >
                  {getSemanticTypeBadge(suggestion.semanticType).label}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded border ${getObservationTypeBadge(suggestion.observationType).color}`}
                >
                  {getObservationTypeBadge(suggestion.observationType).label}
                </span>
              </div>

              {/* FHIRPath - clickable */}
              <button
                onClick={handleNavigate}
                className="group flex items-center gap-1 text-xs font-mono bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                title="Navigate to field in bundle"
              >
                <code className="text-gray-700 group-hover:text-blue-700">
                  {fhirPath}
                </code>
                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
              </button>
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => onDismiss(suggestion.suggestionId)}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Dismiss suggestion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Explanation */}
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {suggestion.reasoning}
          </p>

          {/* Detected Value / Params */}
          {Object.keys(suggestion.params).length > 0 && (
            <div className="mb-2">
              <div className="flex items-start gap-2 text-xs">
                <span className="text-gray-500 font-medium">Detected:</span>
                <div className="flex-1 font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                  {Object.entries(suggestion.params).map(([key, value], idx) => (
                    <div key={idx}>
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="text-gray-900">{formatParamValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Evidence */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            <span>
              <strong className="text-gray-700">
                {suggestion.sampleEvidence.resourceCount}
              </strong>{' '}
              resources analyzed
            </span>
            {suggestion.sampleEvidence.exampleValues.length > 0 && (
              <span className="truncate">
                Examples: {suggestion.sampleEvidence.exampleValues.slice(0, 2).join(', ')}
                {suggestion.sampleEvidence.exampleValues.length > 2 && '...'}
              </span>
            )}
          </div>

          {/* Convert to Rule / Ignore buttons */}
          <div className="flex items-center gap-2">
            {suggestion.ruleType ? (
              <>
                <button
                  onClick={() => onApply(suggestion)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  title="Convert this observation into a validation rule"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Convert to Rule
                </button>
                <button
                  onClick={() => onDismiss(suggestion.suggestionId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded transition-colors"
                  title="Dismiss this suggestion"
                >
                  Ignore
                </button>
              </>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs text-gray-600">
                <span className="italic">No rule suggested — {suggestion.observationType === 'InstanceData' ? 'instance-specific data' : 'manual review recommended'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
