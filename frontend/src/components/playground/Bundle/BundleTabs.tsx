import React, { useState, useEffect, useCallback, useRef } from 'react';
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
}

export const BundleTabs: React.FC<BundleTabsProps> = ({
  bundleJson,
  onBundleChange,
  onSave,
  isSaving = false,
  hasChanges = false,
  onSelectNode,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'json'>('tree');
  const [selectedPath, setSelectedPath] = useState<string>();
  const [localValue, setLocalValue] = useState(bundleJson);
  const [parseError, setParseError] = useState<string | null>(null);
  const debounceTimerRef = useRef<number | undefined>(undefined);

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
    validateJson(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced timer (500ms)
    debounceTimerRef.current = setTimeout(() => {
      onBundleChange(value);
    }, 500);
  }, [onBundleChange]);

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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab Header */}
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
};
