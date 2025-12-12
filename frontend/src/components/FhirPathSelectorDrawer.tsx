import React, { useState } from 'react';
import BundleTreeView from './BundleTreeView';
import FhirSampleTreeView from './FhirSampleTreeView';
import ManualFhirPathInput from './ManualFhirPathInput';
import type { FhirSampleMetadata } from '../types/fhirSample';

/**
 * FhirPathSelectorDrawer - Context-locked FHIRPath selection drawer
 * 
 * 🔒 READ-ONLY CONTEXT:
 * - Drawer context is read-only by design
 * - NEVER modifies project bundle or saves data
 * - Only emits selected FHIRPath string via onSelect callback
 * - All data passed explicitly via props (no API calls)
 * - State is destroyed on close (ephemeral)
 * 
 * ARCHITECTURE:
 * - Tab 1 (Project): Uses projectBundle prop for tree view
 * - Tab 2 (HL7): Uses hl7Samples prop for sample dropdown + tree
 * - Tab 3 (Manual): Plain text input with validation
 * - Output: FHIRPath string ONLY (no metadata, no side effects)
 */
interface FhirPathSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void; // Returns FHIRPath string ONLY
  resourceType: string;
  projectBundle?: object; // Read-only project bundle for Tab 1
  hl7Samples?: FhirSampleMetadata[]; // Read-only HL7 samples for Tab 2
}

type TabType = 'project' | 'hl7' | 'manual';

const FhirPathSelectorDrawer: React.FC<FhirPathSelectorDrawerProps> = ({
  isOpen,
  onClose,
  onSelect,
  resourceType,
  projectBundle,
  hl7Samples,
}) => {
  // Drawer context is read-only by design
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('project');

  const handlePathSelected = (path: string) => {
    // Store selected FHIRPath string in local state only
    setSelectedPath(path);
  };

  if (!isOpen) return null;

  const handleInsertPath = () => {
    if (selectedPath.trim()) {
      // Drawer context is read-only by design
      // CRITICAL: Only return FHIRPath string, no metadata, no side effects
      onSelect(selectedPath);
      onClose();
    }
  };

  const handleCancel = () => {
    // Drawer state is destroyed on close (ephemeral)
    setSelectedPath('');
    setActiveTab('project');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleCancel}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Select FHIRPath</h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close drawer"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Resource Type: <span className="font-medium">{resourceType}</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('project')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'project'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            From Project Bundle
          </button>
          <button
            onClick={() => setActiveTab('hl7')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'hl7'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            From HL7 Standard
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Manual Input
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Selected Path Preview */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Selected FHIRPath:
            </label>
            <div className="font-mono text-sm text-gray-900 bg-white px-3 py-2 rounded border border-gray-300">
              {selectedPath || <span className="text-gray-400 italic">No path selected</span>}
            </div>
          </div>

          {/* Tab 1: Project Bundle - Read-only tree view */}
          {activeTab === 'project' && (
            <div>
              {projectBundle ? (
                <BundleTreeView 
                  bundleJson={JSON.stringify(projectBundle, null, 2)} 
                  onSelectPath={handlePathSelected}
                />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    No project bundle available. Please load a project bundle first.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: HL7 Standard - Sample dropdown inside drawer (read-only) */}
          {activeTab === 'hl7' && (
            <div>
              <FhirSampleTreeView 
                resourceType={resourceType} 
                onSelectPath={handlePathSelected}
                hl7Samples={hl7Samples}
              />
            </div>
          )}

          {activeTab === 'manual' && (
            <div>
              <ManualFhirPathInput 
                value={selectedPath} 
                onChange={handlePathSelected}
              />
              
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Quick Examples:</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li>
                    <button
                      onClick={() => setSelectedPath('id')}
                      className="hover:underline"
                    >
                      id
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setSelectedPath('meta.versionId')}
                      className="hover:underline"
                    >
                      meta.versionId
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setSelectedPath('identifier.value')}
                      className="hover:underline"
                    >
                      identifier.value
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setSelectedPath('name.family')}
                      className="hover:underline"
                    >
                      name.family
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedPath && (
                <span>
                  Current: <code className="text-xs bg-gray-200 px-2 py-1 rounded">{selectedPath}</code>
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertPath}
                disabled={!selectedPath.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                  selectedPath.trim()
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Insert Path
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FhirPathSelectorDrawer;
