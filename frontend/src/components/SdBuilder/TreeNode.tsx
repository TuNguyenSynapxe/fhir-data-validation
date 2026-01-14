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

import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { TreeNode as TreeNodeType } from '../../types/treeNode';
import { CardinalityPresets } from './CardinalityPresets';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';

interface TreeNodeProps {
  node: TreeNodeType;
  isExpanded: boolean;
  isSelected: boolean;
  selectedPath: string | null;
  onToggleExpand: (path: string) => void;
  onSelect: (path: string) => void;
  expandedPaths: Set<string>;
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

  return (
    <div className="tree-node">
      {/* Node Row */}
      <div
        className={`tree-node-row ${isSelected ? 'selected' : ''} ${isGreyedOut ? 'not-allowed' : ''}`}
        style={{ paddingLeft: `${node.depth * 16 + 4}px` }}
        onClick={handleClick}
      >
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

        {/* State Icons (cardinality-derived) */}
        <div className="tree-node-icons">
          {node.isRequired && <span className="icon-required" title="Required (min ≥ 1)">●</span>}
          {node.isRepeatable && <span className="icon-repeatable" title="Repeatable (max = *)">[]</span>}
          {node.hasCardinalityOverride && <span className="icon-modified" title="Cardinality override">✎</span>}
          {node.hasSlicing && <span className="icon-sliced" title="Sliced">⧉</span>}
        </div>

        {/* Name */}
        <span className={`tree-node-name ${isStrikethrough ? 'strikethrough' : ''}`}>
          {node.name}
        </span>

        {/* Cardinality Badge (leaf nodes only) */}
        {node.role === 'leaf' && (
          <span 
            className={`tree-node-cardinality ${node.baseCardinality.min === 1 && node.baseCardinality.max === '1' ? 'fixed' : ''}`}
            title={
              node.baseCardinality.min === 1 && node.baseCardinality.max === '1'
                ? 'Cardinality fixed by base FHIR specification'
                : `${node.currentCardinality.min}..${node.currentCardinality.max}`
            }
          >
            {node.currentCardinality.min}..{node.currentCardinality.max}
          </span>
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
