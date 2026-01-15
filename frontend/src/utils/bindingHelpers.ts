/**
 * Binding Helpers
 * 
 * Eligibility checks and utilities for FHIR terminology bindings.
 * 
 * BACKEND-AUTHORITATIVE DESIGN:
 * - This file assumes backend provides:
 *   - elementDesign.typeCodes (array of FHIR type codes)
 *   - elementDesign.baseBinding (from base profile)
 *   - elementDesign.overrideBinding (user-defined override)
 * - NO path-based heuristics
 * - NO fallback guessing logic
 * - Fail safely if required fields are missing
 * 
 * RULES:
 * - Binding is only applicable to coded types
 * - Only leaf nodes can have binding
 * - Binding editor is explicit, not bulk-editable
 */

import type { TreeNode } from '../types/treeNode';
import type { BindingConfig } from '../api/sdBuilderApi';
import { isSameCanonical } from '../features/sd-builder/utils/canonicalUrlUtils';

/**
 * FHIR types that support terminology binding
 */
const BINDABLE_TYPES = new Set([
  'code',
  'Coding',
  'CodeableConcept',
]);

/**
 * Check if a node is eligible for binding editor
 * 
 * AUTHORITATIVE: Uses ONLY backend-provided type information.
 * No path-based heuristics.
 * 
 * @param node - Tree node to check
 * @returns true if binding editor should be available
 */
export function isBindingEligible(node: TreeNode): boolean {
  // Must be a leaf node
  if (node.role !== 'leaf') {
    return false;
  }
  
  // Get type codes from backend (backend-authoritative)
  const typeCodes = node.elementDesign.typeCodes;
  
  if (!typeCodes || typeCodes.length === 0) {
    return false; // No types = not bindable
  }
  
  // Check if any type code is bindable
  return typeCodes.some(typeCode => BINDABLE_TYPES.has(typeCode));
}

/**
 * Get base binding from node (from base FHIR profile)
 * 
 * AUTHORITATIVE: Returns backend-provided base binding only.
 * 
 * @param node - Tree node
 * @returns Base binding config or null
 */
export function getBaseBinding(node: TreeNode): BindingConfig | null {
  return node.elementDesign.baseBinding ?? null;
}

/**
 * Get override binding from node (user-defined override)
 * 
 * AUTHORITATIVE: Returns backend-provided override only.
 * 
 * @param node - Tree node
 * @returns Override binding config or null
 */
export function getOverrideBinding(node: TreeNode): BindingConfig | null {
  return node.elementDesign.overrideBinding ?? null;
}

/**
 * Get current effective binding from node
 * 
 * AUTHORITATIVE: Override takes precedence over base.
 * 
 * @param node - Tree node
 * @returns Current binding config (override or base) or null
 */
export function getCurrentBinding(node: TreeNode): BindingConfig | null {
  return getOverrideBinding(node) ?? getBaseBinding(node) ?? null;
}

/**
 * Check if binding is overridden (not inherited from base)
 * 
 * AUTHORITATIVE: Checks ONLY for explicit override presence.
 * VERSION-AWARE: Compares base URLs only, ignoring version suffixes.
 * 
 * Example: If base is "http://example.com/VS|5.0.0" and override is "http://example.com/VS|4.0.0",
 * they refer to the same ValueSet, so this is NOT considered an override.
 * 
 * @param node - Tree node
 * @returns true if binding has been overridden with a DIFFERENT ValueSet
 */
export function hasBindingOverride(node: TreeNode): boolean {
  const overrideBinding = getOverrideBinding(node);
  const baseBinding = getBaseBinding(node);
  
  if (!overrideBinding) {
    return false; // No override at all
  }
  
  if (!baseBinding) {
    return true; // Override exists but no base = definitely an override
  }
  
  // Compare base URLs only (ignore version suffixes)
  return !isSameCanonical(overrideBinding.valueSetUrl, baseBinding.valueSetUrl);
}

/**
 * Validate canonical URL format
 * 
 * @param url - URL to validate
 * @returns true if valid canonical URL format
 */
export function isValidCanonicalUrl(url: string): boolean {
  if (!url || url.trim().length === 0) {
    return false;
  }
  
  // Basic URL validation
  try {
    new URL(url);
    return true;
  } catch {
    // Also allow relative URIs like "http://hl7.org/fhir/ValueSet/..."
    return url.startsWith('http://') || url.startsWith('https://');
  }
}

/**
 * Binding strength options
 */
export const BINDING_STRENGTHS = [
  { value: 'required', label: 'Required', description: 'Must use a code from the value set' },
  { value: 'extensible', label: 'Extensible', description: 'Should use value set if possible' },
  { value: 'preferred', label: 'Preferred', description: 'Recommended to use value set' },
  { value: 'example', label: 'Example', description: 'Example codes only' },
] as const;

export type BindingStrength = typeof BINDING_STRENGTHS[number]['value'];
