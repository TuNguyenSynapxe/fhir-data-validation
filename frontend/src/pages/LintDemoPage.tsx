import { useState } from 'react';
import LintExplainabilityPanel from '../components/LintExplainabilityPanel';
import type { LintIssue } from '../components/LintExplainabilityPanel';

// Sample lint issues demonstrating various categories and severities
const sampleLintIssues: LintIssue[] = [
  // JSON Category
  {
    ruleId: 'LINT_INVALID_JSON',
    category: 'Json',
    severity: 'error',
    confidence: 'high',
    title: 'Invalid JSON Syntax',
    description: 'The input contains syntactically invalid JSON that cannot be parsed.',
    message: 'JSON parsing failed at position 123: Unexpected token',
    disclaimer: 'This check runs before FHIR validation. Firely validation will not run if JSON is invalid.',
    jsonPointer: '/entry/0',
    details: {
      position: 123,
      expectedToken: '}',
      foundToken: ']'
    }
  },
  
  // Structure Category
  {
    ruleId: 'LINT_MISSING_RESOURCE_TYPE',
    category: 'Structure',
    severity: 'error',
    confidence: 'high',
    title: 'Missing ResourceType',
    description: 'A resource object is missing the required "resourceType" field.',
    message: 'Resource at entry[0] is missing "resourceType" field',
    disclaimer: 'This is a structural check. Firely will also catch this error with more context.',
    resourceType: 'Unknown',
    jsonPointer: '/entry/0/resource',
    fhirPath: 'Bundle.entry[0].resource',
    details: {
      entryIndex: 0,
      requiredField: 'resourceType'
    }
  },
  {
    ruleId: 'LINT_ENTRY_NOT_ARRAY',
    category: 'Structure',
    severity: 'error',
    confidence: 'high',
    title: 'Entry Not An Array',
    description: 'Bundle.entry must be an array of entries, not a single object.',
    message: 'Bundle.entry should be an array but found object',
    disclaimer: 'Best-effort structural validation. Defer to Firely for authoritative errors.',
    resourceType: 'Bundle',
    jsonPointer: '/entry',
    fhirPath: 'Bundle.entry'
  },

  // SchemaShape Category
  {
    ruleId: 'LINT_EXPECTED_ARRAY',
    category: 'SchemaShape',
    severity: 'warning',
    confidence: 'medium',
    title: 'Expected Array Type',
    description: 'FHIR schema expects an array type for this field, but a different type was provided.',
    message: 'Field "identifier" expects array but found object',
    disclaimer: 'Schema-based best-effort check. May have false positives for polymorphic fields. Firely validation is authoritative.',
    resourceType: 'Patient',
    jsonPointer: '/entry/0/resource/identifier',
    fhirPath: 'Bundle.entry[0].resource.identifier',
    details: {
      expectedType: 'array',
      actualType: 'object',
      field: 'identifier'
    }
  },
  {
    ruleId: 'LINT_EXPECTED_OBJECT',
    category: 'SchemaShape',
    severity: 'warning',
    confidence: 'medium',
    title: 'Expected Object Type',
    description: 'FHIR schema expects an object type for this field, but a different type was provided.',
    message: 'Field "name" expects object but found string',
    disclaimer: 'Schema-based validation may not account for all FHIR edge cases. Firely is the source of truth.',
    resourceType: 'Patient',
    jsonPointer: '/entry/0/resource/name',
    fhirPath: 'Bundle.entry[0].resource.name',
    details: {
      expectedType: 'object',
      actualType: 'string',
      field: 'name'
    }
  },

  // Primitive Category
  {
    ruleId: 'LINT_INVALID_DATE',
    category: 'Primitive',
    severity: 'warning',
    confidence: 'medium',
    title: 'Invalid Date Format',
    description: 'Date string does not match FHIR date format (YYYY, YYYY-MM, or YYYY-MM-DD).',
    message: 'Invalid date format "12/31/2023", expected YYYY-MM-DD',
    disclaimer: 'Regex-based date validation. May have false positives for edge cases. Firely will provide definitive validation.',
    resourceType: 'Patient',
    jsonPointer: '/entry/0/resource/birthDate',
    fhirPath: 'Bundle.entry[0].resource.birthDate',
    details: {
      value: '12/31/2023',
      expectedFormat: 'YYYY-MM-DD',
      field: 'birthDate'
    }
  },
  {
    ruleId: 'LINT_INVALID_DATETIME',
    category: 'Primitive',
    severity: 'warning',
    confidence: 'medium',
    title: 'Invalid DateTime Format',
    description: 'DateTime string does not match FHIR dateTime format (ISO 8601).',
    message: 'Invalid datetime "2023-12-14 10:30:00", expected ISO 8601 format',
    disclaimer: 'Pattern-based validation. Firely performs more comprehensive datetime validation.',
    resourceType: 'Observation',
    jsonPointer: '/entry/1/resource/effectiveDateTime',
    fhirPath: 'Bundle.entry[1].resource.effectiveDateTime',
    details: {
      value: '2023-12-14 10:30:00',
      expectedFormat: 'YYYY-MM-DDThh:mm:ss+zz:zz',
      field: 'effectiveDateTime'
    }
  },
  {
    ruleId: 'LINT_BOOLEAN_AS_STRING',
    category: 'Primitive',
    severity: 'warning',
    confidence: 'high',
    title: 'Boolean Represented as String',
    description: 'Boolean value is represented as a string ("true"/"false") instead of a JSON boolean (true/false).',
    message: 'Field "active" has boolean string "true" instead of boolean true',
    disclaimer: 'Type coercion check. Firely will validate the correct JSON type.',
    resourceType: 'Patient',
    jsonPointer: '/entry/0/resource/active',
    fhirPath: 'Bundle.entry[0].resource.active',
    details: {
      value: '"true"',
      expectedType: 'boolean',
      actualType: 'string',
      field: 'active'
    }
  },

  // Compatibility Category
  {
    ruleId: 'LINT_R5_FIELD_IN_R4',
    category: 'Compatibility',
    severity: 'error',
    confidence: 'medium',
    title: 'R5-Only Field Used in R4',
    description: 'This field is only available in FHIR R5 but the bundle is declared as R4.',
    message: 'Field "Encounter.actualPeriod" is R5-only, use "Encounter.period" in R4',
    disclaimer: 'Version compatibility check based on known R5/R4 differences. May not be exhaustive. Firely will validate against the specified FHIR version.',
    resourceType: 'Encounter',
    jsonPointer: '/entry/2/resource/actualPeriod',
    fhirPath: 'Bundle.entry[2].resource.actualPeriod',
    details: {
      field: 'actualPeriod',
      fhirVersion: 'R4',
      availableIn: 'R5',
      alternative: 'Use "period" field in R4'
    }
  },
  {
    ruleId: 'LINT_DEPRECATED_R4_FIELD',
    category: 'Compatibility',
    severity: 'warning',
    confidence: 'medium',
    title: 'Deprecated R4 Field',
    description: 'This field is deprecated in FHIR R5. Consider using the recommended replacement.',
    message: 'Field "Encounter.period" is deprecated in R5, use "Encounter.actualPeriod"',
    disclaimer: 'Best-effort version compatibility advice. Consult FHIR specification for migration guidance.',
    resourceType: 'Encounter',
    jsonPointer: '/entry/2/resource/period',
    fhirPath: 'Bundle.entry[2].resource.period',
    details: {
      field: 'period',
      fhirVersion: 'R5',
      status: 'deprecated',
      replacement: 'actualPeriod'
    }
  }
];

