import React, { useState, useEffect } from 'react';
import RefinementModeSelector from './RefinementModeSelector';
import IndexRefinementInput from './IndexRefinementInput';
import FilterRefinementBuilder from './FilterRefinementBuilder';
import FhirPathPreview from './FhirPathPreview';
import {
  buildRefinedFhirPath,
  type RefinementMode,
  type RefinementConfig,
  type FilterCondition,
} from '../types/fhirPathRefinement';

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
  // Refinement state
  const [mode, setMode] = useState<RefinementMode>('first');
  const [indexValue, setIndexValue] = useState<number>(0);
  const [filterCondition, setFilterCondition] = useState<FilterCondition>({
    property: '',
    operator: 'equals',
    value: '',
  });

  // Manual override state
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const [manualPath, setManualPath] = useState<string>('');

  // Compute refined path
  const refinedPath = React.useMemo(() => {
    if (manualOverride) {
      return manualPath;
    }

    const config: RefinementConfig = {
      mode,
      indexValue,
      filterCondition,
    };

    return buildRefinedFhirPath(basePath, config);
  }, [basePath, mode, indexValue, filterCondition, manualOverride, manualPath]);

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

  return (
    <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Path Refinement</h3>
        <button
          onClick={() => setManualOverride(!manualOverride)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          {manualOverride ? '← Back to Structured' : 'Edit Manually →'}
        </button>
      </div>

      {/* Manual Override Mode */}
      {manualOverride && (
        <div className="space-y-3">
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
      {!manualOverride && (
        <div className="space-y-3">
          {/* Base Path Display */}
          <div className="p-2 bg-gray-100 border border-gray-300 rounded">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Base Path:
            </label>
            <div className="font-mono text-sm text-gray-900">{basePath}</div>
          </div>

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
            />
          )}
        </div>
      )}

      {/* Final Path Preview (always visible) */}
      <FhirPathPreview path={refinedPath} />
    </div>
  );
};

export default FhirPathRefinementPanel;
