/**
 * TreeNode Component (Recursive) — EPIC 2 Clean Indicators + EPIC 3.5 Slice-Aware Selection
 * 
 * Renders a single tree node with:
 * - Expand/collapse chevron
 * - Name display
 * - Selection highlighting
 * - Right-aligned icon-only indicators (Required, Binding, Slicing, Error)
 * - Cardinality tooltip (shows in Cardinality mode AND on hover)
 * - Recursive children rendering
 * 
 * EPIC 2 RULE 7: Clean Tree Indicators
 * - Right-aligned, icon-only
 * - No duplicate information (cardinality is source of truth)
 * - Required: min ≥ 1 icon
 * - Binding: icon when binding exists
 * - Slicing: glyph when slicing configured
 * - Error: badge when validation error
 * 
 * EPIC 3.5: Slice-Aware Selection
 * - Element nodes emit { kind: 'element', path }
 * - Slice nodes emit { kind: 'slice', path, sliceName }
 * - No string parsing in component
 * 
 * CARDINALITY-FIRST DESIGN:
 * - Visual states derived from currentCardinality
 * - Root: Never greyed, no cardinality display
 * - Backbone: Never greyed (structural containers)
 * - Leaf: May show Required/Optional/Not allowed states
 */

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Link, AlertCircle, Layers, Scissors } from 'lucide-react';
import type { TreeNode as TreeNodeType } from '../../types/treeNode';
import type { SdBuilderSelection } from '../../types/sdBuilderSelection';
import { getBindingExplanation, isPreviewable } from '../../constants/bindingExplanations';
import { CardinalityPresets } from './CardinalityPresets';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import { BindingTooltip } from './BindingTooltip';
import { CardinalityTooltip } from './CardinalityTooltip';
import type { BindingConfig } from '../../api/sdBuilderApi';
import { previewValueSetCodes, getPreviewability, type ValueSetPreviewability } from '../../api/terminologyApi';

interface TreeNodeProps {
  node: TreeNodeType;
  isExpanded: boolean;
  isSelected: boolean;
  selection: SdBuilderSelection | null; // EPIC 3.5: Selection object
  onToggleExpand: (nodeId: string) => void; // Use node ID for slice isolation
  onSelect: (selection: SdBuilderSelection) => void; // EPIC 3.5: Emit selection object
  expandedNodes: Set<string>; // Node IDs (includes slice IDs)
}

