/**
 * Tree Building Utilities
 * 
 * Convert flat FHIR element list to hierarchical tree structure.
 * 
 * CARDINALITY-FIRST DESIGN:
 * - All semantic states derived from cardinality
 * - No isIncluded/isExcluded storage
 * - Node roles: root | backbone | leaf
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
      hasBinding: element.binding !== null,
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
  
  // Phase 3: Sort children by path for consistent order
  nodeMap.forEach(node => {
    node.children.sort((a, b) => a.path.localeCompare(b.path));
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
