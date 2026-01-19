/**
 * TreeNode Type Definition
 * 
 * Hierarchical representation of FHIR elements for tree-based UI.
 * Derived from flat ElementDesign list.
 * 
 * CARDINALITY-FIRST DESIGN:
 * - No isIncluded/isExcluded flags
 * - Cardinality is the ONLY source of truth
 * - All semantic states derived from currentCardinality
 * 
 * EPIC 3 + EPIC 4: Slice Support
 * - Slice nodes are virtual children under sliced elements
 * - Slice child nodes mirror parent element structure
 */

import type { ElementDesign } from '../api/sdBuilderApi';

export interface Cardinality {
  min: number;
  max: string; // number or "*"
}

export type NodeRole = 'root' | 'backbone' | 'leaf';

export interface TreeNode {
  // Identity
  id: string;                    // Unique node ID (path, path::slice::name, or path::slice::name::child::childName)
  path: string;                  // Full FHIR path (e.g., "Patient.contact.telecom")
  name: string;                  // Display name (e.g., "telecom")
  
  // Hierarchy
  parent: TreeNode | null;
  children: TreeNode[];
  depth: number;
  role: NodeRole;                // root | backbone | leaf
  
  // Slice Support (EPIC 3 + EPIC 4)
  isSlice?: boolean;             // True for virtual slice nodes
  sliceName?: string;            // Slice identifier (only for slice nodes)
  parentPath?: string;           // Link back to sliced element (only for slice nodes)
  isSliceChild?: boolean;        // True for children under slice nodes (EPIC 4)
  sliceContext?: string;         // Parent slice name (only for slice children, EPIC 4)
  
  // FHIR Metadata
  elementDesign: ElementDesign;  // Reference to backend element
  typeCodes?: string[];          // Type codes for binding eligibility
  
  // Cardinality (SOURCE OF TRUTH)
  baseCardinality: Cardinality;     // From FHIR base definition
  currentCardinality: Cardinality;  // overrideCardinality ?? baseCardinality
  
  // Derived semantic state (computed from currentCardinality)
  isRepeatable: boolean;         // max === "*"
  isRequired: boolean;           // min >= 1
  isOptional: boolean;           // min === 0 && max !== "0"
  isNotAllowed: boolean;         // max === "0"
  
  // Modifications
  hasCardinalityOverride: boolean;  // overrideCardinality !== null
  hasBinding: boolean;              // binding !== null
  hasSlicing: boolean;              // slicing !== null
  sliceCount: number;               // slices.length
  
  // Visual state (computed)
  isVisible: boolean;            // Based on mode + role + cardinality
  isExpandable: boolean;         // Has children
}

export type VisibilityMode = 'Minimal' | 'Full' | 'Expert';
