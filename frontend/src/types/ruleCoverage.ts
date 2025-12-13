/**
 * Rule Coverage Engine Types
 * 
 * Phase 1: Deterministic coverage analysis for FHIR R4
 * 
 * CONSTRAINTS:
 * - FHIR R4 only
 * - No AI
 * - Pure deterministic logic
 * - No Firely validation
 * - No mutation
 * - No persistence
 */

/**
 * Coverage status for a schema node
 */
export type CoverageStatus = 
  | 'covered'      // Has validation rule
  | 'suggested'    // Has suggestion but no rule yet
  | 'uncovered';   // No rule or suggestion

/**
 * Match type for rule-to-node matching
 */
export type MatchType = 
  | 'exact'        // Direct FHIRPath match
  | 'wildcard'     // Wildcard [*] match
  | 'parent'       // Parent node coverage
  | 'none';        // No match

/**
 * Coverage node with status and metadata
 */
export interface CoverageNode {
  path: string;              // Normalized FHIRPath (e.g., "identifier.system")
  status: CoverageStatus;
  matchType?: MatchType;
  
  // References to rules/suggestions
  coveredBy?: {
    ruleId?: string;
    rulePath: string;
    matchType: MatchType;
  };
  
  suggestedBy?: {
    suggestionId?: string;
    suggestionPath: string;
  };
  
  // Metadata
  reason?: string;           // Human-readable explanation
  fieldType?: string;        // FHIR data type
  cardinality?: string;      // 0..1, 1..1, 0..*, 1..*
}

/**
 * Coverage summary statistics
 */
export interface CoverageSummary {
  totalNodes: number;
  coveredNodes: number;
  suggestedNodes: number;
  uncoveredNodes: number;
  coveragePercentage: number;  // 0-100
  
  // Breakdown by match type
  exactMatches: number;
  wildcardMatches: number;
  parentMatches: number;
}

/**
 * Coverage analysis context
 */
export interface CoverageContext {
  resourceType: string;
  schemaTree: SchemaNode[];
  existingRules: ValidationRule[];
  suggestions?: RuleSuggestion[];
}

/**
 * Schema node structure (simplified)
 */
export interface SchemaNode {
  path: string;              // e.g., "Patient.identifier"
  name: string;              // e.g., "identifier"
  type?: string;             // FHIR type
  cardinality?: string;
  children?: SchemaNode[];
}

/**
 * Validation rule structure (simplified)
 */
export interface ValidationRule {
  id?: string;
  fhirPath: string;
  operator: string;
  value?: any;
  message?: string;
}

/**
 * Rule suggestion structure (simplified)
 */
export interface RuleSuggestion {
  id: string;
  preview: {
    fhirPath: string;
    operator: string;
    value?: any;
  };
}

/**
 * Coverage analysis result
 */
export interface CoverageAnalysisResult {
  summary: CoverageSummary;
  nodes: CoverageNode[];
  timestamp: string;
}
