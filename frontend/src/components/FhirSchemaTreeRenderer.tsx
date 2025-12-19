import { useState, useEffect } from 'react';
import { fetchFhirSchema, type FhirSchemaNodeResponse } from '../api/fhirSchemaApi';
import { isPrimitiveType, isPrimitiveInternalNode, isExtensionNode } from '../utils/schemaEligibility';

/**
 * FhirSchemaTreeRenderer - Reusable FHIR schema tree traversal component
 * 
 * Extracts tree traversal logic from FhirSchemaTreeViewWithCoverage
 * Accepts custom node renderer via render prop pattern
 * 
 * CRITICAL: Uses dedicated FHIR schema API with strict guardrails.
 * No silent fallbacks. Fails loudly on invalid schema responses.
 * 
 * Responsibilities:
 * - Fetch FHIR StructureDefinition from validated endpoint
 * - Convert backend schema to frontend format
 * - Manage expansion state
 * - Provide node context (level, expanded, selected)
 * - Call custom renderer for each node
 * 
 * Does NOT:
 * - Render nodes (delegated to renderNode prop)
 * - Handle coverage (can be passed via renderNode)
 * - Manage rule intents (handled by parent)
 * - Allow silent fallback rendering
 */

export interface SchemaElement {
  path: string;
  name: string;
  type: string[];
  cardinality: string;
  children?: SchemaElement[];
  // Eligibility metadata
  isPrimitive?: boolean;
  parentElement?: SchemaElement;
}

export interface NodeRenderContext {
  element: SchemaElement;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  hasChildren: boolean;
  parent?: SchemaElement | null;
}

interface FhirSchemaTreeRendererProps {
  resourceType: string;
  version?: "R4" | "R5";
  onSelectPath?: (path: string) => void;
  renderNode: (context: NodeRenderContext) => React.ReactNode;
  hideAdvancedInternals?: boolean; // Presentation-only filter
  hideExtensions?: boolean; // Presentation-only filter for extensions
}

