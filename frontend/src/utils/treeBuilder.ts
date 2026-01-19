/**
 * Tree Building Utilities
 * 
 * Convert flat FHIR element list to hierarchical tree structure.
 * 
 * CARDINALITY-FIRST DESIGN:
 * - All semantic states derived from cardinality
 * - No isIncluded/isExcluded storage
 * - Node roles: root | backbone | leaf
 * 
 * EPIC 4: Slice Children
 * - Slice nodes mirror parent element's children
 * - Slice children are virtual, read-only representations
 */

import type { ElementDesign } from '../api/sdBuilderApi';
import type { TreeNode, VisibilityMode, NodeRole, Cardinality } from '../types/treeNode';

/**
 * Determine node role based on position and children
 */
function getNodeRole(element: ElementDesign, hasChildren: boolean): NodeRole {
  const segments = element.path.split('.');
  if (segments.length === 1) return 'root';
  return hasChildren ? 'backbone' : 'leaf';
}

/**
 * Get current cardinality (overridden or base)
 */
function getCurrentCardinality(element: ElementDesign): Cardinality {
  return element.overrideCardinality ?? element.baseCardinality;
}

/**
 * Derive semantic state from cardinality
 */
function deriveSemanticState(cardinality: Cardinality) {
  const isNotAllowed = cardinality.max === '0';
  const isRequired = cardinality.min >= 1 && !isNotAllowed;
  const isOptional = cardinality.min === 0 && !isNotAllowed;
  const isRepeatable = cardinality.max === '*';
  
  return { isNotAllowed, isRequired, isOptional, isRepeatable };
}

/**
 * EPIC 4: Create slice child node (virtual mirror of parent element child)
 * 
 * These are read-only representations showing the same structure under slice context.
 * Selection behavior: Clicking a slice child selects the slice, not the base element.
 */
function createSliceChildNode(sourceNode: TreeNode, sliceParent: TreeNode, sliceName: string): TreeNode {
  const sliceChildId = `${sliceParent.id}::child::${sourceNode.name}`;
  
  const sliceChild: TreeNode = {
    ...sourceNode,
    id: sliceChildId,
    parent: sliceParent,
    depth: sliceParent.depth + 1,
    
    // Mark as slice child for visual differentiation
    isSliceChild: true,
    sliceContext: sliceName,
    
    // Recursively mirror children
    children: sourceNode.children.map(grandChild => 
      createSliceChildNode(grandChild, sliceParent, sliceName)
    ),
  };
  
  return sliceChild;
}

/**
 * Build hierarchical tree from flat FHIR elements
 */
