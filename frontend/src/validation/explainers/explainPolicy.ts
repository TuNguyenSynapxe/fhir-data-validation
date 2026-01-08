import type { ValidationIssue } from '../model/ValidationIssue';
import type { ValidationResultSummary } from '../model/ValidationResult';

/**
 * Explain policy mode
 * 
 * Returns human-readable explanation of how policy mode affects validation.
 * 
 * Policy modes:
 * - Strict: Ambiguity is treated as ERROR
 * - Permissive: Ambiguity is treated as WARNING
 * 
 * This function can accept either a summary or a single issue.
 */
export function explainPolicy(
  summaryOrIssue: ValidationResultSummary | ValidationIssue
): string {
  const policyMode = 'policyMode' in summaryOrIssue
    ? summaryOrIssue.policyMode
    : (summaryOrIssue as ValidationIssue).details?.policyMode;

  if (policyMode === 'strict') {
    return 'Strict mode: Ambiguity treated as ERROR. Validation fails if any constraint cannot be verified deterministically.';
  }

  if (policyMode === 'permissive') {
    return 'Permissive mode: Ambiguity treated as WARNING. Validation continues with warnings when constraints cannot be fully verified.';
  }

  return 'Policy mode: Unknown';
}

/**
 * Get short policy label
 * 
 * Returns brief label for UI badges.
 */
export function getPolicyLabel(policyMode: 'strict' | 'permissive'): string {
  return policyMode === 'strict' ? 'Strict' : 'Permissive';
}
