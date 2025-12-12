import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileJson, Braces, Hash, Type, CheckSquare } from 'lucide-react';

interface NodeData {
  key: string;
  value: any;
  path: string[];
  jsonPointer: string;
  fhirPath: string;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
}

interface BundleTreeProps {
  bundleJson: string;
  onNodeSelect?: (path: string) => void;
  selectedPath?: string;
}

/**
 * Utility: Compute JSON Pointer from path array
 * Example: ['entry', 0, 'resource', 'name', 0, 'family'] => '/entry/0/resource/name/0/family'
 */
const computeJsonPointer = (pathArray: (string | number)[]): string => {
  if (pathArray.length === 0) return '';
  return '/' + pathArray.map(segment => String(segment).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
};

/**
 * Utility: Compute FHIRPath from path array
 * Example: ['entry', 0, 'resource', 'name', 0, 'family'] => 'entry[0].resource.name[0].family'
 */
const computeFhirPath = (pathArray: (string | number)[]): string => {
  if (pathArray.length === 0) return '';
  
  return pathArray.map((segment, index) => {
    if (typeof segment === 'number') {
      // Numeric index: append as [n] to previous segment
      return `[${segment}]`;
    } else {
      // String key: add dot separator except for first element
      const prefix = index === 0 ? '' : '.';
      return `${prefix}${segment}`;
    }
  }).join('').replace(/\.\[/g, '['); // Clean up ".[" to just "["
};

/**
 * Get type icon for value
 */
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

/**
 * Get value type
 */
const getValueType = (value: any): NodeData['type'] => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as NodeData['type'];
};

/**
 * Format value preview for display
 */
const formatValuePreview = (value: any, type: NodeData['type']): string => {
  if (type === 'null') return 'null';
  if (type === 'string') return `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"`;
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'number') return String(value);
  if (type === 'array') return `Array[${value.length}]`;
  if (type === 'object') return `{${Object.keys(value).length} properties}`;
  return '';
};

/**
 * Recursive TreeNode component
 */
interface TreeNodeProps {
  nodeKey: string | number;
  value: any;
  path: (string | number)[];
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: (nodeData: NodeData) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  nodeKey,
  value,
  path,
  level,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
}) => {
  const type = getValueType(value);
  const hasChildren = type === 'object' || type === 'array';
  const jsonPointer = computeJsonPointer(path);
  const fhirPath = computeFhirPath(path);

  const handleClick = () => {
    if (hasChildren) {
      onToggle();
    }
    onSelect({
      key: String(nodeKey),
      value,
      path,
      jsonPointer,
      fhirPath,
      type,
    });
  };

  const renderChildren = () => {
    if (!hasChildren || !isExpanded) return null;

    if (type === 'array') {
      return (value as any[]).map((item, index) => (
        <TreeNodeWrapper
          key={index}
          nodeKey={index}
          value={item}
          path={[...path, index]}
          level={level + 1}
          onSelect={onSelect}
        />
      ));
    }

    if (type === 'object') {
      return Object.entries(value).map(([key, val]) => (
        <TreeNodeWrapper
          key={key}
          nodeKey={key}
          value={val}
          path={[...path, key]}
          level={level + 1}
          onSelect={onSelect}
        />
      ));
    }

    return null;
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-100 border-l-2 border-blue-600' : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleClick}
      >
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

        <span className="mr-1.5">{getTypeIcon(type)}</span>

        <span className="text-sm font-mono font-medium text-gray-800">
          {typeof nodeKey === 'number' ? `[${nodeKey}]` : nodeKey}
        </span>

        {!hasChildren && (
          <span className="ml-2 text-xs text-gray-500 truncate">
            : {formatValuePreview(value, type)}
          </span>
        )}

        {hasChildren && (
          <span className="ml-2 text-xs text-gray-400">
            {formatValuePreview(value, type)}
          </span>
        )}
      </div>

      {renderChildren()}
    </div>
  );
};

/**
 * TreeNode wrapper with expansion state management
 */
const TreeNodeWrapper: React.FC<Omit<TreeNodeProps, 'isExpanded' | 'isSelected' | 'onToggle'> & {
  onSelect: (nodeData: NodeData) => void;
}> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedJsonPointer, setSelectedJsonPointer] = useState<string>('');

  const jsonPointer = computeJsonPointer(props.path);
  const isSelected = selectedJsonPointer === jsonPointer;

  const handleSelect = (nodeData: NodeData) => {
    setSelectedJsonPointer(nodeData.jsonPointer);
    props.onSelect(nodeData);
  };

  return (
    <TreeNode
      {...props}
      isExpanded={isExpanded}
      isSelected={isSelected}
      onToggle={() => setIsExpanded(!isExpanded)}
      onSelect={handleSelect}
    />
  );
};

/**
 * Main BundleTree component
 */
export const BundleTree: React.FC<BundleTreeProps> = ({
  bundleJson,
  onNodeSelect,
  selectedPath,
}) => {
  const [selectedJsonPointer, setSelectedJsonPointer] = useState<string>('');

  const parsedBundle = useMemo(() => {
    try {
      return JSON.parse(bundleJson || '{}');
    } catch {
      return null;
    }
  }, [bundleJson]);

  const handleNodeSelect = (nodeData: NodeData) => {
    setSelectedJsonPointer(nodeData.jsonPointer);
    onNodeSelect?.(nodeData.jsonPointer);
  };

  if (!parsedBundle) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center p-6">
          <FileJson className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-sm font-medium text-red-600">Invalid JSON</p>
          <p className="text-xs text-gray-500 mt-1">Unable to parse bundle</p>
        </div>
      </div>
    );
  }

  const isEmpty = Object.keys(parsedBundle).length === 0;

  if (isEmpty) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center p-6">
          <Braces className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-600">Empty Bundle</p>
          <p className="text-xs text-gray-500 mt-1">No data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Bundle Structure
        </span>
        <span className="text-xs text-gray-500">
          {Object.keys(parsedBundle).length} properties
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="py-1">
          {Object.entries(parsedBundle).map(([key, value]) => (
            <TreeNodeWrapper
              key={key}
              nodeKey={key}
              value={value}
              path={[key]}
              level={0}
              onSelect={handleNodeSelect}
            />
          ))}
        </div>
      </div>

      {selectedJsonPointer && (
        <div className="border-t bg-gray-50 px-3 py-2 flex-shrink-0">
          <div className="text-xs">
            <span className="font-semibold text-gray-600">Path:</span>
            <code className="ml-2 text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
              {selectedJsonPointer}
            </code>
          </div>
        </div>
      )}
    </div>
  );
};