export function buildTree(elements: ElementDesign[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  
  // Phase 1: Create nodes for all elements
  elements.forEach(element => {
    const segments = element.path.split('.');
    const name = segments[segments.length - 1];
    const hasChildren = hasChildElements(element, elements);
    const role = getNodeRole(element, hasChildren);
    
    const currentCardinality = getCurrentCardinality(element);
    const semanticState = deriveSemanticState(currentCardinality);
    
    const node: TreeNode = {
      id: element.path,
      path: element.path,
      name,
      parent: null,
      children: [],
      depth: segments.length - 1,
      role,
      elementDesign: element,
      
      // Cardinality (source of truth)
      baseCardinality: element.baseCardinality,
      currentCardinality,
      
      // Derived semantic state
      ...semanticState,
      
      // Modifications
      hasCardinalityOverride: element.overrideCardinality !== null,
      hasBinding: element.overrideBinding !== null || element.baseBinding !== null,
      hasSlicing: element.slicing !== null,
      sliceCount: element.slices.length,
      
      // Visual state
      isVisible: true,
      isExpandable: false,
    };
    
    nodeMap.set(element.path, node);
  });
  
  // Phase 2: Build parent-child relationships
  const rootNodes: TreeNode[] = [];
  
  nodeMap.forEach(node => {
    const parentPath = getParentPath(node.path);
    
    if (parentPath) {
      const parent = nodeMap.get(parentPath);
      if (parent) {
        node.parent = parent;
        parent.children.push(node);
        parent.isExpandable = true;
      }
    } else {
      rootNodes.push(node);  // Top-level resource
    }
  });
  
  // Phase 3: Inject slice nodes for elements with slicing (EPIC 3 + EPIC 4)
  nodeMap.forEach(node => {
    const element = node.elementDesign;
    
    // Check if element has slicing with slices
    if (element.slicing && element.slices && Object.keys(element.slices).length > 0) {
      const slices = element.slices;
      
      // Create virtual slice nodes
      Object.entries(slices).forEach(([sliceName, sliceDesign]) => {
        const sliceNodeId = `${element.path}::slice::${sliceName}`;
        
        const sliceNode: TreeNode = {
          id: sliceNodeId,
          path: element.path,
          name: (sliceDesign as any).Metadata?.ShortLabel || sliceName,
          parent: node,
          children: [], // EPIC 4: Will be populated below
          depth: node.depth + 1,
          role: node.children.length > 0 ? 'backbone' : 'leaf', // EPIC 4: Backbone if has children
          
          // Slice-specific properties
          isSlice: true,
          sliceName,
          parentPath: element.path,
          
          // Reference to parent element design (slices don't have separate elementDesign)
          elementDesign: element,
          
          // Type codes for binding eligibility
          typeCodes: node.typeCodes,
          
          // Cardinality from slice override or inherit from parent
          baseCardinality: element.baseCardinality,
          currentCardinality: (sliceDesign as any).OverrideCardinality || element.baseCardinality,
          
          // Derived state
          isRepeatable: ((sliceDesign as any).OverrideCardinality?.max || element.baseCardinality.max) === '*',
          isRequired: ((sliceDesign as any).OverrideCardinality?.min || element.baseCardinality.min) >= 1,
          isOptional: ((sliceDesign as any).OverrideCardinality?.min || element.baseCardinality.min) === 0,
          isNotAllowed: ((sliceDesign as any).OverrideCardinality?.max || element.baseCardinality.max) === '0',
          
          // Modifications
          hasCardinalityOverride: !!(sliceDesign as any).OverrideCardinality,
          hasBinding: false,
          hasSlicing: false,
          sliceCount: 0,
          
          // Visual state
          isVisible: true,
          isExpandable: node.children.length > 0, // EPIC 4: Expandable if parent has children
        };
        
        // EPIC 4: Mirror parent element's children as slice children
        // These are virtual nodes representing the same structure under a slice context
        if (node.children.length > 0) {
          sliceNode.children = node.children.map(childNode => 
            createSliceChildNode(childNode, sliceNode, sliceName)
          );
        }
        
        // Add slice node as child of sliced element
        node.children.push(sliceNode);
        node.isExpandable = true;
      });
    }
  });
  
  // Phase 4: Sort children by path for consistent order (slices will sort after regular children)
  nodeMap.forEach(node => {
    node.children.sort((a, b) => {
      // Slice nodes sort after regular nodes, then by name
      if (a.isSlice && !b.isSlice) return 1;
      if (!a.isSlice && b.isSlice) return -1;
      if (a.isSlice && b.isSlice) return a.name.localeCompare(b.name);
      return a.path.localeCompare(b.path);
    });
  });
  
  return rootNodes;
}

/**
 * Get parent path from FHIR element path
 */
function getParentPath(path: string): string | null {
  const segments = path.split('.');
  return segments.length > 1 
    ? segments.slice(0, -1).join('.') 
    : null;
}

/**
 * Check if element has child elements
 */
function hasChildElements(element: ElementDesign, allElements: ElementDesign[]): boolean {
  const childPrefix = element.path + '.';
  const targetDepth = element.path.split('.').length + 1;
  
  return allElements.some(e => 
    e.path.startsWith(childPrefix) && 
    e.path.split('.').length === targetDepth
  );
}

/**
 * Apply visibility filtering based on mode
 * 
 * RULES:
 * - Minimal: Show structural nodes + leaf nodes where max !== "0"
 * - Full: Show all nodes
 * - Expert: Show all nodes + internals (id, extension, modifierExtension)
 */
export function applyVisibilityMode(
  nodes: TreeNode[], 
  mode: VisibilityMode
): TreeNode[] {
  return nodes.map(node => {
    const updatedNode = { ...node };
    
    switch (mode) {
      case 'Minimal':
        // Show structural nodes (root + backbone) OR leaf nodes that are allowed
        if (node.role === 'root' || node.role === 'backbone') {
          // Always show structural nodes
          updatedNode.isVisible = true;
        } else {
          // Leaf: show only if not excluded (max !== "0")
          updatedNode.isVisible = !node.isNotAllowed;
        }
        
        // Show parents if they have visible children
        if (node.role !== 'leaf' && !hasVisibleChildren(node, mode)) {
          updatedNode.isVisible = false;
        }
        break;
        
      case 'Full':
        // Show all elements
        updatedNode.isVisible = true;
        break;
        
      case 'Expert':
        // Show everything including internals
        updatedNode.isVisible = true;
        break;
    }
    
    // Recursively apply to children
    updatedNode.children = applyVisibilityMode(node.children, mode);
    
    return updatedNode;
  });
}

/**
 * Check if node has any visible children in given mode
 */
function hasVisibleChildren(node: TreeNode, mode: VisibilityMode): boolean {
  if (node.children.length === 0) return false;
  
  return node.children.some(child => {
    if (mode === 'Minimal') {
      if (child.role === 'root' || child.role === 'backbone') {
        return hasVisibleChildren(child, mode);
      }
      return !child.isNotAllowed;
    }
    return true;
  });
}

/**
 * Find node by path in tree
 */
export function findNodeByPath(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    
    const found = findNodeByPath(node.children, path);
    if (found) return found;
  }
  
  return null;
}

/**
 * Get all paths in tree (for expand all)
 */
export function getAllPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = [];
  
  function traverse(node: TreeNode) {
    paths.push(node.path);
    node.children.forEach(traverse);
  }
  
  nodes.forEach(traverse);
  return paths;
}
