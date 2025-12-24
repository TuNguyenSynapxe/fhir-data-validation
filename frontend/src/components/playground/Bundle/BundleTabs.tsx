import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Save, FileJson, List, AlertCircle } from 'lucide-react';
import { BundleTree } from './BundleTree';
import { BundleJsonEditor } from './BundleJsonEditor';
// Samples intentionally not available in Project Edit

interface BundleTabsProps {
  bundleJson: string;
  onBundleChange: (value: string) => void;
  onSave: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
  onSelectNode?: (path: string) => void;
  activeTab?: 'tree' | 'json'; // External control of active tab
  onTabChange?: (tab: 'tree' | 'json') => void; // External tab change handler
}

export interface BundleTabsRef {
  switchToTreeView: () => void;
  navigateToPath: (jsonPointer: string, expectedChildKey?: string) => void; // Phase 7.1: Support expected child
}

export const BundleTabs = forwardRef<BundleTabsRef, BundleTabsProps>(({
  bundleJson,
  onBundleChange,
  onSave,
  isSaving = false,
  hasChanges = false,
  onSelectNode,
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange,
}, ref) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'tree' | 'json'>('tree');
  const [selectedPath, setSelectedPath] = useState<string>();
  const [expectedChildKey, setExpectedChildKey] = useState<string>(); // Phase 7.1: Track expected child
  const [localValue, setLocalValue] = useState(bundleJson);
  const [parseError, setParseError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  // Use external activeTab if provided, otherwise use internal state
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = externalOnTabChange || setInternalActiveTab;
  
  // Expose imperative methods via ref
  useImperativeHandle(ref, () => ({
    switchToTreeView: () => {
      if (!parseError) {
        setActiveTab('tree');
      }
    },
    navigateToPath: (jsonPointer: string, childKey?: string) => { // Phase 7.1: Accept expected child
      setSelectedPath(jsonPointer);
      setExpectedChildKey(childKey); // Phase 7.1: Store expected child
      onSelectNode?.(jsonPointer);
    },
  }));

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(bundleJson);
    validateJson(bundleJson);
  }, [bundleJson]);

  // Validate JSON and detect parse errors
  const validateJson = (json: string) => {
    if (!json || json.trim() === '') {
      setParseError('Bundle is empty');
      return false;
    }

    try {
      JSON.parse(json);
      setParseError(null);
      return true;
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid JSON');
      return false;
    }
  };

  // Auto-switch to JSON tab if bundle parsing fails
  useEffect(() => {
    if (parseError && activeTab === 'tree') {
      setActiveTab('json');
    }
  }, [parseError, activeTab]);

  // Debounced change handler
  const handleEditorChange = useCallback((value: string) => {
    setLocalValue(value);
    const isValid = validateJson(value);

    // Debounce the onChange callback
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (isValid) {
      debounceTimerRef.current = setTimeout(() => {
        onBundleChange(value);
      }, 500);
    }
  }, [onBundleChange]);

  // Handle tree node updates
  const handleUpdateValue = useCallback((path: string[], newValue: any) => {
    try {
      const bundle = JSON.parse(localValue);
      
      // Navigate to the path and update the value
      let current: any = bundle;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = newValue;
      
      const updatedJson = JSON.stringify(bundle, null, 2);
      setLocalValue(updatedJson);
      onBundleChange(updatedJson);
    } catch (err) {
      console.error('Failed to update value:', err);
      alert(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [localValue, onBundleChange]);

  // Handle tree node deletion
  const handleDeleteNode = useCallback((path: string[]) => {
    try {
      const bundle = JSON.parse(localValue);
      
      // Navigate to parent and delete the key
      if (path.length === 0) return;
      
      let current: any = bundle;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      
      const lastKey = path[path.length - 1];
      if (Array.isArray(current)) {
        current.splice(Number(lastKey), 1);
      } else {
        delete current[lastKey];
      }
      
      const updatedJson = JSON.stringify(bundle, null, 2);
      setLocalValue(updatedJson);
      onBundleChange(updatedJson);
    } catch (err) {
      console.error('Failed to delete node:', err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [localValue, onBundleChange]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle tree node selection
  const handleNodeSelect = (path: string) => {
    setSelectedPath(path);
    onSelectNode?.(path);
  };

  // Handle tab switch
  const handleTabSwitch = (tab: 'tree' | 'json') => {
    // Don't allow switching to tree if JSON is invalid
    if (tab === 'tree' && parseError) {
      return;
    }
    setActiveTab(tab);
  };

  // Samples intentionally not available in Project Edit
  // Project bundle comes ONLY from project API
  
  // Check if bundle is empty
  const isBundleEmpty = !bundleJson || bundleJson.trim() === '' || bundleJson.trim() === '{}';
  
  // Hide internal tabs when externally controlled
  const showInternalTabs = !externalActiveTab;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab Header - Only show when not externally controlled */}
      {showInternalTabs && (
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2.5 flex-shrink-0">
          <div className="flex gap-1">
            <button
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'tree'
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-[11px]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-t'
              } ${parseError ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={() => handleTabSwitch('tree')}
            disabled={!!parseError}
            title={parseError ? 'Fix JSON errors to view tree' : 'Tree View'}
          >
            <List className="w-4 h-4" />
            <span>Tree View</span>
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'json'
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-[11px]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-t'
            }`}
            onClick={() => handleTabSwitch('json')}
          >
            <FileJson className="w-4 h-4" />
            <span>JSON Editor</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {parseError && (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>Invalid JSON</span>
            </div>
          )}
          <button
            onClick={onSave}
            disabled={!hasChanges || isSaving || !!parseError}
            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Bundle'}
          </button>
        </div>
      </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {isBundleEmpty ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <FileJson className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium">No bundle loaded</p>
              <p className="text-xs mt-1">Use JSON Editor to create or paste a FHIR bundle</p>
            </div>
          </div>
        ) : activeTab === 'tree' ? (
          <BundleTree
            bundleJson={localValue}
            onNodeSelect={handleNodeSelect}
            selectedPath={selectedPath}
            onUpdateValue={handleUpdateValue}
            onDeleteNode={handleDeleteNode}
            expectedChildAt={selectedPath} // Phase 7.1: Pass parent path
            expectedChildKey={expectedChildKey} // Phase 7.1: Pass expected child key
          />
        ) : (
          <div className="h-full">
            <BundleJsonEditor
              value={localValue}
              onChange={handleEditorChange}
            />
            {parseError && (
              <div className="absolute bottom-0 left-0 right-0 bg-red-50 border-t border-red-200 px-4 py-2">
                <div className="flex items-start gap-2 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">JSON Parse Error</p>
                    <p className="text-xs mt-0.5">{parseError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
