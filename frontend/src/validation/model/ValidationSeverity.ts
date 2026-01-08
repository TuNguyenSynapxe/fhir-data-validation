/**
 * Validation severity levels
 * 
 * - error: Validation failure (data violates constraints)
 * - warning: Potential issue (may violate best practices)
 * - info: Informational finding (no constraint violation)
 * 
 * Severity is determined by backend based on policy mode (strict vs permissive).
 * Frontend MUST render severity exactly as received - no reinterpretation.
 */
export type ValidationSeverity = 
  | 'error' 
  | 'warning' 
  | 'info';
