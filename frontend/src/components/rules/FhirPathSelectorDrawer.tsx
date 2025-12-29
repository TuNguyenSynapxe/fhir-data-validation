import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import BundleTreeView from '../BundleTreeView';
import FhirSampleTreeView from '../FhirSampleTreeView';
import ManualFhirPathInput from './ManualFhirPathInput';
import FhirPathRefinementPanel from './FhirPathRefinementPanel';
import type { FhirSampleMetadata } from '../../types/fhirSample';
import type { FhirPathSelectionMode, FhirPathOption } from '../playground/Rules/common/FhirPathSelection.types';
import { isValidForTerminologyRule, getSemanticType } from '../playground/Rules/common/fhirPathSemanticUtils';

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
 * 
 * SELECTION MODES:
 * - 'free': Full tree selection (default, existing behavior)
 * - 'suggested': Show suggested paths, allow custom FHIRPath
 * - 'restricted': Only allow whitelisted paths (e.g., Terminology rules)
 */
interface FhirPathSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void; // Returns FHIRPath string ONLY
  resourceType: string;
  projectBundle?: object; // Read-only project bundle for Tab 1
  hl7Samples?: FhirSampleMetadata[]; // Read-only HL7 samples for Tab 2
  
  // NEW: Selection mode control
  mode?: FhirPathSelectionMode; // Default: 'free'
  ruleContext?: 'terminology' | 'required' | 'pattern' | 'custom'; // Rule intent
  suggestedPaths?: FhirPathOption[]; // For suggested/restricted modes
  allowedTypes?: Array<'Coding' | 'CodeableConcept' | 'Identifier' | 'string'>; // For restricted mode
  value?: string; // Current selected path (for validation)
}

type TabType = 'project' | 'hl7' | 'manual' | 'suggested';

