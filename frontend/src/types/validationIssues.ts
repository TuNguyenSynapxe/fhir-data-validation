/**
 * Validation Issues Type Definitions
 * 
 * These types define the data model for validation results display.
 * They separate the concept of:
 * - ValidationIssue: A single validation finding with its own message/location
 * - IssueGroup: A collection of related issues grouped by source+code
 */

export type ValidationIssueExplanation = {
  what: string;
  how?: string;
  confidence: 'high' | 'medium' | 'low';
};

export type ValidationIssue = {
  id: string;
  source: string; // 'PROJECT' | 'FHIR' | 'LINT' | 'CodeMaster' | 'Reference' | 'SPEC_HINT'
  code: string; // e.g. MANDATORY_MISSING, STRUCTURE, UNKNOWN_ELEMENT
  message: string; // human text from engine - EACH ISSUE HAS ITS OWN MESSAGE
  severity: 'error' | 'warning' | 'info';
  blocking?: boolean;
  location?: string; // raw path string if available (e.g., "gender", "language")
  breadcrumb?: string[]; // optional precomputed path segments
  resourceType?: string; // Patient, Observation...
  ruleId?: string; // if ProjectRule
  rulePath?: string; // rule FHIRPath if ProjectRule
  jsonPointer?: string; // for navigation
  details?: Record<string, any>; // optional additional context
  navigation?: {
    jsonPointer?: string;
    breadcrumb?: string;
    resourceIndex?: number;
  };
  explanation?: ValidationIssueExplanation; // structured explanation
};

export type IssueGroup = {
  groupId: string; // stable key for grouping
  source: string;
  code: string;
  title: string; // e.g. "Project Rule — MANDATORY_MISSING"
  severity: 'error' | 'warning' | 'info';
  blocking?: boolean;
  count: number;
  items: ValidationIssue[]; // IMPORTANT: each item has its own message
  resourceTypes?: string[]; // list of affected resource types
};

/**
 * Determine if an issue is blocking
 */
export const isIssueBlocking = (issue: ValidationIssue): boolean => {
  if (issue.blocking !== undefined) {
    return issue.blocking;
  }
  // Default: errors from PROJECT source are blocking
  return issue.source === 'PROJECT' && issue.severity === 'error';
};

/**
 * Generate unique ID for a validation issue
 */
export const generateIssueId = (
  source: string,
  code: string,
  path: string,
  message: string,
  index: number
): string => {
  return `${source}-${code}-${path}-${message.substring(0, 20)}-${index}`;
};
