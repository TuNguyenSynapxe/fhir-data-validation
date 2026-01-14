/**
 * Bulk Cardinality Action Helpers
 * 
 * Implements FHIR-correct bulk cardinality operations.
 * 
 * RULES:
 * - Only leaf nodes are eligible
 * - Must respect base cardinality boundaries
 * - No semantic flags - cardinality is the single source of truth
 */

import type { TreeNode, Cardinality } from '../types/treeNode';

export type BulkActionType = 'optional-to-notallowed' | 'required-to-optional' | 'reset-to-base';

export interface BulkActionPreview {
  affectedElements: Array<{
    path: string;
    name: string;
    currentCardinality: Cardinality;
    targetCardinality: Cardinality;
  }>;
  skippedCount: number;
}

export interface BulkAction {
  type: BulkActionType;
  label: string;
  preview: BulkActionPreview;
}

/**
 * Check if target cardinality respects base cardinality boundary
 */
function isWithinBaseBoundary(
  targetMin: number,
  targetMax: string,
  baseMin: number,
  baseMax: string
): boolean {
  // Min must be >= base.min
  if (targetMin < baseMin) return false;
  
  // Max must be <= base.max
  if (baseMax === '*') return true; // Base allows any max
  if (targetMax === '*') return false; // Target is unbounded but base isn't
  
  const targetMaxNum = parseInt(targetMax, 10);
  const baseMaxNum = parseInt(baseMax, 10);
  
  return targetMaxNum <= baseMaxNum;
}

/**
 * Collect all leaf nodes from tree
 */
function collectLeafNodes(nodes: TreeNode[]): TreeNode[] {
  const leaves: TreeNode[] = [];
  
  function traverse(node: TreeNode) {
    if (node.role === 'leaf') {
      leaves.push(node);
    }
    node.children.forEach(traverse);
  }
  
  nodes.forEach(traverse);
  return leaves;
}

/**
 * Action 1: Optional → Not allowed (0..0)
 */
function getOptionalToNotAllowedPreview(leaves: TreeNode[]): BulkActionPreview {
  const affected: BulkActionPreview['affectedElements'] = [];
  let skipped = 0;
  
  for (const leaf of leaves) {
    const current = leaf.currentCardinality;
    
    // Eligibility: current.min === 0 AND current.max !== "0"
    const isOptional = current.min === 0 && current.max !== '0';
    if (!isOptional) continue;
    
    // Target: 0..0
    const targetMin = 0;
    const targetMax = '0';
    
    // Check base boundary
    if (!isWithinBaseBoundary(targetMin, targetMax, leaf.baseCardinality.min, leaf.baseCardinality.max)) {
      skipped++;
      continue;
    }
    
    // Skip if already in target state
    if (current.min === targetMin && current.max === targetMax) continue;
    
    affected.push({
      path: leaf.path,
      name: leaf.name,
      currentCardinality: current,
      targetCardinality: { min: targetMin, max: targetMax },
    });
  }
  
  return { affectedElements: affected, skippedCount: skipped };
}

/**
 * Action 2: Required → Optional (0..base.max)
 */
function getRequiredToOptionalPreview(leaves: TreeNode[]): BulkActionPreview {
  const affected: BulkActionPreview['affectedElements'] = [];
  let skipped = 0;
  
  for (const leaf of leaves) {
    const current = leaf.currentCardinality;
    
    // Eligibility: current.min >= 1
    const isRequired = current.min >= 1;
    if (!isRequired) continue;
    
    // Target: 0..base.max
    const targetMin = 0;
    const targetMax = leaf.baseCardinality.max;
    
    // Check base boundary (should always pass since we're using base.max)
    if (!isWithinBaseBoundary(targetMin, targetMax, leaf.baseCardinality.min, leaf.baseCardinality.max)) {
      skipped++;
      continue;
    }
    
    // Skip if already in target state
    if (current.min === targetMin && current.max === targetMax) continue;
    
    affected.push({
      path: leaf.path,
      name: leaf.name,
      currentCardinality: current,
      targetCardinality: { min: targetMin, max: targetMax },
    });
  }
  
  return { affectedElements: affected, skippedCount: skipped };
}

/**
 * Action 3: Reset to Base
 */
function getResetToBasePreview(leaves: TreeNode[]): BulkActionPreview {
  const affected: BulkActionPreview['affectedElements'] = [];
  let skipped = 0;
  
  for (const leaf of leaves) {
    const current = leaf.currentCardinality;
    const base = leaf.baseCardinality;
    
    // Eligibility: has override (current !== base)
    const hasOverride = current.min !== base.min || current.max !== base.max;
    if (!hasOverride) continue;
    
    // Target: base cardinality (always valid by definition)
    affected.push({
      path: leaf.path,
      name: leaf.name,
      currentCardinality: current,
      targetCardinality: base,
    });
  }
  
  return { affectedElements: affected, skippedCount: skipped };
}

/**
 * Get all available bulk actions with previews
 */
export function getBulkActions(treeNodes: TreeNode[]): BulkAction[] {
  const leaves = collectLeafNodes(treeNodes);
  
  return [
    {
      type: 'optional-to-notallowed',
      label: 'Optional → Not allowed',
      preview: getOptionalToNotAllowedPreview(leaves),
    },
    {
      type: 'required-to-optional',
      label: 'Required → Optional',
      preview: getRequiredToOptionalPreview(leaves),
    },
    {
      type: 'reset-to-base',
      label: 'Reset all to Base',
      preview: getResetToBasePreview(leaves),
    },
  ].filter(action => action.preview.affectedElements.length > 0); // Only show actions with eligible elements
}
