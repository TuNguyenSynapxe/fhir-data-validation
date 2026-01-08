import type { ValidationIssue } from '../model/ValidationIssue';
import type { Explanation } from './Explanation';
import { getExplanationForCode } from './explanationRegistry';

/**
 * Explain validation error
 * 
 * Primary entry point for getting human-readable explanation of a validation issue.
 * 
 * Flow:
 * 1. Lookup error code in registry
 * 2. If found: return registry explanation
 * 3. If not found: return default explanation
 * 
 * This is a pure function - no API calls, no side effects, deterministic output.
 */
export function explainError(issue: ValidationIssue): Explanation {
  return getExplanationForCode(issue);
}
