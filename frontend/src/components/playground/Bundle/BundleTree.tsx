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
  const nodeRef = React.useRef<HTMLDivElement>(null);

  // Scroll into view when selected
  React.useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSelected]);

  const handleClick = () => {
    if (hasChildren) {
      onToggle();
    }
    // Always call onSelect - this is needed for smart path navigation
    // The parent will handle whether to update selectedPath
    onSelect({
      key: String(nodeKey),
      value,
      path: path.map(String),
      jsonPointer,
      fhirPath,
      type,
    });
  };

  const renderChildren = () => {
    if (!hasChildren || !isExpanded) return null;

    const collapseKey = (onSelect as any).collapseKey;

    if (type === 'array') {
      return (value as any[]).map((item, index) => (
        <TreeNodeWrapper
          key={index}
          nodeKey={index}
          value={item}
          path={[...path, index]}
          level={level + 1}
          onSelect={onSelect}
          externalSelectedPath={(onSelect as any).externalSelectedPath}
          collapseKey={collapseKey}
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
          externalSelectedPath={(onSelect as any).externalSelectedPath}
          collapseKey={collapseKey}
        />
      ));
    }

    return null;
  };

  return (
    <div>
      <div
        ref={nodeRef}
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
  externalSelectedPath?: string;
  collapseKey?: number;
}> = (props) => {
  const jsonPointer = computeJsonPointer(props.path);
  
  // Auto-expand if this path is an ancestor of the selected path OR if this node is directly selected
  const shouldAutoExpand = props.externalSelectedPath?.startsWith(jsonPointer + '/') || 
                           props.externalSelectedPath === jsonPointer || 
                           false;
  const isSelected = props.externalSelectedPath === jsonPointer;
  
  // Local expansion state
  const [isExpanded, setIsExpanded] = useState(false);
  // Track the last collapseKey we processed - start with undefined to detect first mount
  const lastCollapseKeyRef = React.useRef<number | undefined>(undefined);
  const isFirstMountRef = React.useRef(true);
  // Track pending timer to prevent multiple timers
  const pendingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const pathMatch = props.externalSelectedPath?.startsWith(jsonPointer + '/');
  if (jsonPointer.startsWith('/entry/0')) {
    console.log(`[TreeNodeWrapper] ${jsonPointer}`);
    console.log(`  - isExpanded: ${isExpanded}`);
    console.log(`  - shouldAutoExpand: ${shouldAutoExpand}`);
    console.log(`  - isSelected: ${isSelected}`);
    console.log(`  - externalSelectedPath: ${props.externalSelectedPath}`);
    console.log(`  - collapseKey: ${props.collapseKey}`);
    console.log(`  - pathMatch: ${pathMatch}`);
  }
  
  // When collapseKey changes (external navigation), reset expansion state
  React.useEffect(() => {
    const hasCollapseKeyChanged = lastCollapseKeyRef.current !== props.collapseKey;
    const isFirstMount = isFirstMountRef.current;
    
    if (jsonPointer.startsWith('/entry/0')) {
      console.log(`[TreeNodeWrapper EFFECT] ${jsonPointer}`);
      console.log(`  - isFirstMount: ${isFirstMount}`);
      console.log(`  - hasChanged: ${hasCollapseKeyChanged}`);
      console.log(`  - shouldAutoExpand: ${shouldAutoExpand}`);
      console.log(`  - lastCollapseKey: ${lastCollapseKeyRef.current} -> ${props.collapseKey}`);
    }
    
    // Update refs AFTER reading them
    lastCollapseKeyRef.current = props.collapseKey;
    
    // On first mount, expand if on path, otherwise stay collapsed
    if (isFirstMount) {
      // Mark as not first mount IMMEDIATELY to prevent re-runs
      isFirstMountRef.current = false;
      
      if (shouldAutoExpand) {
        const depth = props.path.length;
        const delay = depth * 10;
        if (jsonPointer.startsWith('/entry/0')) {
          console.log(`[TreeNodeWrapper ACTION] ${jsonPointer} - First mount EXPAND in ${delay}ms, SETTING TIMER`);
        }
        
        // Clear any existing timer
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
        }
        
        pendingTimerRef.current = setTimeout(() => {
          if (jsonPointer.startsWith('/entry/0')) {
            console.log(`[TreeNodeWrapper TIMER] ${jsonPointer} - TIMER FIRED - EXPANDING NOW`);
          }
          pendingTimerRef.current = null;
          setIsExpanded(true);
        }, delay);
        
        // Don't return cleanup - let timer fire regardless of re-renders
        return undefined;
      } else {
        if (jsonPointer.startsWith('/entry/0')) {
          console.log(`[TreeNodeWrapper ACTION] ${jsonPointer} - First mount STAY COLLAPSED`);
        }
        return;
      }
    }
    
    // Not first mount - only react to collapseKey changes
    if (!hasCollapseKeyChanged) {
      if (jsonPointer.startsWith('/entry/0')) {
        console.log(`[TreeNodeWrapper ACTION] ${jsonPointer} - No collapseKey change, skipping`);
      }
      // IMPORTANT: Return undefined (not a cleanup function) to avoid clearing pending timers
      return undefined;
    }
    
    if (shouldAutoExpand) {
      const depth = props.path.length;
      const delay = depth * 10;
      if (jsonPointer.startsWith('/entry/0')) {
        console.log(`[TreeNodeWrapper ACTION] ${jsonPointer} - CollapseKey changed, EXPAND in ${delay}ms`);
      }
      
      const timer = setTimeout(() => {
        if (jsonPointer.startsWith('/entry/0')) {
          console.log(`[TreeNodeWrapper TIMER] ${jsonPointer} - EXPANDING NOW`);
        }
        setIsExpanded(true);
      }, delay);
      
      return () => clearTimeout(timer);
    } else {
      if (jsonPointer.startsWith('/entry/0')) {
        console.log(`[TreeNodeWrapper ACTION] ${jsonPointer} - CollapseKey changed, COLLAPSING`);
      }
      setIsExpanded(false);
    }
  }, [props.collapseKey]); // Don't include shouldAutoExpand - it causes re-runs on parent expansion

  const handleToggle = () => {
    console.log(`[TreeNodeWrapper] ${jsonPointer} - TOGGLE ${isExpanded} -> ${!isExpanded}`);
    setIsExpanded(prev => !prev);
  };

  return (
    <TreeNode
      {...props}
      isExpanded={isExpanded}
      isSelected={isSelected}
      onToggle={handleToggle}
      onSelect={props.onSelect}
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
  const [internalSelectedPath, setInternalSelectedPath] = useState<string>('');
  const [collapseKey, setCollapseKey] = useState<number>(0);
  
  // Use external selectedPath if provided, otherwise use internal state
  const activeSelectedPath = selectedPath || internalSelectedPath;
  
  console.log('[BundleTree] RENDER - selectedPath:', selectedPath, 'activeSelectedPath:', activeSelectedPath, 'collapseKey:', collapseKey);
  
  // Track previous selectedPath to detect external changes only
  const prevSelectedPathRef = React.useRef<string | undefined>(selectedPath);
  
  // Increment collapse key when external selected path changes to reset all expansions
  // Only trigger on external navigation, not on internal selection changes
  React.useEffect(() => {
    console.log('[BundleTree] selectedPath EFFECT - selectedPath:', selectedPath, 'prev:', prevSelectedPathRef.current);
    // Only increment collapseKey if:
    // 1. selectedPath is truthy (external navigation happened)
    // 2. selectedPath actually changed from previous value
    // 3. selectedPath is different from current internalSelectedPath (not coming from our own handleNodeSelect)
    if (selectedPath && selectedPath !== prevSelectedPathRef.current) {
      console.log('[BundleTree] External navigation detected - incrementing collapseKey');
      setCollapseKey(prev => {
        console.log('[BundleTree] collapseKey:', prev, '->', prev + 1);
        return prev + 1;
      });
    }
    
    prevSelectedPathRef.current = selectedPath;
  }, [selectedPath]);

  const parsedBundle = useMemo(() => {
    try {
      return JSON.parse(bundleJson || '{}');
    } catch {
      return null;
    }
  }, [bundleJson]);

  const handleNodeSelect = (nodeData: NodeData) => {
    setInternalSelectedPath(nodeData.jsonPointer);
    // Don't call onNodeSelect for internal tree clicks
    // This prevents the selection from flowing back through BundleTabs as selectedPath
    // and triggering a collapseKey increment
    // onNodeSelect?.(nodeData.jsonPointer);
  };
  
  // Augment the callback with external selected path for children to access
  const handleNodeSelectWithPath = Object.assign(handleNodeSelect, {
    externalSelectedPath: activeSelectedPath,
    collapseKey: collapseKey
  });
  
  console.log('[BundleTree] Augmented callback - externalSelectedPath:', activeSelectedPath, 'collapseKey:', collapseKey);

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
              onSelect={handleNodeSelectWithPath}
              externalSelectedPath={activeSelectedPath}
              collapseKey={collapseKey}
            />
          ))}
        </div>
      </div>

      {activeSelectedPath && (
        <div className="border-t bg-gray-50 px-3 py-2 flex-shrink-0">
          <div className="text-xs">
            <span className="font-semibold text-gray-600">Path:</span>
            <code className="ml-2 text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
              {activeSelectedPath}
            </code>
          </div>
        </div>
      )}
    </div>
  );
};
