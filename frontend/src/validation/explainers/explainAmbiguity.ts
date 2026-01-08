import type { ValidationIssue } from '../model/ValidationIssue';
import type { Explanation } from './Explanation';

/**
 * Explain ambiguous validation
 * 
 * Returns explanation when validation could not be completed deterministically.
 * 
 * Ambiguity occurs when:
 * - ValueSet cannot be expanded offline (filter-based, entire-system includes)
 * - CodeSystem not available
 * - Resource reference cannot be resolved
 * 
 * CRITICAL: Ambiguity does NOT mean data is valid.
 * It means we cannot confirm validity.
 * 
 * Returns null if issue is not ambiguous.
 */
export function explainAmbiguity(issue: ValidationIssue): Explanation | null {
  if (!issue.details?.violationReason) {
    return null;
  }

  return {
    what: 'Validation ambiguity detected',
    why: 'This validation could not be completed deterministically',
    context: `Reason: ${issue.details.violationReason}\n\n⚠️ This does NOT mean the data is valid.\nIt means we cannot confirm validity.`,
    policy: issue.details.policyMode === 'strict'
      ? 'Strict mode: Ambiguity treated as ERROR'
      : 'Permissive mode: Ambiguity treated as WARNING',
    links: [
      { label: 'What We Validate', href: '/validation/capabilities' },
      { label: 'Terminology Limitations', href: '/validation/capabilities#terminology' },
    ],
  };
}
