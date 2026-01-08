/**
 * Explanation of a validation issue
 * 
 * Provides human-readable explanation structured for UI rendering:
 * - what: What failed (short summary)
 * - why: Why it failed (root cause)
 * - context: Additional context (optional)
 * - policy: Policy implications (optional)
 * - links: Related documentation links (optional)
 */
export interface Explanation {
  what: string;
  why: string;
  context?: string;
  policy?: string;
  links?: Array<{ label: string; href: string }>;
}
