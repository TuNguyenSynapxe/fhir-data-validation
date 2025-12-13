import React, { useState, useMemo } from 'react';

interface BundleTreeViewProps {
  bundleJson: string;
  onSelectPath: (path: string) => void;
  resourceTypeFilter?: string; // Filter to show only specific resource type
}

interface TreeNode {
  key: string;
  label: string;
  path: string;
  value?: any;
  children?: TreeNode[];
  isArray?: boolean;
  isPrimitive?: boolean;
}

const BundleTreeView: React.FC<BundleTreeViewProps> = ({ bundleJson, onSelectPath, resourceTypeFilter }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string>('');

  // Parse bundle and build tree structure
  const treeData = useMemo(() => {
    try {
      const bundle = JSON.parse(bundleJson);
      if (!bundle.entry || !Array.isArray(bundle.entry)) {
        return [];
      }

      return bundle.entry
        .filter((entry: any) => {
          if (!entry.resource || !entry.resource.resourceType) return false;
          // Filter by resource type if specified
          if (resourceTypeFilter && entry.resource.resourceType !== resourceTypeFilter) return false;
          return true;
        })
        .map((entry: any, entryIndex: number) => {
          const resource = entry.resource;
          const resourceType = resource.resourceType;

          return {
            key: `entry-${entryIndex}`,
            label: `${resourceType} (entry[${entryIndex}])`,
            path: resourceType,
            value: resource,
            children: buildTreeFromObject(resource, `${resourceType}`),
          };
        });
    } catch (error) {
      console.error('Failed to parse bundle JSON:', error);
      return [];
    }
  }, [bundleJson, resourceTypeFilter]);

  // Build tree nodes from object recursively
  function buildTreeFromObject(
    obj: any,
    parentPath: string,
    depth: number = 0
  ): TreeNode[] {
    if (!obj || typeof obj !== 'object' || depth > 10) {
      return [];
    }

    const nodes: TreeNode[] = [];
    const keys = Object.keys(obj).filter(
      (key) => !['meta', 'text', 'contained', 'resourceType'].includes(key)
    );

    for (const key of keys) {
      const value = obj[key];
      const nodeKey = `${parentPath}.${key}`;

      // Handle arrays
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const arrayPath = `${key}[${index}]`;
          const arrayNodeKey = `${nodeKey}[${index}]`;

          if (item && typeof item === 'object') {
            // Complex object in array
            nodes.push({
              key: arrayNodeKey,
              label: `${key}[${index}]`,
              path: `${parentPath}.${arrayPath}`,
              value: item,
              isArray: true,
              children: buildTreeFromObject(item, `${parentPath}.${arrayPath}`, depth + 1),
            });
          } else {
            // Primitive value in array
            nodes.push({
              key: arrayNodeKey,
              label: `${key}[${index}]`,
              path: `${parentPath}.${arrayPath}`,
              value: item,
              isArray: true,
              isPrimitive: true,
            });
          }
        });
      }
      // Handle objects
      else if (value && typeof value === 'object') {
        nodes.push({
          key: nodeKey,
          label: key,
          path: `${parentPath}.${key}`,
          value: value,
          children: buildTreeFromObject(value, `${parentPath}.${key}`, depth + 1),
        });
      }
      // Handle primitives
      else {
        nodes.push({
          key: nodeKey,
          label: key,
          path: `${parentPath}.${key}`,
          value: value,
          isPrimitive: true,
        });
      }
    }

    return nodes;
  }

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeKey)) {
        newSet.delete(nodeKey);
      } else {
        newSet.add(nodeKey);
      }
      return newSet;
    });
  };

  const handleSelectNode = (node: TreeNode) => {
    // Extract path relative to resource type (remove resourceType prefix)
    const pathParts = node.path.split('.');
    const relativePath = pathParts.slice(1).join('.');
    
    setSelectedPath(node.path);
    onSelectPath(relativePath);
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.key);
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.key} className="select-none">
        <div
          className={`flex items-center py-1 px-2 hover:bg-blue-50 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 border-l-2 border-blue-600' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              toggleNode(node.key);
            }
            handleSelectNode(node);
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <span className="mr-2 text-gray-500 w-4 h-4 flex items-center justify-center">
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
            <span className="mr-2 w-4" />
          )}

          {/* Node Label */}
          <span className="flex-1 text-sm">
            <span className={`font-medium ${node.isPrimitive ? 'text-gray-700' : 'text-gray-900'}`}>
              {node.label}
            </span>
            {node.isPrimitive && node.value !== undefined && node.value !== null && (
              <span className="ml-2 text-xs text-gray-500">
                = <span className="italic">"{String(node.value)}"</span>
              </span>
            )}
          </span>

          {/* Type Badge */}
          {!node.isPrimitive && (
            <span className="text-xs text-gray-400 ml-2">
              {node.isArray ? 'array' : 'object'}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!treeData || treeData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
        <p className="text-sm">
          {resourceTypeFilter 
            ? `No ${resourceTypeFilter} resources found in bundle.`
            : 'No resources found in bundle.'
          }
        </p>
        <p className="text-xs mt-1">
          {resourceTypeFilter
            ? `The bundle does not contain any ${resourceTypeFilter} resources.`
            : 'Please provide a valid FHIR R4 bundle with entries.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-md bg-white">
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700">
          {resourceTypeFilter ? `${resourceTypeFilter} Resources` : 'Bundle Resources'}
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          Click on any element to select its FHIRPath
        </p>
      </div>
      <div className="p-2 max-h-96 overflow-y-auto">
        {treeData.map((node: TreeNode) => renderNode(node))}
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

export default BundleTreeView;
