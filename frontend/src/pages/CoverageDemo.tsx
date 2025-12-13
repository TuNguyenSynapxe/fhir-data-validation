import React, { useState } from 'react';
import RuleCoveragePanel from '../components/rules/RuleCoveragePanel';
import type { 
  ValidationRule,
  RuleSuggestion,
  SchemaNode 
} from '../types/ruleCoverage';

/**
 * CoverageDemo - Demo page showing RuleCoveragePanel usage
 * 
 * NOTE: This demo now uses the reusable RuleCoveragePanel component.
 * The panel is designed to be embedded in the Project Edit → Rules screen.
 * 
 * Requirements:
 * - Demonstrate RuleCoveragePanel with mock data
 * - Show how to integrate the panel
 * - Display usage example
 * 
 * Constraints:
 * - Mock data only
 * - No persistence
 */
const CoverageDemo: React.FC = () => {
  const [resourceType] = useState('Patient');

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RuleCoveragePanel - Integration Demo
          </h1>
          <p className="text-gray-600">
            This demo shows the reusable RuleCoveragePanel component with mock data.
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Usage Example:</h3>
            <code className="text-xs text-blue-800 block">
              {`<RuleCoveragePanel
  resourceType="${resourceType}"
  schemaTree={schemaTree}
  rules={rules}
  suggestions={suggestions}
/>`}
            </code>
          </div>
        </div>

        {/* Mock Data Display */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Mock Rules ({mockRules.length})
            </h3>
            <div className="space-y-1 text-xs text-gray-600">
              {mockRules.map(r => (
                <div key={r.id}>• {r.fhirPath}</div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Mock Suggestions ({mockSuggestions.length})
            </h3>
            <div className="space-y-1 text-xs text-gray-600">
              {mockSuggestions.map(s => (
                <div key={s.id}>• {s.preview.fhirPath}</div>
              ))}
            </div>
          </div>
        </div>

        {/* The Actual Panel Component */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Panel Preview (Collapsed by Default)
          </h2>
          <RuleCoveragePanel
            resourceType={resourceType}
            schemaTree={mockSchemaTree}
            rules={mockRules}
            suggestions={mockSuggestions}
          />
        </div>

        {/* Integration Notes */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Integration Notes
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ Panel is collapsed by default to save space</li>
            <li>✅ Click header to expand/collapse</li>
            <li>✅ All data passed via props (no API calls)</li>
            <li>✅ Read-only visualization (no rule editing)</li>
            <li>✅ Reuses all existing demo logic</li>
            <li>✅ Can be embedded in RuleBuilder component</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CoverageDemo;
