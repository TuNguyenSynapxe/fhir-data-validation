import React, { useState, useEffect } from 'react';

interface FhirSchemaTreeViewProps {
  resourceType: string;
  onSelectPath: (path: string) => void;
}

interface SchemaElement {
  path: string;
  name: string;
  type: string[];
  cardinality: string;
  children?: SchemaElement[];
}

const FhirSchemaTreeView: React.FC<FhirSchemaTreeViewProps> = ({ resourceType, onSelectPath }) => {
  const [schemaData, setSchemaData] = useState<SchemaElement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string>('');

  useEffect(() => {
    console.log('FhirSchemaTreeView: useEffect triggered, resourceType:', resourceType);
    if (!resourceType) {
      console.log('FhirSchemaTreeView: No resourceType provided, skipping fetch');
      return;
    }

    const fetchSchema = async () => {
      setLoading(true);
      setError(null);
      setSchemaData([]);

      try {
        // Use direct backend URL to bypass proxy issues
        const response = await fetch(`/api/fhir/schema/${resourceType}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('FhirSchemaTreeView: Raw API response:', data);
        
        // The API returns a hierarchical tree structure
        // Convert backend schema format to frontend format
        const tree = convertBackendSchemaToFrontend(data);
        console.log('FhirSchemaTreeView: Converted tree:', tree);
        
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
      // Backend format: { path, elementName, type, min, max, isArray, children }
      // Frontend format: { path, name, type[], cardinality, children }
      
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

      // Recursively convert children
      if (node.children && Array.isArray(node.children)) {
        frontendNode.children = node.children.map((child: any) => convertNode(child));
      }

      return frontendNode;
    };

    // Return array with converted root node
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
    // Generate FHIRPath relative to resource type (remove resourceType prefix)
    const pathParts = element.path.split('.');
    const relativePath = pathParts.slice(1).join('.');
    
    setSelectedPath(element.path);
    onSelectPath(relativePath || element.path);
  };

  const renderNode = (element: SchemaElement, level: number = 0) => {
    const hasChildren = element.children && element.children.length > 0;
    const isExpanded = expandedNodes.has(element.path);
    const isSelected = selectedPath === element.path;

    // Format type display
    const typeDisplay = element.type && element.type.length > 0 
      ? element.type.join(' | ') 
      : 'Element';

    // Format cardinality with color coding
    const cardinalityColor = element.cardinality.startsWith('1') 
      ? 'text-red-600' 
      : 'text-gray-500';

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
            <p className="text-xs text-red-600 mt-2">
              Please ensure the backend API is running and the resource type "{resourceType}" is valid.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!schemaData || schemaData.length === 0) {
    console.log('FhirSchemaTreeView: No schema data to display', { schemaData, loading, error });
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
        <p className="text-sm">No schema elements found for {resourceType}.</p>
        <p className="text-xs text-gray-400 mt-2">Loading: {loading ? 'Yes' : 'No'}, Error: {error || 'None'}</p>
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

export default FhirSchemaTreeView;
