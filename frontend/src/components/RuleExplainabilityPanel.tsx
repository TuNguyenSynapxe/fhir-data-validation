import React, { useState } from 'react';
import ConfidenceBadge from './ConfidenceBadge';
import type { RuleExplainability } from '../types/ruleExplainability';
import { getOriginLabel, getOriginColors, getSeverityIcon } from '../types/ruleExplainability';

/**
 * RuleExplainabilityPanel - Expandable explainability section
 * 
 * Phase 1: Read-only, deterministic explanations
 * 
 * BEHAVIOR:
 * - Expandable UI (collapsed by default)
 * - Shows rule origin
 * - Shows evidence chain
 * - Shows confidence (if applicable)
 * - Shows impact summary
 * - Human-friendly language
 * 
 * CONSTRAINTS:
 * - No recalculation
 * - No API calls
 * - No mutation
 * - No persistence
 */
interface RuleExplainabilityPanelProps {
  explainability: RuleExplainability;
  defaultExpanded?: boolean;
}

const RuleExplainabilityPanel: React.FC<RuleExplainabilityPanelProps> = ({
  explainability,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const originColors = getOriginColors(explainability.origin);

  return (
    <div className="border-t border-gray-200 mt-3 pt-3">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Why this rule exists
          </span>
        </div>
        
        {/* Origin badge (always visible) */}
        <span className={`text-xs font-medium px-2 py-1 rounded ${originColors.text} ${originColors.bg} border ${originColors.border}`}>
          {getOriginLabel(explainability.origin)}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 space-y-4 pl-6">
          {/* Summary */}
          {explainability.summary && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-900">
                <strong>Summary:</strong> {explainability.summary}
              </p>
            </div>
          )}

          {/* Confidence */}
          {explainability.confidence && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 mb-2">Confidence Level:</h4>
              <ConfidenceBadge
                confidence={explainability.confidence}
                numericConfidence={explainability.numericConfidence}
                showNumeric={explainability.numericConfidence !== undefined}
                size="md"
              />
            </div>
          )}

          {/* Evidence */}
          {explainability.evidence.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 mb-2">Evidence:</h4>
              <ul className="space-y-2">
                {explainability.evidence.map((evidence, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <div className="flex-1">
                      <p className="text-gray-700">{evidence.description}</p>
                      {evidence.details && (
                        <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                          {evidence.details.sampleCount && (
                            <div>Samples: {evidence.details.sampleCount}</div>
                          )}
                          {evidence.details.resourceCount && (
                            <div>Resources: {evidence.details.resourceCount}</div>
                          )}
                          {evidence.details.fieldPath && (
                            <div>Field: {evidence.details.fieldPath}</div>
                          )}
                          {evidence.details.occurrenceRate !== undefined && (
                            <div>Occurrence: {(evidence.details.occurrenceRate * 100).toFixed(0)}%</div>
                          )}
                          {evidence.details.observedValues && evidence.details.observedValues.length > 0 && (
                            <div>
                              Values: {evidence.details.observedValues.slice(0, 3).map(v => JSON.stringify(v)).join(', ')}
                              {evidence.details.observedValues.length > 3 && '...'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Impact Summary */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-2">Impact:</h4>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2">
              {/* Severity */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">{getSeverityIcon(explainability.impact.severity)}</span>
                <span className="font-medium text-gray-700 capitalize">
                  {explainability.impact.severity}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700">
                {explainability.impact.description}
              </p>

              {/* Affected Resource Types */}
              {explainability.impact.affectedResourceTypes.length > 0 && (
                <div className="text-xs text-gray-600">
                  Affects: {explainability.impact.affectedResourceTypes.join(', ')}
                </div>
              )}

              {/* Example Failure */}
              {explainability.impact.exampleFailure && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <div className="font-semibold text-red-700 mb-1">Example Error:</div>
                  <div className="text-red-600 font-mono">
                    {explainability.impact.exampleFailure}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          {(explainability.createdAt || explainability.createdBy) && (
            <div className="pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                {explainability.createdAt && (
                  <div>Created: {new Date(explainability.createdAt).toLocaleString()}</div>
                )}
                {explainability.createdBy && (
                  <div>Created by: {explainability.createdBy}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RuleExplainabilityPanel;
