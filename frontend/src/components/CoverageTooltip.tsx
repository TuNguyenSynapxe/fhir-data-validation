import React from 'react';
import type { CoverageNode } from '../types/ruleCoverage';

/**
 * CoverageTooltip - Lightweight tooltip showing coverage details
 * 
 * Requirements:
 * - Show coverage reason and match details
 * - Display rule/suggestion references
 * - Minimal design, read-only
 * 
 * Constraints:
 * - No business logic
 * - Pure presentational component
 * - No state, no side effects
 */
interface CoverageTooltipProps {
  coverageNode: CoverageNode;
  children: React.ReactNode;
}

const CoverageTooltip: React.FC<CoverageTooltipProps> = ({ coverageNode, children }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const getStatusLabel = () => {
    switch (coverageNode.status) {
      case 'covered':
        return 'Covered by Rule';
      case 'suggested':
        return 'Suggested Rule Available';
      case 'uncovered':
        return 'No Coverage';
      default:
        return 'Unknown';
    }
  };

  const getMatchLabel = () => {
    if (!coverageNode.matchType || coverageNode.matchType === 'none') return null;

    switch (coverageNode.matchType) {
      case 'exact':
        return 'Exact Match';
      case 'wildcard':
        return 'Wildcard Match';
      case 'parent':
        return 'Parent Coverage';
      default:
        return null;
    }
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {/* Tooltip */}
      {isVisible && (
        <div className="absolute z-50 left-full ml-2 top-0 w-72 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3">
            {/* Status */}
            <div className="font-semibold mb-2">{getStatusLabel()}</div>

            {/* Match Type */}
            {getMatchLabel() && (
              <div className="text-gray-300 mb-2">
                Match: <span className="text-white">{getMatchLabel()}</span>
              </div>
            )}

            {/* Covered By */}
            {coverageNode.coveredBy && (
              <div className="mb-2">
                <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">
                  Rule Path:
                </div>
                <code className="text-green-400 bg-gray-800 px-1.5 py-0.5 rounded break-all">
                  {coverageNode.coveredBy.rulePath}
                </code>
              </div>
            )}

            {/* Suggested By */}
            {coverageNode.suggestedBy && (
              <div className="mb-2">
                <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">
                  Suggested Path:
                </div>
                <code className="text-blue-400 bg-gray-800 px-1.5 py-0.5 rounded break-all">
                  {coverageNode.suggestedBy.suggestionPath}
                </code>
              </div>
            )}

            {/* Reason */}
            {coverageNode.reason && (
              <div className="text-gray-300 mt-2 pt-2 border-t border-gray-700">
                {coverageNode.reason}
              </div>
            )}

            {/* Field Metadata */}
            {(coverageNode.fieldType || coverageNode.cardinality) && (
              <div className="flex gap-3 mt-2 pt-2 border-t border-gray-700 text-gray-400">
                {coverageNode.fieldType && (
                  <span>Type: {coverageNode.fieldType}</span>
                )}
                {coverageNode.cardinality && (
                  <span>Cardinality: {coverageNode.cardinality}</span>
                )}
              </div>
            )}

            {/* Arrow */}
            <div className="absolute right-full top-3 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverageTooltip;
