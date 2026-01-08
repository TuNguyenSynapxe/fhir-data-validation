import type { ValidationIssue } from './ValidationIssue';

/**
 * Validation result summary
 * 
 * High-level outcome of validation:
 * - totalErrors: Count of error-level issues
 * - totalWarnings: Count of warning-level issues
 * - totalInfo: Count of info-level issues
 * - hasAmbiguity: True if any issue has violationReason (ambiguous validation)
 * - policyMode: Policy that determined severity assignments
 */
export interface ValidationResultSummary {
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  hasAmbiguity: boolean;
  policyMode: 'strict' | 'permissive';
}

/**
 * Complete validation result
 * 
 * Contains all validation issues and summary statistics.
 * This is the top-level object returned by the validation API.
 */
export interface ValidationResult {
  issues: ValidationIssue[];
  summary: ValidationResultSummary;
}
