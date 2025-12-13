import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import FhirSchemaTreeViewWithCoverage from '../FhirSchemaTreeViewWithCoverage';
import { analyzeCoverage } from '../../utils/ruleCoverageEngine';
import type { 
  CoverageContext,
  SchemaNode,
  ValidationRule,
  RuleSuggestion,
} from '../../types/ruleCoverage';

/**
 * RuleCoveragePanel - Read-only collapsible coverage visualization
 * 
 * STRICT CONSTRAINTS:
 * - Read-only (no rule creation/editing)
 * - Collapsible (collapsed by default)
 * - All data via props (no API calls)
 * - No mutation of rules or bundle
 * - No auto-apply suggestions
 * 
 * Requirements:
 * - Display coverage statistics
 * - Show schema tree with coverage indicators
 * - Display active rules and suggestions
 * - Two-column layout (tree | rules/suggestions)
 */
interface RuleCoveragePanelProps {
  resourceType: string;
  schemaTree: SchemaNode[];
  rules: ValidationRule[];
  suggestions?: RuleSuggestion[];
}

const RuleCoveragePanel: React.FC<RuleCoveragePanelProps> = ({
  resourceType,
  schemaTree,
  rules,
  suggestions = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Run coverage analysis (memoized)
  const coverageResult = useMemo(() => {
    const context: CoverageContext = {
      resourceType,
      schemaTree,
      existingRules: rules,
      suggestions,
    };
    return analyzeCoverage(context);
  }, [resourceType, schemaTree, rules, suggestions]);

  // Render nothing when collapsed
  if (!isExpanded) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              Rule Coverage
            </h3>
            <span className="text-xs text-gray-500">
              ({coverageResult.summary.coveragePercentage.toFixed(1)}% covered)
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-gray-600">{coverageResult.summary.coveredNodes}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-gray-600">{coverageResult.summary.suggestedNodes}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300"></span>
              <span className="text-gray-600">{coverageResult.summary.uncoveredNodes}</span>
            </span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(false)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Rule Coverage
          </h3>
        </div>
      </button>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Summary Cards (Compact Inline) */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-600 mb-1">Total</div>
            <div className="text-xl font-bold text-gray-900">
              {coverageResult.summary.totalNodes}
            </div>
          </div>
          <div className="bg-green-50 rounded p-3">
            <div className="text-xs text-green-700 mb-1">Covered</div>
            <div className="text-xl font-bold text-green-600">
              {coverageResult.summary.coveredNodes}
            </div>
            <div className="text-xs text-green-600 mt-0.5">
              {coverageResult.summary.coveragePercentage.toFixed(1)}%
            </div>
          </div>
          <div className="bg-blue-50 rounded p-3">
            <div className="text-xs text-blue-700 mb-1">Suggested</div>
            <div className="text-xl font-bold text-blue-600">
              {coverageResult.summary.suggestedNodes}
            </div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-600 mb-1">Uncovered</div>
            <div className="text-xl font-bold text-gray-600">
              {coverageResult.summary.uncoveredNodes}
            </div>
          </div>
        </div>

        {/* Match Type Breakdown */}
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Match Types
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-600">
                Exact: <span className="font-medium text-gray-900">{coverageResult.summary.exactMatches}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-gray-600">
                Wildcard: <span className="font-medium text-gray-900">{coverageResult.summary.wildcardMatches}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-600">
                Parent: <span className="font-medium text-gray-900">{coverageResult.summary.parentMatches}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Layout: Tree | Rules/Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Schema Tree with Coverage */}
          <div className="lg:col-span-2">
            <FhirSchemaTreeViewWithCoverage
              resourceType={resourceType}
              onSelectPath={() => {}} // Read-only, no-op
              coverageNodes={coverageResult.nodes}
            />
          </div>

          {/* Right: Active Rules + Suggestions */}
          <div className="space-y-4">
            {/* Active Rules */}
            <div className="border border-gray-200 rounded bg-white p-3">
              <h4 className="text-xs font-semibold text-gray-900 mb-2">
                Active Rules ({rules.length})
              </h4>
              {rules.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No active rules</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {rules.map((rule) => (
                    <div key={rule.id} className="text-xs">
                      <code className="bg-green-50 text-green-900 px-2 py-1 rounded block break-all">
                        {rule.fhirPath}
                      </code>
                      {rule.operator && (
                        <div className="text-gray-500 mt-0.5 ml-2">
                          {rule.operator}
                          {rule.value && `: ${rule.value}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div className="border border-gray-200 rounded bg-white p-3">
              <h4 className="text-xs font-semibold text-gray-900 mb-2">
                Suggestions ({suggestions.length})
              </h4>
              {suggestions.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No suggestions</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="text-xs">
                      <code className="bg-blue-50 text-blue-900 px-2 py-1 rounded block break-all">
                        {suggestion.preview.fhirPath}
                      </code>
                      {suggestion.preview.operator && (
                        <div className="text-gray-500 mt-0.5 ml-2">
                          {suggestion.preview.operator}
                          {suggestion.preview.value && `: ${suggestion.preview.value}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleCoveragePanel;
