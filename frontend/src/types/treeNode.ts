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
 */

import type { ElementDesign } from '../api/sdBuilderApi';

export interface Cardinality {
  min: number;
  max: string; // number or "*"
}

export type NodeRole = 'root' | 'backbone' | 'leaf';

export interface TreeNode {
  // Identity
  id: string;                    // Unique node ID (same as path)
  path: string;                  // Full FHIR path (e.g., "Patient.contact.telecom")
  name: string;                  // Display name (e.g., "telecom")
  
  // Hierarchy
  parent: TreeNode | null;
  children: TreeNode[];
  depth: number;
  role: NodeRole;                // root | backbone | leaf
  
  // FHIR Metadata
  elementDesign: ElementDesign;  // Reference to backend element
  
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
