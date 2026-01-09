import { ValidationResultsView } from '@/validation/views';
import type { ValidationResult } from '@/validation/model/ValidationResult';

// Mock data for demonstration
// In production, this would come from props or context
const mockValidationResult: ValidationResult = {
  issues: [
    {
      source: 'StructureDefinition',
      severity: 'error',
      errorCode: 'SD_CARDINALITY_MIN_VIOLATION',
      path: 'Bundle.entry[0].resource.status',
      message: 'Required field "status" is missing',
      details: {
        elementPath: 'Composition.status',
        minCardinality: 1,
        actualCardinality: 0,
      },
    },
    {
      source: 'FHIRPath',
      severity: 'warning',
      errorCode: 'FP_RULE_VIOLATION',
      path: 'Bundle.entry[1].resource.code',
      message: 'FHIRPath rule "code-required" failed',
      details: {
        ruleName: 'code-required',
        expression: 'code.exists()',
      },
    },
    {
      source: 'StructureDefinition',
      severity: 'error',
      errorCode: 'SD_TERMINOLOGY_BINDING_VIOLATION',
      path: 'Bundle.entry[0].resource.type',
      message: 'Value not in required ValueSet',
      details: {
        valueSetUrl: 'http://example.org/ValueSet/document-types',
        violationReason: 'ValueSet uses filter-based expansion and cannot be validated offline',
      },
    },
  ],
  summary: {
    totalErrors: 2,
    totalWarnings: 1,
    totalInfo: 0,
    hasAmbiguity: true,
    policyMode: 'strict',
  },
};

export default function ValidationResultsPage() {
  return <ValidationResultsView result={mockValidationResult} />;
}
