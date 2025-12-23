/**
 * InstanceScope Types
 * 
 * Structured model for instance scope selection in validation rules.
 * Supports first-only, all-instances, and filter-based scoping.
 */

/**
 * Instance scope discriminated union
 */
export type InstanceScope =
  | { kind: 'first' }
  | { kind: 'all' }
  | { kind: 'filter'; filter: FilterSpec };

/**
 * Filter specification types
 */
export type FilterSpec =
  | { type: 'code'; code: string }
  | { type: 'systemCode'; system: string; code: string }
  | { type: 'identifier'; system: string; value: string }
  | { type: 'custom'; fhirPath: string };

/**
 * Detected filter option from sample bundle analysis
 */
export interface DetectedFilterOption {
  id: string;
  label: string;
  description: string;
  filterSpec: FilterSpec;
  count?: number;
}

/**
 * Helper type for display summary
 */
export interface InstanceScopeSummary {
  text: string;
  fhirPath: string;
}
