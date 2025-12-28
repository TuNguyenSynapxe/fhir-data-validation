/**
 * TypeScript interfaces for Terminology Authoring
 * Phase 1: Code + Display ONLY (lean model)
 * 
 * Design principles:
 * - FHIR-first identity (no internal IDs)
 * - CodeSystem.identity = url
 * - Concept.identity = code
 * - Everything is editable (authoring-only)
 */

/**
 * CodeSystem model (Phase 1: minimal fields + FHIR R4 compatibility)
 * Identity: url (canonical URL)
 */
export interface CodeSystem {
  /** Canonical URL that uniquely identifies this CodeSystem */
  url: string;
  
  /** Human-friendly name */
  name?: string;
  
  /** Human-readable title */
  title?: string;
  
  /** Publication status */
  status?: 'draft' | 'active' | 'retired' | 'unknown';
  
  /** Description of the code system */
  description?: string;
  
  /** Version of the code system */
  version?: string;
  
  /** Publisher name */
  publisher?: string;
  
  /** Content mode */
  content?: 'not-present' | 'example' | 'fragment' | 'complete' | 'supplement';
  
  /** Total number of concepts */
  count?: number;
  
  /** Concepts defined in this CodeSystem */
  concept: CodeSystemConcept[];
  
  /** Alias for concept (backward compatibility with some FHIR tooling) - always kept in sync with concept */
  concepts: CodeSystemConcept[];
}

/**
 * Concept within a CodeSystem (Phase 1: code + display + FHIR R4 fields)
 * Identity: code (unique within parent CodeSystem)
 */
export interface CodeSystemConcept {
  /** Code that identifies this concept (primary identity) */
  code: string;
  
  /** Human-readable display text */
  display?: string;
  
  /** Formal definition */
  definition?: string;
  
  /** Child concepts (nested hierarchy) */
  concept?: CodeSystemConcept[];
}

// Legacy types below - kept for backward compatibility but not used in Phase 1

/**
 * Simple coding structure (system + code + display)
 */
export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

/**
 * Project-specific TerminologyConstraint model
 * Identity: id (constraint identifier)
 */
export interface TerminologyConstraint {
  /** Unique constraint identifier */
  id: string;
  
  /** Human-readable name */
  name?: string;
  
  /** Description of what this constraint validates */
  description?: string;
  
  /** FHIR resource type this constraint applies to */
  resourceType: string;
  
  /** FHIRPath expression to the element being constrained */
  path: string;
  
  /** Type of constraint */
  constraintType: 'required' | 'allowedValues' | 'binding';
  
  /** Binding strength if constraintType is "binding" */
  bindingStrength?: 'required' | 'extensible' | 'preferred' | 'example';
  
  /** Reference to the CodeSystem URL */
  valueSetUrl?: string;
  
  /** Specific allowed codes from the referenced CodeSystem */
  allowedAnswers: AllowedAnswer[];
  
  /** Severity of violation */
  severity: 'error' | 'warning' | 'information';
  
  /** Error message to display when constraint is violated */
  message?: string;
  
  /** Whether this constraint is currently active */
  active: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Project-specific model for allowed code in a constraint
 * Identity: system + code (no internal IDs)
 */
export interface AllowedAnswer {
  /** CodeSystem URL */
  system: string;
  
  /** Concept code within the system */
  code: string;
  
  /** Display text for the code (optional) */
  display?: string;
  
  /** Optional version of the CodeSystem */
  version?: string;
  
  /** Additional context or notes */
  note?: string;
}

/**
 * Advisory about potential issues in terminology authoring
 * Generated dynamically, NOT persisted
 */
export interface RuleAdvisory {
  /** Advisory code identifying the type of issue */
  advisoryCode: string;
  
  /** Severity level */
  severity: 'Info' | 'Warning' | 'Error';
  
  /** Human-readable message describing the issue */
  message: string;
  
  /** Additional context about the advisory */
  context: AdvisoryContext;
  
  /** Suggested actions to resolve the advisory */
  suggestedActions?: string[];
  
  /** Timestamp when advisory was generated */
  timestamp: string;
}

/**
 * Context information for a rule advisory
 */
export interface AdvisoryContext {
  /** CodeSystem URL involved (if applicable) */
  system?: string;
  
  /** Concept code involved (if applicable) */
  code?: string;
  
  /** Display text for the code (if applicable) */
  display?: string;
  
  /** TerminologyConstraint ID (if applicable) */
  constraintId?: string;
  
  /** Resource type affected (if applicable) */
  resourceType?: string;
  
  /** FHIRPath expression (if applicable) */
  path?: string;
  
  /** ValueSet URL referenced (if applicable) */
  valueSetUrl?: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Response from advisory endpoint
 */
export interface AdvisoryResponse {
  projectId: string;
  advisoryCount: number;
  advisories: RuleAdvisory[];
  generatedAt: string;
}