const FhirSchemaTreeRenderer: React.FC<FhirSchemaTreeRendererProps> = ({
  resourceType,
  version = "R4",
  onSelectPath,
  renderNode,
  hideAdvancedInternals = true, // Default to hiding
  hideExtensions = true, // Default to hiding extensions
}) => {
  const [schemaData, setSchemaData] = useState<SchemaElement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string>('');

  // Fetch FHIR schema on mount or when resourceType/version changes
  useEffect(() => {
    const fetchSchema = async () => {
      setLoading(true);
      setError(null);
      setSchemaData([]); // Clear previous data

      try {
        // Use dedicated schema API with strict validation
        const schemaNode = await fetchFhirSchema(resourceType, version);
        
        // Convert FhirSchemaNode to SchemaElement tree format
        const converted = convertFhirSchemaNodeToTree(schemaNode);
        setSchemaData(converted);

        // Auto-expand root
        if (converted.length > 0) {
          setExpandedNodes(new Set([converted[0].path]));
        }
      } catch (err) {
        // Error is already detailed from fetchFhirSchema
        const errorMessage = err instanceof Error 
          ? err.message 
          : `Unknown error loading schema for ${resourceType}`;
        setError(errorMessage);
        setSchemaData([]); // Ensure no partial data
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [resourceType, version]);

  /**
   * Convert validated FhirSchemaNode to SchemaElement tree format
   * 
   * CRITICAL: This function only receives validated FhirSchemaNode responses.
   * No fallback logic. If input is invalid, the error should have been caught earlier.
   */
  const convertFhirSchemaNodeToTree = (
    node: FhirSchemaNodeResponse
  ): SchemaElement[] => {
    const convertNode = (fhirNode: FhirSchemaNodeResponse, parent?: SchemaElement): SchemaElement => {
      // Determine types to display
      const types = fhirNode.isChoice && fhirNode.choiceTypes.length > 0
        ? fhirNode.choiceTypes
        : [fhirNode.type || 'Element'];
      
      const cardinality = `${fhirNode.min}..${fhirNode.max}`;
      
      // Determine primary type for primitive check (first type if choice)
      const primaryType = types[0] || 'Element';

      const element: SchemaElement = {
        path: fhirNode.path,
        name: fhirNode.elementName || fhirNode.path.split('.').pop() || fhirNode.path,
        type: types,
        cardinality: cardinality,
        // Eligibility metadata
        isPrimitive: isPrimitiveType(primaryType),
        parentElement: parent,
      };

      // Recursively convert children with parent reference
      if (fhirNode.children && fhirNode.children.length > 0) {
        element.children = fhirNode.children.map(child => convertNode(child, element));
      }

      return element;
    };

    return [convertNode(node)];
  };

  // Toggle node expansion
  const toggleNode = (nodePath: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodePath)) {
        newSet.delete(nodePath);
      } else {
        newSet.add(nodePath);
      }
      return newSet;
    });
  };

  // Handle node selection
  const handleSelectNode = (element: SchemaElement) => {
    setSelectedPath(element.path);
    
    if (onSelectPath) {
      const pathParts = element.path.split('.');
      const relativePath = pathParts.slice(1).join('.');
      onSelectPath(relativePath || element.path);
    }
  };

  // Recursive render
  const renderTree = (element: SchemaElement, level: number = 0, parent?: SchemaElement | null): React.ReactNode => {
    // PRESENTATION FILTER: Hide extensions if toggle is on
    if (hideExtensions && isExtensionNode(element)) {
      return null; // Skip rendering, but data structure is unchanged
    }
    
    // PRESENTATION FILTER: Hide primitive internals if toggle is on
    if (hideAdvancedInternals && isPrimitiveInternalNode(element, parent)) {
      return null; // Skip rendering, but data structure is unchanged
    }

    const hasChildren = !!(element.children && element.children.length > 0);
    const isExpanded = expandedNodes.has(element.path);
    const isSelected = selectedPath === element.path;

    const context: NodeRenderContext = {
      element,
      level,
      isExpanded,
      isSelected,
      hasChildren,
      onToggle: () => toggleNode(element.path),
      onSelect: () => handleSelectNode(element),
      parent: parent,
    };

    return (
      <div key={element.path}>
        {renderNode(context)}
        
        {/* Children */}
        {hasChildren && isExpanded && element.children && (
          <div>
            {element.children.map((child) => renderTree(child, level + 1, element))}
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600 mt-3">Loading FHIR R4 schema for {resourceType}...</p>
      </div>
    );
  }

  // Error state - No silent failures
  if (error) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-300 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-red-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-base font-semibold text-red-900 mb-2">
              Unable to load FHIR schema for {resourceType}
            </h4>
            <p className="text-sm text-red-800 leading-relaxed mb-3">
              {error}
            </p>
            <div className="text-xs text-red-700 bg-red-100 px-3 py-2 rounded border border-red-200">
              <strong>Technical Details:</strong>
              <br />
              Resource: <code className="font-mono">{resourceType}</code>
              <br />
              Version: <code className="font-mono">{version}</code>
              <br />
              Expected: Valid FHIR StructureDefinition with snapshot.element array
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - Should never happen if validation passed
  // If we reach here, something is wrong with the conversion logic
  if (schemaData.length === 0) {
    return (
      <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-amber-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-base font-semibold text-amber-900 mb-2">
              Schema data conversion issue
            </h4>
            <p className="text-sm text-amber-800">
              The schema response was valid, but no tree nodes were generated.
              This indicates a problem with the schema conversion logic.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render tree
  // Note: hideAdvancedInternals and hideExtensions are captured in renderTree closure
  // React will re-render when these props change
  return (
    <div className="fhir-schema-tree" key={`tree-${hideAdvancedInternals}-${hideExtensions}`}>
      {schemaData.map((root) => renderTree(root, 0))}
    </div>
  );
};

export default FhirSchemaTreeRenderer;