export default function LintDemoPage() {
  const [showPanel, setShowPanel] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'all' | 'errors' | 'warnings' | 'compatibility'>('all');

  const getFilteredIssues = () => {
    switch (selectedScenario) {
      case 'errors':
        return sampleLintIssues.filter(i => i.severity === 'error');
      case 'warnings':
        return sampleLintIssues.filter(i => i.severity === 'warning');
      case 'compatibility':
        return sampleLintIssues.filter(i => i.category === 'Compatibility');
      default:
        return sampleLintIssues;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Lint Explainability Panel Demo
          </h1>
          <p className="text-gray-600 mb-8">
            Interactive demonstration of the LintExplainabilityPanel component showing various lint categories and severities.
          </p>

          {/* Scenario Selector */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Lint Scenario
            </label>
            <div className="grid grid-cols-4 gap-4">
              <button
                onClick={() => setSelectedScenario('all')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedScenario === 'all'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                <div className="font-bold text-lg mb-1">All Issues</div>
                <div className="text-sm opacity-75">{sampleLintIssues.length} total</div>
              </button>
              <button
                onClick={() => setSelectedScenario('errors')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedScenario === 'errors'
                    ? 'border-red-500 bg-red-50 text-red-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                }`}
              >
                <div className="font-bold text-lg mb-1">Errors Only</div>
                <div className="text-sm opacity-75">
                  {sampleLintIssues.filter(i => i.severity === 'error').length} errors
                </div>
              </button>
              <button
                onClick={() => setSelectedScenario('warnings')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedScenario === 'warnings'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-yellow-300'
                }`}
              >
                <div className="font-bold text-lg mb-1">Warnings Only</div>
                <div className="text-sm opacity-75">
                  {sampleLintIssues.filter(i => i.severity === 'warning').length} warnings
                </div>
              </button>
              <button
                onClick={() => setSelectedScenario('compatibility')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedScenario === 'compatibility'
                    ? 'border-teal-500 bg-teal-50 text-teal-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-teal-300'
                }`}
              >
                <div className="font-bold text-lg mb-1">Compatibility</div>
                <div className="text-sm opacity-75">
                  {sampleLintIssues.filter(i => i.category === 'Compatibility').length} issues
                </div>
              </button>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-bold text-lg text-blue-900 mb-3">Component Features</h2>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-900">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <div>
                  <strong>Grouped by Category:</strong> Json, Structure, SchemaShape, Primitive, Compatibility
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <div>
                  <strong>Severity Levels:</strong> Error, Warning, Info distinctions
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <div>
                  <strong>Confidence Badges:</strong> High, Medium, Low confidence indicators
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <div>
                  <strong>Rich Context:</strong> FHIR paths, JSON pointers, resource types
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <div>
                  <strong>Disclaimers:</strong> Clear notes about best-effort nature
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <div>
                  <strong>Non-blocking UI:</strong> Read-only, doesn't replace Firely validation
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <div>
                  <strong>Collapsible:</strong> Category and issue-level expansion
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <div>
                  <strong>Version Context:</strong> Shows FHIR version (R4/R5)
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={() => setShowPanel(true)}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Open Lint Panel ({getFilteredIssues().length} issues)
            </button>
          </div>

          {/* Issue Summary */}
          <div className="mt-8 border-t pt-8">
            <h2 className="font-bold text-xl text-gray-900 mb-4">Current Scenario Details</h2>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-gray-600 text-sm mb-1">Total</div>
                <div className="text-2xl font-bold text-gray-900">{getFilteredIssues().length}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-purple-600 text-sm mb-1">Json</div>
                <div className="text-2xl font-bold text-purple-900">
                  {getFilteredIssues().filter(i => i.category === 'Json').length}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-blue-600 text-sm mb-1">Structure</div>
                <div className="text-2xl font-bold text-blue-900">
                  {getFilteredIssues().filter(i => i.category === 'Structure').length}
                </div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <div className="text-indigo-600 text-sm mb-1">Schema</div>
                <div className="text-2xl font-bold text-indigo-900">
                  {getFilteredIssues().filter(i => i.category === 'SchemaShape').length}
                </div>
              </div>
              <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                <div className="text-pink-600 text-sm mb-1">Primitive</div>
                <div className="text-2xl font-bold text-pink-900">
                  {getFilteredIssues().filter(i => i.category === 'Primitive').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lint Panel */}
      {showPanel && (
        <LintExplainabilityPanel
          lintIssues={getFilteredIssues()}
          fhirVersion="R4"
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  );
}
