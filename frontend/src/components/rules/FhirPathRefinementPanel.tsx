import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import RefinementModeSelector from './RefinementModeSelector';
import IndexRefinementInput from './IndexRefinementInput';
import FilterRefinementBuilder from './FilterRefinementBuilder';
import NestedArrayRefinementBuilder from './NestedArrayRefinementBuilder';
import FhirPathPreview from './FhirPathPreview';
import {
  buildRefinedFhirPath,
  buildNestedArrayRefinedPath,
  generateNestedArrayIntent,
  type RefinementMode,
  type RefinementConfig,
  type FilterCondition,
  type ArrayLayerRefinement,
  type NestedArrayRefinementConfig,
} from '../../types/fhirPathRefinement';
import {
  detectArrayLayers,
  hasNestedArrays,
  hasAnyArrayInPath,
  exceedsMaxNestingDepth,
  getArrayNestingDepth,
} from '../../utils/arrayPathDetection';

/**
 * FhirPathRefinementPanel - Main orchestrator for path refinement UX
 * 
 * ARCHITECTURE:
 * - Pure string transformation (no validation, no API calls)
 * - Appears after base path is selected
 * - Allows structured refinement or manual override
 * - Always shows final FHIRPath preview
 * - Read-only context (no project mutations)
 * 
 * Phase 1 scope:
 * - 4 refinement modes (first/all/index/filter)
 * - Single filter condition only
 * - Manual override toggle
 * - Value suggestions for filter mode
 * 
 * Phase 2 scope (NESTED ARRAYS):
 * - Detect nested array layers (e.g., address[].line[])
 * - Stacked scope selector (one per array level)
 * - Parent-to-child resolution constraint
 * - Human-readable intent preview
 * - Max depth limit (2 levels)
 */
interface FhirPathRefinementPanelProps {
  basePath: string;
  onRefinedPathChange: (refinedPath: string) => void;
  projectBundle?: any; // Optional project bundle for value suggestions
  hlSample?: any; // Optional HL7 sample for value suggestions
}

