import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Save, FileJson, List, AlertCircle, Upload } from 'lucide-react';
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
  hideUploadButton?: boolean; // Hide upload button (e.g., in validation mode)
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
  onTabChange: externalOnTabChange,  hideUploadButton = false,}, ref) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'tree' | 'json'>('tree');
  const [selectedPath, setSelectedPath] = useState<string>();
  const [expectedChildKey, setExpectedChildKey] = useState<string>(); // Phase 7.1: Track expected child
  const [localValue, setLocalValue] = useState(bundleJson);
  const [parseError, setParseError] = useState<string | null>(null);
  const [sanityErrors, setSanityErrors] = useState<string[]>([]); // Structural sanity errors (shown on save)
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

  /**
   * Structural sanity check - runs ONLY on Save
   * Verifies basic Bundle structure without semantic validation
   * 
   * @returns Array of error messages (empty if valid)
   */
  const checkBundleSanity = (json: string): string[] => {
    const errors: string[] = [];

    // 1. Check JSON parses
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      errors.push('JSON does not parse successfully');
      return errors; // Can't check further
    }

    // 2. Check root resourceType
    if (parsed.resourceType !== 'Bundle') {
      errors.push('Root resourceType must be "Bundle"');
    }

    // 3. Check entry exists and is array
    if (!parsed.entry) {
      errors.push('Bundle must have an "entry" property');
    } else if (!Array.isArray(parsed.entry)) {
      errors.push('Bundle entry must be an array');
    } else {
      // 4. Check entry.length > 0
      if (parsed.entry.length === 0) {
        errors.push('Bundle entry array must contain at least one entry');
      } else {
        // 5. Check each entry has resource.resourceType
        parsed.entry.forEach((entry: any, index: number) => {
          if (!entry.resource) {
            errors.push(`Entry[${index}] is missing "resource" property`);
          } else if (!entry.resource.resourceType) {
            errors.push(`Entry[${index}].resource is missing "resourceType" property`);
          }
        });
      }
    }

    return errors;
  };

  // Auto-switch to JSON tab if bundle parsing fails
  useEffect(() => {
    if (parseError && activeTab === 'tree') {
      setActiveTab('json');
    }
  }, [parseError, activeTab]);

  /**
   * Handle Save with structural sanity check
   * Blocks save if Bundle structure is invalid
   */
  const handleSave = () => {
    // Run structural sanity check
    const errors = checkBundleSanity(localValue);
    
    if (errors.length > 0) {
      // Block save and show errors
      setSanityErrors(errors);
      return;
    }
    
    // Clear any previous sanity errors and proceed with save
    setSanityErrors([]);
    onSave();
  };

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        // Validate it's valid JSON
        JSON.parse(content);
        setLocalValue(content);
        onBundleChange(content);
        validateJson(content);
      } catch (error) {
        alert(`Invalid JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be selected again
    event.target.value = '';
  }, [onBundleChange]);

  // Debounced change handler
  const handleEditorChange = useCallback((value: string) => {
    setLocalValue(value);
    const isValid = validateJson(value);
    
    // Clear sanity errors when user makes changes (editing is always allowed)
    if (sanityErrors.length > 0) {
      setSanityErrors([]);
    }

    // Debounce the onChange callback
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (isValid) {
      debounceTimerRef.current = setTimeout(() => {
        onBundleChange(value);
      }, 500);
    }
  }, [onBundleChange, sanityErrors.length]);

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
      {/* Tab Header - Only show internal tabs when not externally controlled */}
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
          {!hideUploadButton && (
            <label className="flex items-center gap-2 px-4 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Upload
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !!parseError}
            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Bundle'}
          </button>
        </div>
      </div>
      )}

      {/* Action Bar - Always visible even when externally controlled */}
      {!showInternalTabs && (
        <div className="flex items-center justify-end gap-3 border-b bg-gray-50 px-4 py-2.5 flex-shrink-0">
          {parseError && (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>Invalid JSON</span>
            </div>
          )}
          {!hideUploadButton && (
            <label className="flex items-center gap-2 px-4 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Upload
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !!parseError}
            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Bundle'}
          </button>
        </div>
      )}

      {/* Structural Sanity Error Banner - Non-dismissible, shown only when save is blocked */}
      {sanityErrors.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">
                Cannot Save: Bundle Structure Invalid
              </h4>
              <p className="text-xs text-red-700 mb-2">
                Fix the following structural issues before saving:
              </p>
              <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                {sanityErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {isBundleEmpty && activeTab === 'tree' ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center max-w-md">
              <FileJson className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-base font-medium text-gray-900 mb-2">No Bundle Loaded</p>
              <p className="text-sm text-gray-600 mb-6">Upload a FHIR bundle JSON file or use the JSON Editor to create one.</p>
              
              <div className="flex items-center justify-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => handleTabSwitch('json')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
                >
                  <FileJson className="w-4 h-4" />
                  Open JSON Editor
                </button>
              </div>
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
