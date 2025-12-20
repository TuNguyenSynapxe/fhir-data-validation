import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Braces, Hash, Type, CheckSquare, FileJson } from 'lucide-react';

interface BundleTreeViewProps {
  bundleJson: string;
  onSelectPath: (path: string) => void;
  resourceTypeFilter?: string; // Filter to show only specific resource type
}

interface TreeNode {
  key: string;
  label: string;
  path: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  children?: TreeNode[];
  isArray?: boolean;
  isPrimitive?: boolean;
}

const BundleTreeView: React.FC<BundleTreeViewProps> = ({ bundleJson, onSelectPath, resourceTypeFilter }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string>('');

  // Get type icon for value
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'object':
        return <Braces className="w-3.5 h-3.5 text-purple-500" />;
      case 'array':
        return <Braces className="w-3.5 h-3.5 text-blue-500" />;
      case 'string':
        return <Type className="w-3.5 h-3.5 text-green-600" />;
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-orange-600" />;
      case 'boolean':
        return <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <FileJson className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  // Get value type
  const getValueType = (value: any): TreeNode['type'] => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value as TreeNode['type'];
  };

  // Format value preview for display
  const formatValuePreview = (value: any, type: TreeNode['type']): string => {
    if (type === 'null') return 'null';
    if (type === 'string') return `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"`;
    if (type === 'boolean') return value ? 'true' : 'false';
    if (type === 'number') return String(value);
    if (type === 'array') return `Array[${value.length}]`;
    if (type === 'object') return `{${Object.keys(value).length} properties}`;
    return '';
  };

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
      const valueType = getValueType(value);

      // Handle arrays - Create parent array node with children
      if (Array.isArray(value)) {
        const arrayChildren: TreeNode[] = value.map((item, index) => {
          const arrayPath = `${key}[${index}]`;
          const arrayNodeKey = `${nodeKey}[${index}]`;
          const itemType = getValueType(item);

          if (item && typeof item === 'object') {
            // Complex object in array
            return {
              key: arrayNodeKey,
              label: `[${index}]`,
              path: `${parentPath}.${arrayPath}`,
              value: item,
              type: itemType,
              isArray: true,
              children: buildTreeFromObject(item, `${parentPath}.${arrayPath}`, depth + 1),
            };
          } else {
            // Primitive value in array
            return {
              key: arrayNodeKey,
              label: `[${index}]`,
              path: `${parentPath}.${arrayPath}`,
              value: item,
              type: itemType,
              isArray: true,
              isPrimitive: true,
            };
          }
        });

        // Push parent array node with index children
        nodes.push({
          key: nodeKey,
          label: key,
          path: `${parentPath}.${key}`,
          value: value,
          type: valueType,
          isArray: true,
          children: arrayChildren,
        });
      }
      // Handle objects
      else if (value && typeof value === 'object') {
        nodes.push({
          key: nodeKey,
          label: key,
          path: `${parentPath}.${key}`,
          value: value,
          type: valueType,
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
          type: valueType,
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
          className={`flex items-center py-1 px-2 cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 border-l-2 border-blue-600' : 'hover:bg-gray-50'
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
            <button className="mr-1 p-0.5 hover:bg-gray-200 rounded">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              )}
            </button>
          ) : (
            <span className="w-4 mr-1" />
          )}

          {/* Type Icon */}
          <span className="mr-1.5">{getTypeIcon(node.type)}</span>

          {/* Node Label */}
          <span className="text-sm font-mono font-medium text-gray-800">
            {node.label}
          </span>

          {/* Value Preview for Primitives */}
          {!hasChildren && (
            <span className="ml-2 text-xs text-gray-500 truncate">
              : {formatValuePreview(node.value, node.type)}
            </span>
          )}

          {/* Count for Objects/Arrays */}
          {hasChildren && (
            <span className="ml-2 text-xs text-gray-400">
              {formatValuePreview(node.value, node.type)}
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