const FhirPathRefinementPanel: React.FC<FhirPathRefinementPanelProps> = ({
  basePath,
  onRefinedPathChange,
  projectBundle,
  hlSample,
}) => {
  // Extract resource type from basePath for schema lookup
  // Example: "Patient.telecom" → "Patient"
  const resourceType = React.useMemo(() => {
    if (!basePath) return undefined;
    const firstSegment = basePath.split('.')[0];
    // FHIR resource types start with uppercase letter
    if (firstSegment && /^[A-Z][a-zA-Z]*$/.test(firstSegment)) {
      return firstSegment;
    }
    return undefined;
  }, [basePath]);

  // Detect nested arrays
  const arrayLayers = React.useMemo(() => detectArrayLayers(basePath), [basePath]);
  const hasArrays = React.useMemo(() => hasAnyArrayInPath(basePath), [basePath]);
  const isNested = hasNestedArrays(basePath);
  const exceedsDepthLimit = exceedsMaxNestingDepth(basePath);
  const nestingDepth = getArrayNestingDepth(basePath);

  // Single array refinement state (legacy)
  const [mode, setMode] = useState<RefinementMode>('first');
  const [indexValue, setIndexValue] = useState<number>(0);
  const [filterCondition, setFilterCondition] = useState<FilterCondition>({
    property: '',
    operator: 'equals',
    value: '',
  });

  // Nested array refinement state
  const [nestedArrayLayers, setNestedArrayLayers] = useState<ArrayLayerRefinement[]>([]);

  // Manual override state
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const [manualPath, setManualPath] = useState<string>('');

  // Show raw FHIRPath toggle
  const [showRawPath, setShowRawPath] = useState<boolean>(false);

  // Initialize nested array layers when path changes
  useEffect(() => {
    if (isNested && !exceedsDepthLimit) {
      const initialLayers: ArrayLayerRefinement[] = arrayLayers.map((layer) => ({
        segment: layer.segment,
        mode: 'first',
        indexValue: 0,
        filterCondition: { property: '', operator: 'equals', value: '' },
      }));
      setNestedArrayLayers(initialLayers);
    }
  }, [basePath, isNested, exceedsDepthLimit, arrayLayers]);

  // Force manual mode if depth exceeded
  useEffect(() => {
    if (exceedsDepthLimit && !manualOverride) {
      setManualOverride(true);
      setManualPath(basePath);
    }
  }, [exceedsDepthLimit, basePath, manualOverride]);

  // Compute refined path
  const refinedPath = React.useMemo(() => {
    if (manualOverride) {
      return manualPath;
    }

    // Handle nested arrays
    if (isNested && !exceedsDepthLimit) {
      const config: NestedArrayRefinementConfig = {
        layers: nestedArrayLayers,
      };
      return buildNestedArrayRefinedPath(basePath, config);
    }

    // Handle single array (legacy)
    const config: RefinementConfig = {
      mode,
      indexValue,
      filterCondition,
    };

    return buildRefinedFhirPath(basePath, config);
  }, [basePath, mode, indexValue, filterCondition, manualOverride, manualPath, isNested, exceedsDepthLimit, nestedArrayLayers]);

  // Generate human-readable intent for nested arrays
  const nestedArrayIntent = React.useMemo(() => {
    if (!isNested || exceedsDepthLimit || manualOverride) {
      return null;
    }
    const config: NestedArrayRefinementConfig = {
      layers: nestedArrayLayers,
    };
    return generateNestedArrayIntent(config);
  }, [isNested, exceedsDepthLimit, manualOverride, nestedArrayLayers]);

  // Notify parent of refined path changes
  useEffect(() => {
    onRefinedPathChange(refinedPath);
  }, [refinedPath, onRefinedPathChange]);

  // Initialize manual path when toggling override
  useEffect(() => {
    if (manualOverride && !manualPath) {
      setManualPath(basePath);
    }
  }, [manualOverride, manualPath, basePath]);

  if (!basePath) {
    return null;
  }

  // If no arrays in path, show helper text only (unless manual override is active)
  if (!hasArrays && !manualOverride) {
    return (
      <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Path Refinement</h3>
          <button
            onClick={() => setManualOverride(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Manual Mode →
          </button>
        </div>

        {/* Helper text when no arrays */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Path scope: single element</span>
            <span className="text-gray-500"> (no array refinement required)</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            This path points to a single value. Array refinement (index, filter, etc.) is not applicable.
          </p>
        </div>

        {/* Final Path Preview */}
        <FhirPathPreview path={basePath} />
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Path Refinement</h3>
        <div className="flex items-center gap-2">
          {!exceedsDepthLimit && (
            <button
              onClick={() => setShowRawPath(!showRawPath)}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              {showRawPath ? 'Hide Raw Path' : 'Show Raw Path'}
            </button>
          )}
          {!exceedsDepthLimit && (
            <button
              onClick={() => setManualOverride(!manualOverride)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {manualOverride ? (hasArrays ? '← Back to Builder' : '← Back') : 'Manual Mode →'}
            </button>
          )}
        </div>
      </div>

      {/* Depth Limit Warning */}
      {exceedsDepthLimit && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-md">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900">Nesting Too Deep</p>
              <p className="text-amber-800 mt-1">
                This path has {nestingDepth} nested array levels. The builder supports up to 2 levels.
                Please use manual mode to refine this path.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Mode */}
      {manualOverride && (
        <div className="space-y-3">
          {exceedsDepthLimit && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <p className="font-medium">Manual Mode Required</p>
              <p className="mt-1">Builder disabled due to nesting depth. Edit FHIRPath directly below.</p>
            </div>
          )}
          {!hasArrays && !exceedsDepthLimit && (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
              <p className="font-medium">Note: No arrays in this path</p>
              <p className="mt-1">This path points to a single element. You can still edit it manually if needed.</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manual FHIRPath:
            </label>
            <textarea
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter FHIRPath manually..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Type FHIRPath directly. No validation applied.
            </p>
          </div>
        </div>
      )}

      {/* Structured Refinement Mode */}
      {!manualOverride && !exceedsDepthLimit && (
        <div className="space-y-3">
          {/* Base Path Display */}
          <div className="p-2 bg-gray-100 border border-gray-300 rounded">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Base Path:
            </label>
            <div className="font-mono text-sm text-gray-900">{basePath}</div>
          </div>

          {/* Nested Array Detection Notice */}
          {isNested && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <p className="font-medium text-blue-900">Nested Array Detected</p>
              <p className="text-blue-800 mt-1">
                This path contains {nestingDepth} array levels. Configure each level separately below.
              </p>
            </div>
          )}

          {/* Nested Array Builder */}
          {isNested && (
            <NestedArrayRefinementBuilder
              layers={nestedArrayLayers}
              onChange={setNestedArrayLayers}
              basePath={basePath}
              projectBundle={projectBundle}
              hlSample={hlSample}
            />
          )}

          {/* Single Array Builder (legacy) */}
          {!isNested && (
            <>
              {/* Refinement Mode Selector */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Refinement Mode:
                </label>
                <RefinementModeSelector selectedMode={mode} onChange={setMode} />
              </div>

              {/* Index Input (conditional) */}
              {mode === 'index' && (
                <IndexRefinementInput value={indexValue} onChange={setIndexValue} />
              )}

              {/* Filter Builder (conditional) */}
              {mode === 'filter' && (
                <FilterRefinementBuilder
                  condition={filterCondition}
                  onChange={setFilterCondition}
                  basePath={basePath}
                  projectBundle={projectBundle}
                  hlSample={hlSample}
                  resourceType={resourceType}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Human-Readable Intent Preview (for nested arrays) */}
      {!manualOverride && isNested && !exceedsDepthLimit && nestedArrayIntent && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-xs font-medium text-green-900">Intent:</p>
          <p className="text-sm text-green-800 mt-1">{nestedArrayIntent}</p>
        </div>
      )}

      {/* Raw FHIRPath Display (collapsible) */}
      {showRawPath && !manualOverride && (
        <div className="mt-3 p-2 bg-gray-100 border border-gray-300 rounded">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Generated FHIRPath:
          </label>
          <div className="font-mono text-xs text-gray-900 break-all">{refinedPath}</div>
        </div>
      )}

      {/* Final Path Preview (always visible) */}
      <FhirPathPreview path={refinedPath} />
    </div>
  );
};

export default FhirPathRefinementPanel;
