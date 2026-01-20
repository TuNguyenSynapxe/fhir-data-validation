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
 * EPIC 4: Strict FHIR Slicing Semantics
 * - When element has slicing: NO direct children under parent
 * - Parent becomes configuration-only container
 * - Slices are siblings (never nested)
 * - Each slice has mirrored children from base element
 * - "Other (unsliced)" node for open matching
 */

import type { ElementDesign } from '../api/sdBuilderApi';
import type { TreeNode, VisibilityMode, NodeRole, Cardinality, TreeNodeKind } from '../types/treeNode';

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
 * 
 * IMPORTANT: This recursively mirrors children but NEVER attempts to create slicing
 * within slice children (slices cannot be nested).
 */
function createSliceChildNode(sourceNode: TreeNode, sliceParent: TreeNode, sliceName: string): TreeNode {
  const sliceChildId = `${sliceParent.id}::child::${sourceNode.name}`;
  
  const sliceChild: TreeNode = {
    ...sourceNode,
    id: sliceChildId,
    kind: 'element', // Slice children are element nodes in slice context
    parent: sliceParent,
    depth: sliceParent.depth + 1,
    
    // Mark as slice child for visual differentiation
    isSliceChild: true,
    sliceContext: sliceName,
    
    // Recursively mirror children (but NEVER render slicing within slice children)
    children: sourceNode.children.map(grandChild => 
      createSliceChildNode(grandChild, sliceParent, sliceName)
    ),
  };
  
  return sliceChild;
}

