/**
 * Rule Review Types - Advisory Analysis for Rule Authoring Quality
 * 
 * ⚠️ CRITICAL: Rule Review is advisory-only and NON-BLOCKING
 * - Does NOT block validation
 * - Does NOT block rule editing
 * - Does NOT replace Firely validation
 * - Does NOT act as a gatekeeper
 * 
 * Severity levels are limited to 'info' and 'warning' only.
 * No 'error' severity exists to prevent accidental blocking behavior.
 */

/**
 * Severity levels for Rule Review issues
 * LIMITED to advisory levels only - no 'error' level exists
 */
export type RuleReviewSeverity = 'info' | 'warning';

/**
 * Types of issues detected by Rule Review static analysis
 */
export type RuleReviewIssueType =
  | 'PATH_NOT_OBSERVED'        // Rule path not found in current bundle
  | 'RESOURCE_NOT_PRESENT'     // Rule targets resource type not in bundle
  | 'DUPLICATE_RULE'           // Multiple rules with same path/expression/severity
  | 'ARRAY_HANDLING_MISSING';  // Rule targets array path without explicit handling

/**
 * Reason codes for PATH_NOT_OBSERVED issues
 * These represent FACTS determined by backend-grade logic
 */
export type PathNotObservedReason =
  | 'NOT_PRESENT_IN_SAMPLE'    // Path valid but not in this sample bundle
  | 'RESOURCE_NOT_PRESENT'     // Resource type not in bundle
  | 'CONDITIONAL_PATH'         // Path is conditionally present
  | 'INTERNAL_SCHEMA_PATH'     // Internal FHIR schema artifact (id.id, extension.url)
  | 'AMBIGUOUS_ARRAY_PATH';    // Array path without explicit indexing

/**
 * Individual issue detected during rule review
 */
export interface RuleReviewIssue {
  /** ID of the rule that has an issue */
  ruleId: string;
  
  /** Type of issue detected */
  type: RuleReviewIssueType;
  
  /** Severity level (advisory only) */
  severity: RuleReviewSeverity;
  
  /** Human-readable message describing the issue (BACKEND FACT - may be technical) */
  message: string;
  
  /** Optional additional details or suggestions */
  details?: string;
  
  /** Reason code for why this issue was detected (backend fact) */
  reason?: PathNotObservedReason | 'DUPLICATE_DETECTED' | 'ARRAY_WITHOUT_INDEX';
  
  /** Path being analyzed (for frontend message formatting) */
  path?: string;
  
  /** Resource type being analyzed (for frontend message formatting) */
  resourceType?: string;
}

/**
 * Result of running rule review on a ruleset
 */
export interface RuleReviewResult {
  /** List of issues detected (empty if none found) */
  issues: RuleReviewIssue[];
  
  /** Optional metadata about the review */
  metadata?: {
    /** Timestamp of when review was performed */
    reviewedAt?: string;
    
    /** Number of rules analyzed */
    rulesAnalyzed?: number;
    
    /** Whether bundle was available for analysis */
    hadBundle?: boolean;
  };
}
