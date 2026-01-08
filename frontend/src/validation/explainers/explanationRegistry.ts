import type { ValidationIssue } from '../model/ValidationIssue';
import type { Explanation } from './Explanation';
import { formatValue } from './formatValue';

/**
 * Error code explanation registry
 * 
 * Maps error codes to explanation functions.
 * Each function is a pure function of ValidationIssue.
 * 
 * NO heuristics, NO string parsing, NO API calls.
 * All explanations are deterministic.
 */
type ExplanationFactory = (issue: ValidationIssue) => Explanation;

const registry: Record<string, ExplanationFactory> = {
  /**
   * Cardinality violations
   */
  SD_CARDINALITY_MIN_VIOLATION: (issue) => ({
    what: 'Required element is missing',
    why: `Element must appear at least ${formatValue(issue.details?.expected)} time(s)`,
    context: issue.details?.profile 
      ? `Profile: ${issue.details.profile}` 
      : undefined,
    policy: 'Always an error (cardinality constraints are non-negotiable)',
  }),

  SD_CARDINALITY_MAX_VIOLATION: (issue) => ({
    what: 'Too many occurrences of element',
    why: `Element must appear at most ${formatValue(issue.details?.expected)} time(s), found ${formatValue(issue.details?.actual)}`,
    context: issue.details?.profile 
      ? `Profile: ${issue.details.profile}` 
      : undefined,
    policy: 'Always an error (cardinality constraints are non-negotiable)',
  }),

  /**
   * Fixed value constraints
   */
  SD_FIXED_VALUE_MISSING: (issue) => ({
    what: 'Fixed value element is missing',
    why: `Element must have fixed value: ${formatValue(issue.details?.expected)}`,
    context: issue.details?.profile 
      ? `Profile: ${issue.details.profile}` 
      : undefined,
    policy: 'Always an error (fixed values cannot be omitted)',
  }),

  SD_FIXED_VALUE_MISMATCH: (issue) => ({
    what: 'Value does not match fixed value constraint',
    why: `Expected: ${formatValue(issue.details?.expected)}\nActual: ${formatValue(issue.details?.actual)}`,
    context: issue.details?.profile 
      ? `Profile: ${issue.details.profile}` 
      : undefined,
    policy: 'Always an error (fixed values cannot be changed)',
  }),

  /**
   * Pattern constraints
   */
  SD_PATTERN_MISSING: (issue) => ({
    what: 'Element matching pattern is missing',
    why: `Element must match pattern: ${formatValue(issue.details?.expected)}`,
    context: issue.details?.profile 
      ? `Profile: ${issue.details.profile}` 
      : undefined,
    policy: 'Always an error (pattern constraints are mandatory)',
  }),

  SD_PATTERN_MISMATCH: (issue) => ({
    what: 'Value does not match pattern constraint',
    why: `Expected pattern: ${formatValue(issue.details?.expected)}\nActual: ${formatValue(issue.details?.actual)}`,
    context: issue.details?.profile 
      ? `Profile: ${issue.details.profile}` 
      : undefined,
    policy: 'Always an error (pattern must match exactly)',
  }),

  /**
   * Terminology validation
   */
  SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED: (issue) => ({
    what: 'ValueSet could not be resolved',
    why: issue.details?.violationReason 
      ? issue.details.violationReason
      : `ValueSet ${issue.details?.valueSet ?? '(unknown)'} is not available offline`,
    context: issue.details?.profile 
      ? `Profile: ${issue.details.profile}\nBinding: Required` 
      : 'Binding: Required',
    policy: issue.details?.policyMode === 'strict'
      ? 'Strict mode: Ambiguity treated as ERROR'
      : 'Permissive mode: Ambiguity treated as WARNING',
    links: [
      { label: 'What We Validate', href: '/validation/capabilities' },
    ],
  }),

  SD_REQUIRED_BINDING_MISSING: (issue) => ({
    what: 'Required code is missing',
    why: `Element with required binding must have a code from ValueSet ${issue.details?.valueSet ?? '(unknown)'}`,
    context: issue.details?.profile 
      ? `Profile: ${issue.details.profile}\nBinding: Required` 
      : 'Binding: Required',
    policy: 'Always an error (required bindings are mandatory)',
  }),

  SD_REQUIRED_BINDING_INVALID_CODE: (issue) => ({
    what: `Code '${formatValue(issue.details?.actual)}' is not in required ValueSet`,
    why: `The code must be present in ${issue.details?.valueSet ?? '(unknown ValueSet)'}`,
    context: issue.details?.profile 
      ? `Profile: ${issue.details.profile}\nBinding: Required` 
      : 'Binding: Required',
    policy: issue.details?.policyMode === 'strict'
      ? 'Always an error in strict mode'
      : 'Treated as warning in permissive mode',
    links: issue.details?.violationReason
      ? [{ label: 'What We Validate', href: '/validation/capabilities' }]
      : undefined,
  }),
};

/**
 * Get explanation registry
 * 
 * Returns the full registry for testing or extension.
 */
export function getRegistry(): Readonly<Record<string, ExplanationFactory>> {
  return registry;
}

/**
 * Register custom explanation
 * 
 * Allows extension of the registry with custom error codes.
 * Used for project-specific or plugin-based explanations.
 */
export function registerExplanation(
  errorCode: string,
  factory: ExplanationFactory
): void {
  registry[errorCode] = factory;
}

/**
 * Default explanation for unknown error codes
 * 
 * Fallback when error code is not in registry.
 * Uses only information available in ValidationIssue - NO guessing.
 */
export function createDefaultExplanation(issue: ValidationIssue): Explanation {
  return {
    what: issue.message,
    why: `Validation failed at path: ${issue.path}`,
    context: `Source: ${issue.source}\nError code: ${issue.errorCode}`,
    policy: issue.details?.policyMode
      ? `Policy: ${issue.details.policyMode}`
      : undefined,
  };
}

/**
 * Get explanation for error code
 * 
 * Primary lookup function - checks registry first, falls back to default.
 */
export function getExplanationForCode(
  issue: ValidationIssue
): Explanation {
  const factory = registry[issue.errorCode];
  if (factory) {
    return factory(issue);
  }
  return createDefaultExplanation(issue);
}
