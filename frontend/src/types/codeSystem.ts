/**
 * PHASE 1 — CodeSystem Types (Lean Lookup Tables)
 * 
 * SCOPE: Simple terminology with code + display only
 * 
 * PHASE 1 SUPPORT:
 * - Code (unique identifier)
 * - Display (human-readable label)
 * 
 * PHASE 1 LIMITATION: Does NOT support:
 * - definition (concept explanation)
 * - designation[] (alternate labels, translations)
 * - property[] (custom metadata)
 * - concept[] (hierarchical structure)
 * - constraints, rules, value lists
 * - question configuration (linking to Questionnaire items)
 * 
 * TODO (Phase 2): Add definition field to CodeSetConcept
 * TODO (Phase 2): Add designation[] for multi-language support
 * TODO (Phase 2): Add property[] for custom metadata
 * TODO (Phase 2): Add version, status fields to CodeSet
 * TODO (Phase 2): Question Configuration integration
 * 
 * See: /docs/TERMINOLOGY_PHASE_1.md
 */

/**
 * CodeSetConcept — PHASE 1: Code + Display Only
 */
export interface CodeSetConcept {
  /** Unique code (primary key within CodeSet) */
  code: string;
  
  /** Human-readable display label (PHASE 1: single language only) */
  display?: string;
  
  // PHASE 1 LIMITATION: NOT supported
  // definition?: string;           // TODO (Phase 2)
  // designation?: Designation[];   // TODO (Phase 2)
  // property?: Property[];         // TODO (Phase 2)
  // concept?: CodeSetConcept[];    // TODO (Phase 2)
}

/**
 * CodeSet — PHASE 1: Simple Lookup Table
 */
export interface CodeSet {
  /** Canonical URL identifying this CodeSet */
  url: string;
  
  /** Human-friendly name */
  name?: string;
  
  /** List of concepts (PHASE 1: code + display only) */
  concepts: CodeSetConcept[];
  
  // PHASE 1 LIMITATION: NOT supported
  // version?: string;              // TODO (Phase 2)
  // status?: 'draft'|'active';     // TODO (Phase 2)
  // description?: string;          // TODO (Phase 2)
  // valueSet?: string;             // TODO (Phase 2)
}