// Helper to get the active binding (override takes precedence)
function getActiveBinding(node: TreeNodeType): { binding: BindingConfig; isOverride: boolean } | null {
  const { baseBinding, overrideBinding } = node.elementDesign;
  
  if (overrideBinding) {
    return { binding: overrideBinding, isOverride: true };
  }
  
  if (baseBinding) {
    return { binding: baseBinding, isOverride: false };
  }
  
  return null;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  isExpanded,
  isSelected,
  selection,
  onToggleExpand,
  onSelect,
  expandedNodes,
}) => {
  const isCardinalityModeEnabled = useSdBuilderStore((state) => state.isCardinalityModeEnabled);
  const [showBindingTooltip, setShowBindingTooltip] = useState(false);
  const [showCardinalityTooltip, setShowCardinalityTooltip] = useState(false);
  const [previewability, setPreviewability] = useState<ValueSetPreviewability>('Unsupported');
  
  const bindingInfo = getActiveBinding(node);

  // Fetch previewability when binding exists
  useEffect(() => {
    if (!bindingInfo) return;

    let cancelled = false;

    const fetchPreviewability = async () => {
      try {
        const preview = await previewValueSetCodes(bindingInfo.binding.valueSetUrl, 1);
        if (!cancelled) {
          setPreviewability(getPreviewability(preview));
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewability('Unsupported');
        }
      }
    };

    fetchPreviewability();

    return () => {
      cancelled = true;
    };
  }, [bindingInfo?.binding.valueSetUrl]);
  
  if (!node.isVisible) return null;

  // EPIC 3.5 + EPIC 4: Handle click based on node kind
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Selection based on node kind
    switch (node.kind) {
      case 'slice':
        // Slice node: emit slice selection
        if (node.sliceName && node.parentPath) {
          onSelect({ kind: 'slice', path: node.parentPath, sliceName: node.sliceName });
        }
        break;
        
      case 'slice-other':
        // "Other (unsliced)" node: emit slice selection with 'other' slice name
        if (node.parentPath) {
          onSelect({ kind: 'slice', path: node.parentPath, sliceName: 'other' });
        }
        break;
        
      case 'element':
        // Check if this is a slice child (element under slice context)
        if (node.isSliceChild && node.sliceContext && node.parent?.parentPath) {
          // Slice child: select the parent slice
          onSelect({ kind: 'slice', path: node.parent.parentPath, sliceName: node.sliceContext });
        } else {
          // Regular element node: emit element selection
          onSelect({ kind: 'element', path: node.path });
        }
        break;
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isExpandable) {
      onToggleExpand(node.id); // Use node.id for slice isolation
    }
  };

  // Apply visual classes based on node role and cardinality
  const isGreyedOut = node.role === 'leaf' && node.isNotAllowed;
  const isStrikethrough = node.role === 'leaf' && node.isNotAllowed;

  // Get tooltip text based on previewability
  const getBindingTooltipText = (): string => {
    const explanation = getBindingExplanation(previewability);
    const preview = isPreviewable(previewability) ? 'preview available' : 'no offline preview';
    return `Binding: ${explanation.label} (${preview})`;
  };

  return (
    <div className="tree-node">
      {/* Node Row */}
      <div
        className={`tree-node-row ${isSelected ? 'selected' : ''} ${isGreyedOut ? 'not-allowed' : ''} ${node.isRequired ? 'is-required' : ''}`}
        style={{ paddingLeft: `${node.depth * 16 + 4}px` }}
        onClick={handleClick}
      >
        {/* LEFT SIDE: Chevron + Name */}
        <div className="tree-node-left">
          {/* Chevron */}
          <div 
            className="tree-node-chevron"
            onClick={handleChevronClick}
          >
            {node.isExpandable ? (
              isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )
            ) : (
              <span className="tree-node-spacer" />
            )}
          </div>

          {/* Name with visual indicators for slice/slice child nodes */}
          <span className={`tree-node-name ${isStrikethrough ? 'strikethrough' : ''} ${node.kind === 'slice' || node.kind === 'slice-other' ? 'text-purple-700 font-medium' : ''} ${node.isSliceChild ? 'text-gray-600' : ''}`}>
            {/* EPIC 3: Slice icon */}
            {node.kind === 'slice' && <Scissors size={14} className="inline mr-1.5 text-purple-600" />}
            
            {/* EPIC 4: "Other" node icon */}
            {node.kind === 'slice-other' && <Scissors size={14} className="inline mr-1.5 text-gray-500" />}
            
            {/* EPIC 4: Slice child indicator */}
            {node.isSliceChild && <span className="inline mr-1.5 text-gray-400">↳</span>}
            
            {node.name}
            
            {/* EPIC 4: Slice context badge (optional, for clarity) */}
            {node.isSliceChild && node.sliceContext && node.sliceContext !== 'other' && (
              <span className="text-[10px] ml-1.5 px-1 py-0.5 bg-gray-100 text-gray-500 rounded" title={`In slice: ${node.sliceContext}`}>
                {node.sliceContext}
              </span>
            )}
          </span>
        </div>

        {/* RIGHT SIDE: EPIC 2 Clean Icon-Only Indicators + Cardinality */}
        <div className="tree-node-right flex items-center gap-2">
          {/* EPIC 2 RULE 7: Icon-Only Indicators */}
          
          {/* Required Indicator (min ≥ 1) */}
          {node.isRequired && !isCardinalityModeEnabled && (
            <span
              className="text-red-500"
              title="Required (min ≥ 1)"
            >
              <AlertCircle size={14} />
            </span>
          )}

          {/* Binding Indicator */}
          {!isCardinalityModeEnabled && bindingInfo && (
            <div 
              className="binding-icon-indicator"
              onMouseEnter={() => setShowBindingTooltip(true)}
              onMouseLeave={() => setShowBindingTooltip(false)}
              title={getBindingTooltipText()}
            >
              <Link size={12} className="text-blue-500" />
              {showBindingTooltip && (
                <BindingTooltip 
                  binding={bindingInfo.binding}
                  isOverride={bindingInfo.isOverride}
                />
              )}
            </div>
          )}

          {/* Slicing Indicator */}
          {node.elementDesign.slicing && !isCardinalityModeEnabled && (
            <span
              className="text-purple-500"
              title="Slicing configured"
            >
              <Layers size={14} />
            </span>
          )}

          {/* Cardinality Badge (leaf nodes only) — EPIC 2 RULE 8: Show tooltip on hover AND in mode */}
          {node.role === 'leaf' && (
            <div 
              className="cardinality-container"
              onMouseEnter={() => setShowCardinalityTooltip(true)}
              onMouseLeave={() => setShowCardinalityTooltip(false)}
            >
              <span 
                className={`tree-node-cardinality ${node.baseCardinality.min === 1 && node.baseCardinality.max === '1' ? 'fixed' : ''} ${node.isRequired ? 'required' : ''}`}
              >
                {node.currentCardinality.min}..{node.currentCardinality.max}
              </span>
              {showCardinalityTooltip && (
                <CardinalityTooltip
                  currentCardinality={node.currentCardinality}
                  baseCardinality={node.baseCardinality}
                  isFixed={node.baseCardinality.min === 1 && node.baseCardinality.max === '1'}
                />
              )}
            </div>
          )}

          {/* Slice Count */}
          {node.sliceCount > 0 && (
            <span className="tree-node-slice-count">+{node.sliceCount}</span>
          )}

          {/* Cardinality Presets (leaf nodes only, when mode is ON) */}
          {node.role === 'leaf' && isCardinalityModeEnabled && (
            <CardinalityPresets node={node} isSelected={isSelected} />
          )}
        </div>
      </div>

      {/* Children (recursive) */}
      {isExpanded && node.children.length > 0 && (
        <div className="tree-node-children">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              isExpanded={expandedNodes.has(child.id)} // Use node.id for slice isolation
              isSelected={child.id === selectedNodeId(selection, child)} // EPIC 3.5: Match by selection
              selection={selection}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// EPIC 3.5: Helper to determine if a node is selected based on selection object
function selectedNodeId(selection: SdBuilderSelection | null, node: TreeNodeType): boolean {
  if (!selection) return false;
  
  if (selection.kind === 'element') {
    return node.path === selection.path && !node.isSlice;
  }
  
  if (selection.kind === 'slice') {
    return node.isSlice && node.sliceName === selection.sliceName && node.parentPath === selection.path;
  }
  
  return false;
}