/**
 * Build hierarchical tree from flat FHIR elements
 * 
 * EPIC 4: Strict FHIR Slicing Semantics
 * - Elements with slicing do NOT render direct children
 * - Only slice nodes (and optionally "Other" node) appear as children
 * - Slices are always siblings, never nested
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
      kind: 'element', // All base nodes are element kind
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
  // IMPORTANT: Only build relationships for non-sliced parents
  // Sliced parents will get slice nodes as children in Phase 3
  const rootNodes: TreeNode[] = [];
  
  nodeMap.forEach(node => {
    const parentPath = getParentPath(node.path);
    
    if (parentPath) {
      const parent = nodeMap.get(parentPath);
      if (parent) {
        // Check if parent has slicing - if so, do NOT add this as a direct child
        const parentHasSlicing = parent.elementDesign.slicing && 
                                Object.keys(parent.elementDesign.slices).length > 0;
        
        if (!parentHasSlicing) {
          // Normal parent-child relationship
          node.parent = parent;
          parent.children.push(node);
          parent.isExpandable = true;
        }
        // If parent has slicing, this child will be added under slice nodes in Phase 3
      }
    } else {
      rootNodes.push(node);  // Top-level resource
    }
  });
  
  // Phase 3: Inject slice nodes for elements with slicing
  // This replaces direct children with slice structure
  nodeMap.forEach(node => {
    const element = node.elementDesign;
    
    // Check if element has slicing with slices
    if (element.slicing && element.slices && Object.keys(element.slices).length > 0) {
      const slices = element.slices;
      const slicingRules = element.slicing;
      
      // Clear any direct children (they should not have been added due to Phase 2 guard)
      node.children = [];
      
      // Get base children that would have been under this element
      const baseChildren = getDirectChildrenOf(element.path, elements, nodeMap);
      
      // Determine matching rule (normalize to lowercase)
      const matching = slicingRules.rules.toLowerCase();
      
      // Helper function to create "Other (unsliced)" node
      const createUnslicedNode = (): TreeNode => {
        const otherNodeId = `${element.path}::slice::other`;
        
        const otherNode: TreeNode = {
          id: otherNodeId,
          path: element.path,
          name: 'Other (unsliced)',
          kind: 'slice-other',
          parent: node,
          children: [], // Will be populated below
          depth: node.depth + 1,
          role: baseChildren.length > 0 ? 'backbone' : 'leaf',
          
          // Slice-specific properties
          isSlice: true, // For backward compatibility
          sliceName: 'other',
          parentPath: element.path,
          
          // Reference to parent element design
          elementDesign: element,
          
          // Type codes for binding eligibility
          typeCodes: node.typeCodes,
          
          // Cardinality from base element
          baseCardinality: element.baseCardinality,
          currentCardinality: element.baseCardinality,
          
          // Derived state
          isRepeatable: element.baseCardinality.max === '*',
          isRequired: element.baseCardinality.min >= 1,
          isOptional: element.baseCardinality.min === 0,
          isNotAllowed: element.baseCardinality.max === '0',
          
          // Modifications
          hasCardinalityOverride: false,
          hasBinding: false,
          hasSlicing: false,
          sliceCount: 0,
          
          // Visual state
          isVisible: true,
          isExpandable: baseChildren.length > 0,
        };
        
        // Mirror base children under "Other" node
        if (baseChildren.length > 0) {
          otherNode.children = baseChildren.map(childNode => 
            createSliceChildNode(childNode, otherNode, 'other')
          );
        }
        
        return otherNode;
      };
      
      // Build slice nodes array
      const sliceNodes: TreeNode[] = [];
      
      // Create virtual slice nodes (siblings, never nested)
      Object.entries(slices).forEach(([sliceName, sliceDesign]) => {
        const sliceNodeId = `${element.path}::slice::${sliceName}`;
        
        const sliceNode: TreeNode = {
          id: sliceNodeId,
          path: element.path,
          name: (sliceDesign as any).metadata?.shortLabel || sliceName, // Backend returns camelCase
          kind: 'slice',
          parent: node,
          children: [], // Will be populated below
          depth: node.depth + 1,
          role: baseChildren.length > 0 ? 'backbone' : 'leaf',
          
          // Slice-specific properties
          isSlice: true,
          sliceName,
          parentPath: element.path,
          
          // Reference to parent element design
          elementDesign: element,
          
          // Type codes for binding eligibility
          typeCodes: node.typeCodes,
          
          // Cardinality from slice override or inherit from parent
          baseCardinality: element.baseCardinality,
          currentCardinality: (sliceDesign as any).overrideCardinality || element.baseCardinality, // Backend returns camelCase
          
          // Derived state
          isRepeatable: ((sliceDesign as any).overrideCardinality?.max || element.baseCardinality.max) === '*',
          isRequired: ((sliceDesign as any).overrideCardinality?.min || element.baseCardinality.min) >= 1,
          isOptional: ((sliceDesign as any).overrideCardinality?.min || element.baseCardinality.min) === 0,
          isNotAllowed: ((sliceDesign as any).overrideCardinality?.max || element.baseCardinality.max) === '0',
          
          // Modifications
          hasCardinalityOverride: !!(sliceDesign as any).overrideCardinality, // Backend returns camelCase
          hasBinding: false,
          hasSlicing: false,
          sliceCount: 0,
          
          // Visual state
          isVisible: true,
          isExpandable: baseChildren.length > 0,
        };
        
        // Mirror parent element's children as slice children
        if (baseChildren.length > 0) {
          sliceNode.children = baseChildren.map(childNode => 
            createSliceChildNode(childNode, sliceNode, sliceName)
          );
        }
        
        sliceNodes.push(sliceNode);
      });
      
      // Apply FHIR slicing matching rules
      switch (matching) {
        case 'closed':
          // closed: Only slice nodes, NO unsliced node
          node.children = sliceNodes;
          break;
          
        case 'open':
          // open: Unsliced node + slice nodes (order not enforced)
          node.children = [createUnslicedNode(), ...sliceNodes];
          break;
          
        case 'openatend':
          // openAtEnd: Slice nodes first, then unsliced node LAST
          node.children = [...sliceNodes, createUnslicedNode()];
          break;
          
        default:
          // Fallback: treat as open for safety
          console.warn(`Unknown slicing matching rule: ${matching}. Treating as 'open'.`);
          node.children = [createUnslicedNode(), ...sliceNodes];
          break;
      }
      
      node.isExpandable = true;
    }
  });
  
  // Phase 4: Sort children by path for consistent order
  // IMPORTANT: For sliced elements, preserve matching rule order (set in Phase 3)
  nodeMap.forEach(node => {
    const element = node.elementDesign;
    const hasSlicing = element.slicing && Object.keys(element.slices).length > 0;
    
    // Only sort non-sliced children
    // Sliced children order is controlled by matching rules in Phase 3
    if (!hasSlicing) {
      node.children.sort((a, b) => {
        return a.path.localeCompare(b.path);
      });
    } else {
      // For sliced elements, only sort slice nodes alphabetically
      // but preserve unsliced node position based on matching rule
      const matching = element.slicing?.rules.toLowerCase() || 'open';
      
      if (matching === 'closed') {
        // Only slice nodes, sort alphabetically
        node.children.sort((a, b) => a.name.localeCompare(b.name));
      } else if (matching === 'open') {
        // Unsliced first (already positioned), sort slices only
        const unslicedNode = node.children.find(c => c.kind === 'slice-other');
        const sliceNodes = node.children.filter(c => c.kind === 'slice');
        sliceNodes.sort((a, b) => a.name.localeCompare(b.name));
        node.children = unslicedNode ? [unslicedNode, ...sliceNodes] : sliceNodes;
      } else if (matching === 'openatend') {
        // Slices first (sorted), unsliced last
        const unslicedNode = node.children.find(c => c.kind === 'slice-other');
        const sliceNodes = node.children.filter(c => c.kind === 'slice');
        sliceNodes.sort((a, b) => a.name.localeCompare(b.name));
        node.children = unslicedNode ? [...sliceNodes, unslicedNode] : sliceNodes;
      }
    }
  });
  
  return rootNodes;
}

/**
 * Get direct children of an element path (immediate children only)
 * Used to build base children for slice mirroring
 */
function getDirectChildrenOf(elementPath: string, allElements: ElementDesign[], nodeMap: Map<string, TreeNode>): TreeNode[] {
  const childPrefix = elementPath + '.';
  const targetDepth = elementPath.split('.').length + 1;
  
  const children: TreeNode[] = [];
  
  allElements.forEach(element => {
    if (element.path.startsWith(childPrefix) && element.path.split('.').length === targetDepth) {
      const childNode = nodeMap.get(element.path);
      if (childNode && childNode.kind === 'element') {
        children.push(childNode);
      }
    }
  });
  
  return children;
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
