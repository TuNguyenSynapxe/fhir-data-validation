import React, { useState } from 'react';
import FhirSchemaTreeViewWithCoverage from '../components/FhirSchemaTreeViewWithCoverage';
import { analyzeCoverage } from '../utils/ruleCoverageEngine';
import type { 
  CoverageContext, 
  CoverageNode, 
  ValidationRule,
  RuleSuggestion,
  SchemaNode 
} from '../types/ruleCoverage';

/**
 * CoverageDemo - Demo page for rule coverage visualization
 * 
 * Requirements:
 * - Demonstrate coverage analysis with mock data
 * - Show coverage indicators in schema tree
 * - Display coverage summary statistics
 * - Read-only visualization
 * 
 * Constraints:
 * - No actual validation
 * - Mock data only
 * - No persistence
 */
const CoverageDemo: React.FC = () => {
  const [resourceType] = useState('Patient');
  const [selectedPath, setSelectedPath] = useState<string>('');

  // Mock rules for demo
  const mockRules: ValidationRule[] = [
    {
      id: 'rule-1',
      fhirPath: 'identifier.system',
      operator: 'exists',
    },
    {
      id: 'rule-2',
      fhirPath: 'name[*].family',
      operator: 'exists',
    },
    {
      id: 'rule-3',
      fhirPath: 'active',
      operator: 'equals',
      value: 'true',
    },
  ];

  // Mock suggestions for demo
  const mockSuggestions: RuleSuggestion[] = [
    {
      id: 'suggestion-1',
      preview: {
        fhirPath: 'birthDate',
        operator: 'exists',
      },
    },
    {
      id: 'suggestion-2',
      preview: {
        fhirPath: 'gender',
        operator: 'in',
        value: 'male,female,other,unknown',
      },
    },
  ];

  // Mock schema tree (simplified Patient structure)
  const mockSchemaTree: SchemaNode[] = [
    {
      path: 'Patient',
      name: 'Patient',
      type: 'Patient',
      cardinality: '1..1',
      children: [
        {
          path: 'Patient.identifier',
          name: 'identifier',
          type: 'Identifier',
          cardinality: '0..*',
          children: [
            {
              path: 'Patient.identifier.system',
              name: 'system',
              type: 'uri',
              cardinality: '0..1',
            },
            {
              path: 'Patient.identifier.value',
              name: 'value',
              type: 'string',
              cardinality: '0..1',
            },
          ],
        },
        {
          path: 'Patient.name',
          name: 'name',
          type: 'HumanName',
          cardinality: '0..*',
          children: [
            {
              path: 'Patient.name.family',
              name: 'family',
              type: 'string',
              cardinality: '0..1',
            },
            {
              path: 'Patient.name.given',
              name: 'given',
              type: 'string',
              cardinality: '0..*',
            },
          ],
        },
        {
          path: 'Patient.active',
          name: 'active',
          type: 'boolean',
          cardinality: '0..1',
        },
        {
          path: 'Patient.birthDate',
          name: 'birthDate',
          type: 'date',
          cardinality: '0..1',
        },
        {
          path: 'Patient.gender',
          name: 'gender',
          type: 'code',
          cardinality: '0..1',
        },
        {
          path: 'Patient.telecom',
          name: 'telecom',
          type: 'ContactPoint',
          cardinality: '0..*',
          children: [
            {
              path: 'Patient.telecom.system',
              name: 'system',
              type: 'code',
              cardinality: '0..1',
            },
            {
              path: 'Patient.telecom.value',
              name: 'value',
              type: 'string',
              cardinality: '0..1',
            },
          ],
        },
      ],
    },
  ];

  // Run coverage analysis with mock data
  const coverageContext: CoverageContext = {
    resourceType: 'Patient',
    schemaTree: mockSchemaTree,
    existingRules: mockRules,
    suggestions: mockSuggestions,
  };

  const coverageResult = analyzeCoverage(coverageContext);

  const handlePathSelect = (path: string) => {
    setSelectedPath(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rule Coverage Visualization Demo
          </h1>
          <p className="text-gray-600">
            Explore how validation rules cover the FHIR R4 schema structure
          </p>
        </div>

        {/* Coverage Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Nodes</div>
            <div className="text-3xl font-bold text-gray-900">
              {coverageResult.summary.totalNodes}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Covered</div>
            <div className="text-3xl font-bold text-green-600">
              {coverageResult.summary.coveredNodes}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {coverageResult.summary.coveragePercentage.toFixed(1)}% coverage
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Suggested</div>
            <div className="text-3xl font-bold text-blue-600">
              {coverageResult.summary.suggestedNodes}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Uncovered</div>
            <div className="text-3xl font-bold text-gray-600">
              {coverageResult.summary.uncoveredNodes}
            </div>
          </div>
        </div>

        {/* Match Type Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Coverage Match Types
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">Exact Matches</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {coverageResult.summary.exactMatches}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Wildcard Matches</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {coverageResult.summary.wildcardMatches}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">Parent Matches</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {coverageResult.summary.parentMatches}
              </div>
            </div>
          </div>
        </div>

        {/* Schema Tree with Coverage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Schema Tree with Coverage
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Hover over coverage indicators to see details. Green = covered by rule, Blue = suggested rule available, Grey = no coverage.
              </p>
              <FhirSchemaTreeViewWithCoverage
                resourceType={resourceType}
                onSelectPath={handlePathSelect}
                coverageNodes={coverageResult.nodes}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Path */}
            {selectedPath && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Selected Path
                </h3>
                <code className="text-xs bg-blue-50 text-blue-900 px-2 py-1 rounded block break-all">
                  {selectedPath}
                </code>
              </div>
            )}

            {/* Active Rules */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Active Rules ({mockRules.length})
              </h3>
              <div className="space-y-2">
                {mockRules.map((rule) => (
                  <div key={rule.id} className="text-xs">
                    <code className="bg-green-50 text-green-900 px-2 py-1 rounded block break-all">
                      {rule.fhirPath}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Suggestions ({mockSuggestions.length})
              </h3>
              <div className="space-y-2">
                {mockSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="text-xs">
                    <code className="bg-blue-50 text-blue-900 px-2 py-1 rounded block break-all">
                      {suggestion.preview.fhirPath}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverageDemo;