const FhirPathSelectorDrawer: React.FC<FhirPathSelectorDrawerProps> = ({
  isOpen,
  onClose,
  onSelect,
  resourceType,
  projectBundle,
  hl7Samples,
  mode = 'free',
  ruleContext,
  suggestedPaths = [],
  allowedTypes = ['Coding', 'CodeableConcept'],
  value,
}) => {
  // Auto-determine mode from ruleContext if not explicitly set
  const effectiveMode = mode === 'free' && ruleContext === 'terminology' ? 'restricted' : mode;
  // Drawer context is read-only by design
  const [basePath, setBasePath] = useState<string>(''); // Base path from tree/manual
  const [refinedPath, setRefinedPath] = useState<string>(''); // Refined path from panel
  const [activeTab, setActiveTab] = useState<TabType>(effectiveMode === 'restricted' ? 'suggested' : 'project');
  const [selectedHl7SampleJson, setSelectedHl7SampleJson] = useState<any>(undefined); // Track selected HL7 sample JSON
  const [validationError, setValidationError] = useState<string>('');

  const handlePathSelected = (path: string) => {
    // Store base FHIRPath string in local state only
    setBasePath(path);
    
    // Validate path based on mode
    if (effectiveMode === 'restricted') {
      validateRestrictedPath(path);
    } else {
      setValidationError('');
    }
  };

  const validateRestrictedPath = (path: string) => {
    if (!path) {
      setValidationError('');
      return;
    }

    // Check for primitive code paths (common mistake)
    if (path.endsWith('.code') && !path.includes('.coding.')) {
      setValidationError('Terminology rules apply to coded elements, not primitive code values. Select the parent field instead.');
      return;
    }

    // For restricted mode with suggestedPaths, check if path is in whitelist
    if (effectiveMode === 'restricted' && suggestedPaths.length > 0) {
      const isInWhitelist = suggestedPaths.some(opt => opt.fhirPath === path);
      if (!isInWhitelist) {
        setValidationError('This path is not in the allowed list. Please select a coded field from the list.');
        return;
      }
    }

    // Validate against allowedTypes
    if (effectiveMode === 'restricted' && allowedTypes) {
      const semanticType = getSemanticType(path);
      const isAllowed = 
        (allowedTypes.includes('Coding') && semanticType === 'Coding') ||
        (allowedTypes.includes('CodeableConcept') && semanticType === 'CodeableConcept') ||
        (allowedTypes.includes('Identifier') && semanticType === 'Identifier') ||
        (allowedTypes.includes('string') && semanticType === 'string');
      
      if (!isAllowed) {
        setValidationError('Terminology rules require coded fields (Coding or CodeableConcept).');
        return;
      }
    }

    // Additional semantic validation for Terminology rules
    if (ruleContext === 'terminology' && !isValidForTerminologyRule(path)) {
      setValidationError('This rule only supports coded fields. Select a field containing codes or code systems.');
      return;
    }

    setValidationError('');
  };

  const handleRefinedPathChange = (path: string) => {
    // Store refined FHIRPath from refinement panel
    setRefinedPath(path);
  };

  if (!isOpen) return null;

  const handleInsertPath = () => {
    // Use refined path if available, otherwise fall back to base path
    const finalPath = refinedPath || basePath;
    
    // Block insert if validation error in restricted mode
    if (effectiveMode === 'restricted' && validationError) {
      return;
    }
    
    if (finalPath.trim()) {
      // Drawer context is read-only by design
      // CRITICAL: Only return FHIRPath string, no metadata, no side effects
      onSelect(finalPath);
      onClose();
    }
  };

  const handleCancel = () => {
    // Drawer state is destroyed on close (ephemeral)
    setBasePath('');
    setRefinedPath('');
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
          {/* Suggested Paths Tab (for suggested/restricted modes) */}
          {(effectiveMode === 'suggested' || effectiveMode === 'restricted') && (
            <button
              onClick={() => setActiveTab('suggested')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'suggested'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {effectiveMode === 'restricted' ? 'Coded Fields' : 'Suggested Paths'}
            </button>
          )}
          
          {/* Project Bundle Tab (hidden in restricted mode) */}
          {effectiveMode !== 'restricted' && (
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
          )}
          
          {/* HL7 Standard Tab (hidden in restricted mode) */}
          {effectiveMode !== 'restricted' && (
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
          )}
          
          {/* Manual Input Tab (hidden in restricted mode) */}
          {effectiveMode !== 'restricted' && (
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
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Base Path Preview */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Selected Base Path:
            </label>
            <div className="font-mono text-sm text-gray-900 bg-white px-3 py-2 rounded border border-gray-300">
              {basePath || <span className="text-gray-400 italic">No path selected</span>}
            </div>
            
            {/* Validation Error */}
            {validationError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{validationError}</p>
              </div>
            )}
          </div>

          {/* Tab: Suggested/Allowed Paths */}
          {activeTab === 'suggested' && (
            <div className="space-y-2">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {effectiveMode === 'restricted' ? 'Select a coded field:' : 'Suggested paths for this rule:'}
                </h3>
                {effectiveMode === 'restricted' && ruleContext === 'terminology' && (
                  <p className="text-xs text-gray-500 mb-3">
                    Terminology rules validate against coded elements. Select from the fields detected in your project data.
                  </p>
                )}
                {effectiveMode === 'suggested' && (
                  <p className="text-xs text-gray-500 mb-3">
                    These paths are commonly used. You can also select from the tree or enter custom FHIRPath.
                  </p>
                )}
              </div>
              
              {/* Empty State - No coded fields detected */}
              {suggestedPaths.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">No coded fields detected</p>
                      <p className="text-xs">
                        {ruleContext === 'terminology' 
                          ? 'No coded fields (Coding or CodeableConcept) were found in the current project data for this resource type. Make sure your project bundle contains sample data with coded elements.'
                          : 'No suggested paths available for the current resource type. You can use the tree selector or manual input instead.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {suggestedPaths.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handlePathSelected(option.fhirPath)}
                  className={`w-full text-left p-3 border rounded-md transition-all ${
                    basePath === option.fhirPath
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                  title={option.extensionUrl || option.description}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{option.label}</span>
                        
                        {/* Coded Field Badge (for terminology context) */}
                        {ruleContext === 'terminology' && !option.isExtension && (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">
                            Coded
                          </span>
                        )}
                        
                        {/* Extension Badge */}
                        {option.isExtension && (
                          <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">
                            Extension
                          </span>
                        )}
                      </div>
                      
                      {/* FHIRPath - shown as tooltip information */}
                      <div className="font-mono text-xs text-gray-500 mt-1 truncate" title={option.fhirPath}>
                        {ruleContext === 'terminology' ? 'FHIRPath: ' : ''}{option.fhirPath}
                      </div>
                      
                      {option.description && !option.extensionUrl && ruleContext !== 'terminology' && (
                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      )}
                      
                      {option.extensionUrl && (
                        <div className="text-xs text-gray-500 mt-1" title={option.extensionUrl}>
                          {option.extensionUrl}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {effectiveMode === 'suggested' && (
                <>
                  <div className="my-4 flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-500 font-medium">OR</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-800">
                        <strong>Advanced:</strong> Use the "From Project Bundle" or "Manual Input" tabs to specify a custom FHIRPath.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 1: Project Bundle - Read-only tree view filtered by resource type */}
          {activeTab === 'project' && (
            <div>
              {projectBundle ? (
                <BundleTreeView 
                  bundleJson={JSON.stringify(projectBundle, null, 2)} 
                  onSelectPath={handlePathSelected}
                  resourceTypeFilter={resourceType}
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
                onSampleLoaded={setSelectedHl7SampleJson}
              />
            </div>
          )}

          {activeTab === 'manual' && (
            <div>
              <ManualFhirPathInput 
                value={basePath} 
                onChange={handlePathSelected}
              />
              
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Quick Examples:</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li>
                    <button
                      onClick={() => setBasePath('id')}
                      className="hover:underline"
                    >
                      id
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setBasePath('meta.versionId')}
                      className="hover:underline"
                    >
                      meta.versionId
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setBasePath('identifier.value')}
                      className="hover:underline"
                    >
                      identifier.value
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setBasePath('name.family')}
                      className="hover:underline"
                    >
                      name.family
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Path Refinement Panel - Appears after base path is selected */}
          {basePath && (
            <FhirPathRefinementPanel
              basePath={basePath}
              onRefinedPathChange={handleRefinedPathChange}
              projectBundle={activeTab === 'project' ? projectBundle : undefined}
              hlSample={activeTab === 'hl7' ? selectedHl7SampleJson : undefined}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {(refinedPath || basePath) && (
                <span>
                  Current: <code className="text-xs bg-gray-200 px-2 py-1 rounded">{refinedPath || basePath}</code>
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
                disabled={!(refinedPath || basePath).trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                  (refinedPath || basePath).trim()
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
