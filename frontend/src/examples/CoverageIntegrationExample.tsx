/**
 * Integration Example: Coverage Visualization in Playground
 * 
 * This example shows how to integrate the coverage visualization
 * into the existing playground UI without modifying the rule builder.
 */

import React, { useMemo } from 'react';
import FhirSchemaTreeViewWithCoverage from '../components/FhirSchemaTreeViewWithCoverage';
import { analyzeCoverage } from '../utils/ruleCoverageEngine';
import type { ValidationRule, RuleSuggestion, SchemaNode } from '../types/ruleCoverage';

interface CoverageIntegrationExampleProps {
  resourceType: string;
  schemaTree: SchemaNode[];
  existingRules: ValidationRule[];
  suggestions?: RuleSuggestion[];
  onPathSelect: (path: string) => void;
}

/**
 * Example: Coverage visualization panel
 * 
 * Usage in existing playground:
 * 1. Add this component to the playground layout
 * 2. Pass existing rules and schema data
 * 3. Display coverage without modifying rule builder
 */
const CoverageIntegrationExample: React.FC<CoverageIntegrationExampleProps> = ({
  resourceType,
  schemaTree,
  existingRules,
  suggestions,
  onPathSelect,
}) => {
  // Run coverage analysis (memoized for performance)
  const coverageResult = useMemo(() => {
    return analyzeCoverage({
      resourceType,
      schemaTree,
      existingRules,
      suggestions,
    });
  }, [resourceType, schemaTree, existingRules, suggestions]);

  return (
    <div className="space-y-4">
      {/* Coverage Summary Card */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Validation Coverage
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {coverageResult.summary.coveragePercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Overall Coverage</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {coverageResult.summary.coveredNodes}
            </div>
            <div className="text-xs text-gray-600">Covered Nodes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {coverageResult.summary.suggestedNodes}
            </div>
            <div className="text-xs text-gray-600">Suggested</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {coverageResult.summary.uncoveredNodes}
            </div>
            <div className="text-xs text-gray-600">Uncovered</div>
          </div>
        </div>
      </div>

      {/* Schema Tree with Coverage */}
      <div className="bg-white rounded-lg shadow p-4">
        <FhirSchemaTreeViewWithCoverage
          resourceType={resourceType}
          onSelectPath={onPathSelect}
          coverageNodes={coverageResult.nodes}
        />
      </div>
    </div>
  );
};

export default CoverageIntegrationExample;

/**
 * Integration Checklist:
 * 
 * ✓ No modification to rule builder
 * ✓ No modification to validation pipeline
 * ✓ Read-only visualization only
 * ✓ Uses existing rule data
 * ✓ Uses existing schema data
 * ✓ No new API calls
 * ✓ No state mutations
 * ✓ Pure presentation layer
 * 
 * Where to Add in Playground:
 * 
 * Option 1: New Tab
 * - Add "Coverage" tab next to "Rules", "Errors", "Bundle"
 * - Show coverage visualization in tab content
 * 
 * Option 2: Sidebar Panel
 * - Add collapsible coverage panel in sidebar
 * - Show summary + expandable tree
 * 
 * Option 3: Modal/Drawer
 * - Add "View Coverage" button in rule builder
 * - Open drawer showing coverage visualization
 * 
 * Recommended: Option 1 (New Tab)
 * - Most prominent placement
 * - Natural fit with existing UI
 * - No layout changes needed
 */
