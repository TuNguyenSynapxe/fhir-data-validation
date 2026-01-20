/**
 * SdTreeView Component
 * 
 * Main tree view component for StructureDefinition element hierarchy.
 * 
 * Features:
 * - Hierarchical element tree display
 * - Progressive disclosure (Minimal/Full/Expert)
 * - Expand/Collapse controls
 * - Visual state indicators
 * - Selection handling (EPIC 3.5: slice-aware)
 */

import React, { useMemo } from 'react';
import { ChevronsRight, ChevronsDown } from 'lucide-react';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import { buildTree, applyVisibilityMode } from '../../utils/treeBuilder';
import { TreeNode } from './TreeNode';
import { BulkCardinalityMenu } from './BulkCardinalityMenu';

export const SdTreeView: React.FC = () => {
  const design = useSdBuilderStore((state) => state.design);
  const expandedPaths = useSdBuilderStore((state) => state.expandedPaths);
  const selection = useSdBuilderStore((state) => state.selection); // EPIC 3.5: Selection object
  const visibilityMode = useSdBuilderStore((state) => state.visibilityMode);
  const isCardinalityModeEnabled = useSdBuilderStore((state) => state.isCardinalityModeEnabled);
  
  const toggleExpand = useSdBuilderStore((state) => state.toggleExpand);
  const expandAll = useSdBuilderStore((state) => state.expandAll);
  const collapseAll = useSdBuilderStore((state) => state.collapseAll);
  const selectNode = useSdBuilderStore((state) => state.selectNode);
  const setVisibilityMode = useSdBuilderStore((state) => state.setVisibilityMode);
  const toggleCardinalityMode = useSdBuilderStore((state) => state.toggleCardinalityMode);

  // Build tree from flat elements
  const treeNodes = useMemo(() => {
    if (!design) return [];
    
    const rawTree = buildTree(design.elements);
    
    // In Minimal mode with Cardinality Mode enabled, show all nodes for editing
    if (visibilityMode === 'Minimal' && isCardinalityModeEnabled) {
      return applyVisibilityMode(rawTree, 'Full');
    }
    
    return applyVisibilityMode(rawTree, visibilityMode);
  }, [design, visibilityMode, isCardinalityModeEnabled]);

  if (!design) {
    return (
      <div className="sd-tree-view-empty">
        <p>No session started</p>
      </div>
    );
  }

  return (
    <div className="sd-tree-view">
      {/* Tree Header */}
      <div className="tree-header">
        <div className="tree-title">
          <strong>{design.resourceType}</strong>
          <span className="element-count">
            ({design.elements.filter(e => {
              const current = e.overrideCardinality ?? e.baseCardinality;
              return current.max !== '0';
            }).length} allowed)
          </span>
        </div>

        {/* Visibility Mode Segmented Toggle */}
        <div className="visibility-mode-toggle" role="tablist" aria-label="View mode">
          <button
            role="tab"
            aria-selected={visibilityMode === 'Minimal'}
            onClick={() => setVisibilityMode('Minimal')}
            className={`mode-segment ${visibilityMode === 'Minimal' ? 'active' : ''}`}
            title="Show allowed elements only"
          >
            Minimal
          </button>
          <button
            role="tab"
            aria-selected={visibilityMode === 'Full'}
            onClick={() => setVisibilityMode('Full')}
            className={`mode-segment ${visibilityMode === 'Full' ? 'active' : ''}`}
            title="Show all elements"
          >
            Full
          </button>
        </div>

        {/* Cardinality Mode Toggle */}
        <button
          onClick={toggleCardinalityMode}
          className={`cardinality-mode-toggle ${isCardinalityModeEnabled ? 'active' : ''}`}
          title="Enable quick cardinality editing for leaf elements"
        >
          {isCardinalityModeEnabled ? '✓ ' : ''}Cardinality Mode
        </button>
        
        {/* Bulk Actions Menu (only when Cardinality Mode is ON) */}
        {isCardinalityModeEnabled && (
          <BulkCardinalityMenu treeNodes={treeNodes} />
        )}

        {/* Expand/Collapse Controls */}
        <div className="tree-controls">
          <button
            onClick={expandAll}
            title="Expand All"
            className="control-button"
          >
            <ChevronsDown size={16} />
          </button>
          <button
            onClick={collapseAll}
            title="Collapse All"
            className="control-button"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="tree-content">
        {treeNodes.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            isExpanded={expandedPaths.has(node.path)}
            isSelected={isNodeSelected(selection, node)} // EPIC 3.5: Match by selection object
            selection={selection}
            onToggleExpand={toggleExpand}
            onSelect={selectNode}
            expandedPaths={expandedPaths}
          />
        ))}
      </div>
    </div>
  );
};

// EPIC 3.5: Helper to determine if a node is selected based on selection object
function isNodeSelected(selection: any, node: any): boolean {
  if (!selection) return false;
  
  if (selection.kind === 'element') {
    // Element selection: match path and ensure it's an element node (not slice)
    return node.path === selection.path && node.kind === 'element' && !node.isSliceChild;
  }
  
  if (selection.kind === 'slice') {
    // Slice selection: match slice name and parent path
    // This handles both 'slice' and 'slice-other' node kinds
    return (node.kind === 'slice' || node.kind === 'slice-other') && 
           node.sliceName === selection.sliceName && 
           node.parentPath === selection.path;
  }
  
  return false;
}
