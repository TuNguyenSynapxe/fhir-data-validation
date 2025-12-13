import React, { useState, useEffect } from 'react';
import CoverageStatusBadge from './CoverageStatusBadge';
import CoverageTooltip from './CoverageTooltip';
import type { CoverageNode } from '../types/ruleCoverage';

/**
 * FhirSchemaTreeViewWithCoverage - Enhanced schema tree with coverage visualization
 * 
 * Requirements:
 * - Display FHIR R4 schema tree
 * - Show coverage status per node (green/blue/grey)
 * - Display tooltip with coverage reason
 * - Read-only visualization (no rule creation)
 * - Do not modify existing rule builder
 * 
 * UX:
 * - Lightweight indicators next to each node
 * - Hover for coverage details
 * - No popups, no modals
 * 
 * Constraints:
 * - React + existing tree component
 * - No business logic in UI
 * - Coverage data comes from props (no API calls)
 */
interface FhirSchemaTreeViewWithCoverageProps {
  resourceType: string;
  onSelectPath: (path: string) => void;
  coverageNodes?: CoverageNode[]; // Optional coverage data
}

interface SchemaElement {
  path: string;
  name: string;
  type: string[];
  cardinality: string;
  children?: SchemaElement[];
}

const FhirSchemaTreeViewWithCoverage: React.FC<FhirSchemaTreeViewWithCoverageProps> = ({
  resourceType,
  onSelectPath,
  coverageNodes,
}) => {
  const [schemaData, setSchemaData] = useState<SchemaElement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string>('');

  // Build coverage map for O(1) lookups
  const coverageMap = React.useMemo(() => {
    if (!coverageNodes) return new Map<string, CoverageNode>();
    
    const map = new Map<string, CoverageNode>();
    coverageNodes.forEach(node => {
      // Normalize path for matching (remove resource prefix if present)
      const normalizedPath = node.path.startsWith(`${resourceType}.`)
        ? node.path.substring(resourceType.length + 1)
        : node.path;
      map.set(normalizedPath, node);
    });
    return map;
  }, [coverageNodes, resourceType]);

  useEffect(() => {
    if (!resourceType) return;

    const fetchSchema = async () => {
      setLoading(true);
      setError(null);
      setSchemaData([]);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/fhir/schema/${resourceType}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const tree = convertBackendSchemaToFrontend(data);
        setSchemaData(tree);
        
        // Auto-expand root level
        if (tree.length > 0) {
          setExpandedNodes(new Set([tree[0].path]));
        }
      } catch (err) {
        console.error('Error fetching FHIR schema:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [resourceType]);

  const convertBackendSchemaToFrontend = (backendNode: any): SchemaElement[] => {
    if (!backendNode) return [];

    const convertNode = (node: any): SchemaElement => {
      const cardinality = `${node.min || 0}..${node.max || '1'}`;
      const types = node.isChoice && node.choiceTypes?.length > 0
        ? node.choiceTypes
        : [node.type || 'Element'];

      const frontendNode: SchemaElement = {
        path: node.path || '',
        name: node.elementName || '',
        type: types,
        cardinality: cardinality,
        children: [],
      };

      if (node.children && Array.isArray(node.children)) {
        frontendNode.children = node.children.map((child: any) => convertNode(child));
      }

      return frontendNode;
    };

    return [convertNode(backendNode)];
  };

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

  const handleSelectNode = (element: SchemaElement) => {
    const pathParts = element.path.split('.');
    const relativePath = pathParts.slice(1).join('.');
    
    setSelectedPath(element.path);
    onSelectPath(relativePath || element.path);
  };

  const getCoverageForPath = (path: string): CoverageNode | undefined => {
    // Get relative path for coverage lookup
    const pathParts = path.split('.');
    const relativePath = pathParts.slice(1).join('.');
    return coverageMap.get(relativePath || path);
  };

  const renderNode = (element: SchemaElement, level: number = 0) => {
    const hasChildren = element.children && element.children.length > 0;
    const isExpanded = expandedNodes.has(element.path);
    const isSelected = selectedPath === element.path;

    const typeDisplay = element.type && element.type.length > 0 
      ? element.type.join(' | ') 
      : 'Element';

    const cardinalityColor = element.cardinality.startsWith('1') 
      ? 'text-red-600' 
      : 'text-gray-500';

    // Get coverage for this node
    const coverage = getCoverageForPath(element.path);

    return (
      <div key={element.path}>
        <div
          className={`flex items-center py-1.5 px-2 hover:bg-blue-50 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 border-l-2 border-blue-600' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              toggleNode(element.path);
            }
            handleSelectNode(element);
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <span className="mr-2 text-gray-500 w-4 h-4 flex items-center justify-center flex-shrink-0">
              {isExpanded ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          ) : (
            <span className="mr-2 w-4 flex-shrink-0" />
          )}

          {/* Coverage Status Badge */}
          {coverage ? (
            <CoverageTooltip coverageNode={coverage}>
              <div className="mr-2 flex-shrink-0">
                <CoverageStatusBadge 
                  status={coverage.status} 
                  matchType={coverage.matchType} 
                />
              </div>
            </CoverageTooltip>
          ) : (
            <span className="mr-2 w-2.5 flex-shrink-0" />
          )}

          {/* Element Name */}
          <span className="flex-1 text-sm font-medium text-gray-900 min-w-0">
            {element.name}
          </span>

          {/* Type */}
          <span className="text-xs text-gray-500 mx-2 truncate max-w-[120px]" title={typeDisplay}>
            {typeDisplay}
          </span>

          {/* Cardinality */}
          <span className={`text-xs font-mono ${cardinalityColor} ml-2 flex-shrink-0`}>
            {element.cardinality}
          </span>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && element.children && (
          <div>
            {element.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600 mt-3">Loading FHIR R4 schema for {resourceType}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-red-800">Failed to load schema</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!schemaData || schemaData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
        <p className="text-sm">No schema elements found for {resourceType}.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-md bg-white">
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700">
          FHIR R4 Schema: {resourceType}
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          Click on any element to select its FHIRPath
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="flex items-center">
            <span className="font-mono text-red-600 mr-1">1..*</span>
            <span className="text-gray-600">Required</span>
          </span>
          <span className="flex items-center">
            <span className="font-mono text-gray-500 mr-1">0..*</span>
            <span className="text-gray-600">Optional</span>
          </span>
        </div>
        
        {/* Coverage Legend */}
        {coverageNodes && coverageNodes.length > 0 && (
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-300 text-xs">
            <span className="font-medium text-gray-700">Coverage:</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              <span className="text-gray-600">Covered</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-gray-600">Suggested</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
              <span className="text-gray-600">Uncovered</span>
            </span>
          </div>
        )}
      </div>
      <div className="p-2 max-h-96 overflow-y-auto">
        {schemaData.map((element) => renderNode(element))}
      </div>
      {selectedPath && (
        <div className="p-3 bg-blue-50 border-t border-blue-200">
          <p className="text-xs text-blue-800">
            <span className="font-medium">Selected:</span>{' '}
            <code className="bg-white px-2 py-1 rounded text-blue-900">{selectedPath}</code>
          </p>
        </div>
      )}
    </div>
  );
};

export default FhirSchemaTreeViewWithCoverage;
