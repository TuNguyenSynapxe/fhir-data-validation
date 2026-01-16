/**
 * TreeNode Component (Recursive)
 * 
 * Renders a single tree node with:
 * - Expand/collapse chevron
 * - Visual state indicators (cardinality-derived)
 * - Name display
 * - Selection highlighting
 * - Recursive children rendering
 * 
 * CARDINALITY-FIRST DESIGN:
 * - Visual states derived from currentCardinality
 * - Root: Never greyed, no cardinality display
 * - Backbone: Never greyed (structural containers)
 * - Leaf: May show Required/Optional/Not allowed states
 */

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Link } from 'lucide-react';
import type { TreeNode as TreeNodeType } from '../../types/treeNode';
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
  selectedPath: string | null;
  onToggleExpand: (path: string) => void;
  onSelect: (path: string) => void;
  expandedPaths: Set<string>;
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
  selectedPath,
  onToggleExpand,
  onSelect,
  expandedPaths,
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isExpandable) {
      onToggleExpand(node.path);
    }
  };

  // Apply visual classes based on node role and cardinality
  const isGreyedOut = node.role === 'leaf' && node.isNotAllowed;
  const isStrikethrough = node.role === 'leaf' && node.isNotAllowed;

  // Get tooltip text based on previewability
  const getBindingTooltipText = (): string => {
    switch (previewability) {
      case 'Computed':
      case 'Explicit':
        return 'Binding: Local expansion available';
      case 'External':
        return 'Binding: External standard (no preview)';
      case 'Unsupported':
        return 'Binding: Complex ValueSet (no preview)';
      default:
        return 'Binding';
    }
  };

  return (
    <div className="tree-node">
      {/* Node Row */}
      <div
        className={`tree-node-row ${isSelected ? 'selected' : ''} ${isGreyedOut ? 'not-allowed' : ''} ${node.isRequired ? 'is-required' : ''}`}
        style={{ paddingLeft: `${node.depth * 16 + 4}px` }}
        onClick={handleClick}
      >
        {/* LEFT SIDE: Chevron + Name + Binding Icon */}
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

          {/* Name */}
          <span className={`tree-node-name ${isStrikethrough ? 'strikethrough' : ''}`}>
            {node.name}
          </span>

          {/* Binding Icon with Tooltip (after name, hidden in Cardinality Mode) */}
          {!isCardinalityModeEnabled && bindingInfo && (
            <div 
              className="binding-icon-container"
              onMouseEnter={() => setShowBindingTooltip(true)}
              onMouseLeave={() => setShowBindingTooltip(false)}
              title={getBindingTooltipText()}
            >
              <Link size={12} className="binding-link-icon" />
              {showBindingTooltip && (
                <BindingTooltip 
                  binding={bindingInfo.binding}
                  isOverride={bindingInfo.isOverride}
                />
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDE: Cardinality only */}
        <div className="tree-node-right">
          {/* Cardinality Badge (leaf nodes only) */}
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
              isExpanded={expandedPaths.has(child.path)}
              isSelected={selectedPath === child.path}
              selectedPath={selectedPath}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              expandedPaths={expandedPaths}
            />
          ))}
        </div>
      )}
    </div>
  );
};
