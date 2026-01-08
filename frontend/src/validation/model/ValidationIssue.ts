import type { ValidationSource } from './ValidationSource';
import type { ValidationSeverity } from './ValidationSeverity';

/**
 * Optional details for a validation issue
 * 
 * Provides additional context for explaining why validation failed:
 * - profile: StructureDefinition URL that defined the constraint
 * - expected: Expected value or behavior
 * - actual: Actual value found in data
 * - valueSet: ValueSet URL for terminology validation
 * - violationReason: Explanation when validation is ambiguous
 * - policyMode: Policy that determined severity
 * - explanationHint: Additional context for explanation
 */
export interface ValidationIssueDetails {
  profile?: string;
  expected?: unknown;
  actual?: unknown;
  valueSet?: string;
  violationReason?: string;
  policyMode?: 'strict' | 'permissive';
  explanationHint?: string;
}

/**
 * A single validation issue
 * 
 * Represents one finding from the validation engine.
 * 
 * Core fields:
 * - source: Which validation subsystem produced this issue
 * - severity: error | warning | info (determined by backend policy)
 * - errorCode: Machine-readable identifier (e.g., SD_CARDINALITY_MIN_VIOLATION)
 * - path: FHIRPath location of the issue (e.g., Bundle.entry[0].resource.type)
 * - message: Human-readable summary
 * 
 * Optional details provide context for explanation layer.
 */
export interface ValidationIssue {
  source: ValidationSource;
  severity: ValidationSeverity;
  errorCode: string;
  path: string;
  message: string;
  details?: ValidationIssueDetails;
}
