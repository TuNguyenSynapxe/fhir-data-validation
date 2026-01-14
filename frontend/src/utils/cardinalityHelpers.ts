/**
 * Cardinality Helpers
 * 
 * Base-bounded cardinality validation and preset generation.
 * 
 * RULES:
 * - Current cardinality can ONLY be more restrictive than base
 * - current.min >= base.min
 * - current.max <= base.max
 */

import type { Cardinality } from '../types/treeNode';

/**
 * Check if target cardinality can be applied given base constraints
 * 
 * @param base - Base cardinality from FHIR spec
 * @param target - Target cardinality to apply
 * @returns true if target is valid (more restrictive or equal to base)
 */
export function canApplyCardinality(
  base: Cardinality,
  target: Cardinality
): boolean {
  // Min must not be less restrictive
  if (target.min < base.min) return false;
  
  // Max must not be less restrictive
  if (base.max === '*') {
    // Base allows any, target can be anything
    return true;
  }
  
  if (target.max === '*') {
    // Target is unbounded but base is not
    return false;
  }
  
  // Both are bounded numbers
  return Number(target.max) <= Number(base.max);
}

/**
 * Get available cardinality presets for a given base cardinality
 * 
 * HARD STOP RULE:
 * - If base = 1..1, return empty array (cardinality is fixed)
 * 
 * @param base - Base cardinality from FHIR spec
 * @returns Available presets that are valid given base constraints
 */
export function getCardinalityPresets(base: Cardinality): CardinalityPreset[] {
  // HARD STOP: base = 1..1 means cardinality is fixed by spec
  if (base.min === 1 && base.max === '1') {
    return [];
  }
  
  const presets: CardinalityPreset[] = [];
  
  // Determine if base is single-valued or repeatable
  const isSingleValued = base.max === '1';
  const isRepeatable = base.max === '*';
  
  if (isSingleValued) {
    // Single-valued base (base.max === "1")
    
    // Required: 1..1
    const required: Cardinality = { min: 1, max: '1' };
    if (canApplyCardinality(base, required)) {
      presets.push({
        label: 'Required',
        icon: '●',
        cardinality: required,
        description: 'Required (1..1)',
      });
    }
    
    // Optional: 0..1
    const optional: Cardinality = { min: 0, max: '1' };
    if (canApplyCardinality(base, optional)) {
      presets.push({
        label: 'Optional',
        icon: '○',
        cardinality: optional,
        description: 'Optional (0..1)',
      });
    }
    
    // Not allowed: 0..0 (always valid as most restrictive)
    const notAllowed: Cardinality = { min: 0, max: '0' };
    presets.push({
      label: 'Not allowed',
      icon: '⦸',
      cardinality: notAllowed,
      description: 'Not allowed (0..0)',
    });
    
  } else if (isRepeatable) {
    // Repeatable base (base.max === "*")
    
    // Required: 1..*
    const required: Cardinality = { min: 1, max: '*' };
    if (canApplyCardinality(base, required)) {
      presets.push({
        label: 'Required',
        icon: '●',
        cardinality: required,
        description: 'Required (1..*)',
      });
    }
    
    // Optional: 0..*
    const optional: Cardinality = { min: 0, max: '*' };
    if (canApplyCardinality(base, optional)) {
      presets.push({
        label: 'Optional',
        icon: '○',
        cardinality: optional,
        description: 'Optional (0..*)',
      });
    }
    
    // Not allowed: 0..0 (always valid as most restrictive)
    const notAllowed: Cardinality = { min: 0, max: '0' };
    presets.push({
      label: 'Not allowed',
      icon: '⦸',
      cardinality: notAllowed,
      description: 'Not allowed (0..0)',
    });
    
    // Custom: Only for repeatable elements
    presets.push({
      label: 'Custom',
      icon: '⋯',
      cardinality: { min: -1, max: '' }, // Sentinel value
      description: 'Custom cardinality…',
    });
  }
  
  return presets;
}

/**
 * Check if two cardinalities are equal
 */
export function isCardinalityEqual(a: Cardinality, b: Cardinality): boolean {
  return a.min === b.min && a.max === b.max;
}

/**
 * Check if a node should show cardinality mode controls
 * 
 * @param role - Node role (root | backbone | leaf)
 * @param baseCardinality - Base cardinality
 * @returns true if cardinality mode should be enabled for this node
 */
export function shouldEnableCardinalityMode(
  role: 'root' | 'backbone' | 'leaf',
  baseCardinality: Cardinality
): boolean {
  // Only leaf nodes can use cardinality mode
  if (role !== 'leaf') return false;
  
  // Check if there are any valid presets
  const presets = getCardinalityPresets(baseCardinality);
  
  // Need at least 2 presets (excluding current state) for meaningful choice
  return presets.length > 0;
}

export interface CardinalityPreset {
  label: string;
  icon: string;
  cardinality: Cardinality;
  description: string;
}
