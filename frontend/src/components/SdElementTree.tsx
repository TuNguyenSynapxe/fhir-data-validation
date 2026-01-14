/**
 * SD Element Tree Component
 * 
 * Renders a tree view of elements, slices, and slice children with:
 * - Include/exclude toggle
 * - Cardinality editing
 * - Error/warning highlighting
 * 
 * Rules:
 * - No FHIR logic
 * - No validation
 * - All changes emit backend commands
 */

import React, { useState } from 'react';
import { useSdBuilderStore } from '../stores/useSdBuilderStore';
import type {
  ElementDesign,
  ResourceDesignState,
  ValidationResult,
  ValidationIssue,
  Cardinality,
} from '../api/sdBuilderApi';

// ============================================================================
// Props
// ============================================================================

interface SdElementTreeProps {
  design: ResourceDesignState;
  validation?: ValidationResult | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get validation issues for a specific element path
 */
function getIssuesForPath(
  validation: ValidationResult | null | undefined,
  path: string,
  sliceName?: string
): ValidationIssue[] {
  if (!validation) return [];

  return [...validation.errors, ...validation.warnings].filter(
    (issue) =>
      issue.path === path &&
      (sliceName === undefined || issue.sliceName === sliceName)
  );
}

/**
 * Get severity class for element node
 */
function getSeverityClass(issues: ValidationIssue[]): string {
  if (issues.some((i) => i.severity === 'Error')) {
    return 'border-red-500 bg-red-50';
  }
  if (issues.some((i) => i.severity === 'Warning')) {
    return 'border-yellow-500 bg-yellow-50';
  }
  return '';
}

/**
 * Format cardinality for display
 */
function formatCardinality(card: Cardinality | null): string {
  if (!card) return '';
  return `${card.min}..${card.max}`;
}

// ============================================================================
// Cardinality Editor Component
// ============================================================================

interface CardinalityEditorProps {
  path: string;
  currentCardinality: Cardinality | null;
  baseCardinality: Cardinality;
  onSave: (min: number, max: string) => void;
  onCancel: () => void;
}

const CardinalityEditor: React.FC<CardinalityEditorProps> = ({
  currentCardinality,
  baseCardinality,
  onSave,
  onCancel,
}) => {
  const [min, setMin] = useState(
    currentCardinality?.min.toString() ?? baseCardinality.min.toString()
  );
  const [max, setMax] = useState(
    currentCardinality?.max ?? baseCardinality.max
  );

  const handleSave = () => {
    const minNum = parseInt(min, 10);
    if (isNaN(minNum)) return;
    onSave(minNum, max);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="number"
        min="0"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        className="w-16 px-2 py-1 border border-gray-300 rounded"
        placeholder="Min"
      />
      <span>..</span>
      <input
        type="text"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        className="w-16 px-2 py-1 border border-gray-300 rounded"
        placeholder="Max"
      />
      <button
        onClick={handleSave}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Save
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
      >
        Cancel
      </button>
    </div>
  );
};

// ============================================================================
// Element Node Component
// ============================================================================

interface ElementNodeProps {
  element: ElementDesign;
  validation: ValidationResult | null | undefined;
}

const ElementNode: React.FC<ElementNodeProps> = ({ element, validation }) => {
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  const [editingCardinality, setEditingCardinality] = useState(false);

  const issues = getIssuesForPath(validation, element.path);
  const severityClass = getSeverityClass(issues);

  const handleToggleInclude = async () => {
    await applyCommand({
      commandType: element.isIncluded ? 'ExcludeElement' : 'IncludeElement',
      path: element.path,
    });
  };

  const handleSaveCardinality = async (min: number, max: string) => {
    await applyCommand({
      commandType: 'SetCardinality',
      path: element.path,
      min,
      max,
    });
    setEditingCardinality(false);
  };

  const displayCardinality =
    element.overrideCardinality || element.baseCardinality;

  return (
    <div className={`border-l-4 pl-4 py-2 mb-2 ${severityClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Include/Exclude Toggle */}
          <button
            onClick={handleToggleInclude}
            className={`px-2 py-1 text-xs rounded ${
              element.isIncluded
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {element.isIncluded ? 'Included' : 'Excluded'}
          </button>

          {/* Path */}
          <span className="font-mono text-sm">{element.path}</span>

          {/* Cardinality */}
          {!editingCardinality && (
            <span
              className="text-sm text-gray-600 cursor-pointer hover:text-blue-600"
              onClick={() => setEditingCardinality(true)}
            >
              {formatCardinality(displayCardinality)}
              {element.overrideCardinality && ' (override)'}
            </span>
          )}

          {/* Binding Badge */}
          {element.binding && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
              {element.binding.strength}
            </span>
          )}

          {/* Slicing Badge */}
          {element.slicing && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              Slicing ({element.slicing.rules})
            </span>
          )}
        </div>
      </div>

      {/* Cardinality Editor */}
      {editingCardinality && (
        <CardinalityEditor
          path={element.path}
          currentCardinality={element.overrideCardinality}
          baseCardinality={element.baseCardinality}
          onSave={handleSaveCardinality}
          onCancel={() => setEditingCardinality(false)}
        />
      )}

      {/* Validation Issues */}
      {issues.length > 0 && (
        <div className="mt-2 space-y-1">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              className={`text-sm ${
                issue.severity === 'Error' ? 'text-red-600' : 'text-yellow-600'
              }`}
            >
              {issue.severity}: {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Slices */}
      {element.slices.length > 0 && (
        <div className="mt-3 ml-4 space-y-2">
          {element.slices.map((slice) => (
            <div
              key={slice.sliceName}
              className="border-l-2 border-gray-300 pl-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  Slice: {slice.sliceName}
                </span>
                {slice.cardinality && (
                  <span className="text-xs text-gray-600">
                    {formatCardinality(slice.cardinality)}
                  </span>
                )}
                {slice.binding && (
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                    {slice.binding.strength}
                  </span>
                )}
              </div>

              {/* Slice Children */}
              {slice.children.length > 0 && (
                <div className="mt-2 ml-4 space-y-1">
                  {slice.children.map((child) => (
                    <div
                      key={child.relativePath}
                      className="text-sm text-gray-700"
                    >
                      <span className="font-mono">{child.relativePath}</span>
                      {child.cardinality && (
                        <span className="ml-2 text-gray-600">
                          {formatCardinality(child.cardinality)}
                        </span>
                      )}
                      {child.binding && (
                        <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                          {child.binding.strength}
                        </span>
                      )}
                      {child.fixedValue && (
                        <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                          Fixed
                        </span>
                      )}
                      {child.patternValue && (
                        <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                          Pattern
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const SdElementTree: React.FC<SdElementTreeProps> = ({
  design,
  validation,
}) => {
  const [filter, setFilter] = useState('');

  const filteredElements = design.elements.filter((element) =>
    element.path.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {design.resourceType} Structure
        </h2>
        <span className="text-sm text-gray-600">
          Mode: {design.visibilityMode}
        </span>
      </div>

      {/* Filter */}
      <input
        type="text"
        placeholder="Filter elements by path..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />

      {/* Element List */}
      <div className="space-y-2">
        {filteredElements.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No elements found
          </div>
        ) : (
          filteredElements.map((element) => (
            <ElementNode
              key={element.path}
              element={element}
              validation={validation}
            />
          ))
        )}
      </div>
    </div>
  );
};
