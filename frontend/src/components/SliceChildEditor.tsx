/**
 * Slice Child Constraint Editor Component — EPIC 2 Path Validation
 * 
 * Edit constraints on child elements within a slice with path validation:
 * - Only allow valid child paths from base snapshot
 * - Grey out invalid paths with tooltip
 * - Prevent submission of invalid paths
 * - Cardinality
 * - Binding
 * - Fixed value (opaque JSON)
 * - Pattern value (opaque JSON)
 * 
 * Rules:
 * - Fixed and Pattern values are opaque JSON (no parsing/validation)
 * - Clearing fixed clears pattern and vice versa
 * - All changes call sendCommand()
 * - NO FIRELY SDK. METADATA-DRIVEN ONLY.
 */

import React, { useState, useEffect } from 'react';
import { useSdBuilderStore } from '../stores/useSdBuilderStore';
import type { ElementDesign, SliceDesign } from '../api/sdBuilderApi';
import { ValueSetPicker } from './ValueSetPicker';

// ============================================================================
// Helper Functions — Path Validation
// ============================================================================

/**
 * EPIC 2 RULE 6: Get valid child paths from base snapshot
 * Filter paths that are actually children of the current element.
 * 
 * Example: For element "Patient.contact", valid child paths include:
 * - relationship, name, telecom, address, gender, organization, period
 * 
 * This would come from the base snapshot, but for now we'll use a simplified approach:
 * Extract common paths from the element design state.
 */
function getValidChildPaths(element: ElementDesign): string[] {
  // For now, return common FHIR element child paths based on type
  // In a full implementation, this would query the base snapshot from backend
  
  const types = element.typeCodes;
  
  // Common paths for complex types
  if (types.includes('CodeableConcept')) {
    return ['coding', 'text'];
  }
  
  if (types.includes('Coding')) {
    return ['system', 'version', 'code', 'display', 'userSelected'];
  }
  
  if (types.includes('Identifier')) {
    return ['use', 'type', 'system', 'value', 'period', 'assigner'];
  }
  
  if (types.includes('Reference')) {
    return ['reference', 'type', 'identifier', 'display'];
  }
  
  if (types.includes('Quantity')) {
    return ['value', 'comparator', 'unit', 'system', 'code'];
  }
  
  if (types.includes('Period')) {
    return ['start', 'end'];
  }
  
  if (types.includes('Address')) {
    return ['use', 'type', 'text', 'line', 'city', 'district', 'state', 'postalCode', 'country', 'period'];
  }
  
  if (types.includes('ContactPoint')) {
    return ['system', 'value', 'use', 'rank', 'period'];
  }
  
  if (types.includes('HumanName')) {
    return ['use', 'text', 'family', 'given', 'prefix', 'suffix', 'period'];
  }
  
  // For backbone elements (no types), return empty (user must know structure)
  if (types.length === 0 || types.includes('BackboneElement')) {
    return [];
  }
  
  // For primitive types, no child paths
  if (types.some(t => ['string', 'code', 'uri', 'boolean', 'integer', 'decimal', 'date', 'dateTime'].includes(t))) {
    return [];
  }
  
  // Default: allow any path (for unknown types)
  return [];
}

/**
 * Check if a path is valid for the element
 */
function isValidChildPath(element: ElementDesign, path: string): boolean {
  const validPaths = getValidChildPaths(element);
  if (validPaths.length === 0) return true; // Unknown structure, allow any
  return validPaths.includes(path);
}

// ============================================================================
// Props
// ============================================================================

interface SliceChildEditorProps {
  element: ElementDesign;
  onClose: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const SliceChildEditor: React.FC<SliceChildEditorProps> = ({
  element,
  onClose,
}) => {
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);

  // Selected slice
  const [selectedSlice, setSelectedSlice] = useState<SliceDesign | null>(
    element.slices[0] ?? null
  );

  // New child constraint state
  const [relativePath, setRelativePath] = useState('');
  const [min, setMin] = useState('0');
  const [max, setMax] = useState('*');
  const [bindingUrl, setBindingUrl] = useState('');
  const [bindingStrength, setBindingStrength] = useState<
    'Required' | 'Extensible' | 'Preferred' | 'Example'
  >('Required');
  const [fixedJson, setFixedJson] = useState('');
  const [patternJson, setPatternJson] = useState('');

  // EPIC 2: Valid child paths
  const validPaths = getValidChildPaths(element);
  const isPathValid = relativePath.trim()
    ? isValidChildPath(element, relativePath.trim())
    : true;

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleAddChildConstraint = async () => {
    if (!selectedSlice || !relativePath.trim()) return;

    // EPIC 2: Prevent invalid paths
    if (!isPathValid) {
      alert('Invalid child path. Please select a valid path from the suggestions or use a known FHIR element.');
      return;
    }

    const minNum = parseInt(min, 10);
    if (isNaN(minNum)) {
      alert('Invalid minimum cardinality');
      return;
    }

    const command: {
      commandType: string;
      path: string;
      sliceName: string;
      relativePath: string;
      min?: number;
      max?: string;
      valueSetUrl?: string;
      strength?: string;
      value?: unknown;
    } = {
      commandType: 'SetSliceElementCardinality',
      path: element.path,
      sliceName: selectedSlice.sliceName,
      relativePath: relativePath.trim(),
      min: minNum,
      max: max.trim(),
    };

    await applyCommand(command);

    // If binding is specified, send binding command
    if (bindingUrl.trim()) {
      await applyCommand({
        commandType: 'SetSliceElementBinding',
        path: element.path,
        sliceName: selectedSlice.sliceName,
        relativePath: relativePath.trim(),
        valueSetUrl: bindingUrl.trim(),
        strength: bindingStrength,
      });
    }

    // If fixed value is specified, send fixed command
    if (fixedJson.trim()) {
      try {
        const fixedValue = JSON.parse(fixedJson);
        await applyCommand({
          commandType: 'SetSliceElementFixed',
          path: element.path,
          sliceName: selectedSlice.sliceName,
          relativePath: relativePath.trim(),
          value: fixedValue,
        });
      } catch (error) {
        alert('Invalid JSON for fixed value');
        return;
      }
    }

    // If pattern value is specified, send pattern command
    if (patternJson.trim()) {
      try {
        const patternValue = JSON.parse(patternJson);
        await applyCommand({
          commandType: 'SetSliceElementPattern',
          path: element.path,
          sliceName: selectedSlice.sliceName,
          relativePath: relativePath.trim(),
          value: patternValue,
        });
      } catch (error) {
        alert('Invalid JSON for pattern value');
        return;
      }
    }

    // Reset form
    setRelativePath('');
    setMin('0');
    setMax('*');
    setBindingUrl('');
    setFixedJson('');
    setPatternJson('');
  };

  const handleRemoveChildConstraint = async (relativePath: string) => {
    if (!selectedSlice) return;
    if (!confirm(`Remove constraint on "${relativePath}"?`)) return;

    await applyCommand({
      commandType: 'RemoveSliceElementConstraint',
      path: element.path,
      sliceName: selectedSlice.sliceName,
      relativePath,
    });
  };

  const handleClearFixed = async (relativePath: string) => {
    if (!selectedSlice) return;

    await applyCommand({
      commandType: 'ClearSliceElementFixed',
      path: element.path,
      sliceName: selectedSlice.sliceName,
      relativePath,
    });
  };

  const handleClearPattern = async (relativePath: string) => {
    if (!selectedSlice) return;

    await applyCommand({
      commandType: 'ClearSliceElementPattern',
      path: element.path,
      sliceName: selectedSlice.sliceName,
      relativePath,
    });
  };

  // ========================================================================
  // Render
  // ========================================================================

  if (element.slices.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold mb-4">No Slices Available</h2>
          <p className="text-gray-600 mb-4">
            Please add slices to this element before configuring child
            constraints.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Slice Child Constraint Editor</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
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

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Element Path */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Element Path
            </label>
            <div className="px-3 py-2 bg-gray-100 rounded font-mono text-sm">
              {element.path}
            </div>
          </div>

          {/* Slice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Slice
            </label>
            <select
              value={selectedSlice?.sliceName ?? ''}
              onChange={(e) => {
                const slice = element.slices.find(
                  (s) => s.sliceName === e.target.value
                );
                setSelectedSlice(slice ?? null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              {element.slices.map((slice) => (
                <option key={slice.sliceName} value={slice.sliceName}>
                  {slice.sliceName}
                </option>
              ))}
            </select>
          </div>

          {/* Existing Child Constraints */}
          {selectedSlice && selectedSlice.children.length > 0 && (
            <div className="border border-gray-300 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Existing Constraints</h3>
              {selectedSlice.children.map((child) => (
                <div
                  key={child.relativePath}
                  className="border border-gray-200 rounded p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{child.relativePath}</span>
                    <button
                      onClick={() =>
                        handleRemoveChildConstraint(child.relativePath)
                      }
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Cardinality */}
                  {child.cardinality && (
                    <div className="text-sm text-gray-600">
                      Cardinality: {child.cardinality.min}..{child.cardinality.max}
                    </div>
                  )}

                  {/* Binding */}
                  {(() => {
                    const binding = child.overrideBinding ?? child.baseBinding;
                    if (!binding) return null;
                    return (
                      <div className="text-sm text-gray-600">
                        Binding: {binding.valueSetUrl} ({binding.strength})
                      </div>
                    );
                  })()}

                  {/* Fixed Value */}
                  {child.fixedValue && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-700">
                        Fixed Value:
                      </div>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(child.fixedValue, null, 2)}
                      </pre>
                      <button
                        onClick={() => handleClearFixed(child.relativePath)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Clear Fixed
                      </button>
                    </div>
                  )}

                  {/* Pattern Value */}
                  {child.patternValue && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-700">
                        Pattern Value:
                      </div>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(child.patternValue, null, 2)}
                      </pre>
                      <button
                        onClick={() => handleClearPattern(child.relativePath)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Clear Pattern
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add New Child Constraint */}
          <div className="border border-gray-300 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Add Child Constraint</h3>

            {/* Relative Path — EPIC 2 with Suggestions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relative Path *
              </label>
              
              {/* EPIC 2: Path Suggestions (if valid paths exist) */}
              {validPaths.length > 0 && (
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-xs font-medium text-blue-900 mb-2">
                    Suggested child paths:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {validPaths.map((path) => (
                      <button
                        key={path}
                        onClick={() => setRelativePath(path)}
                        className="px-2 py-1 text-xs bg-white border border-blue-300 rounded hover:bg-blue-100"
                      >
                        {path}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <input
                type="text"
                placeholder="e.g., system, value, code"
                value={relativePath}
                onChange={(e) => setRelativePath(e.target.value)}
                className={`w-full px-3 py-2 border rounded ${
                  relativePath.trim() && !isPathValid
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              
              {/* EPIC 2: Validation Feedback */}
              {relativePath.trim() && !isPathValid && (
                <div className="text-xs text-red-600 mt-1">
                  ⚠ This path may not be applicable to this element structure.
                  Use suggested paths above for best results.
                </div>
              )}
            </div>

            {/* Cardinality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cardinality
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded"
                  placeholder="Min"
                />
                <span>..</span>
                <input
                  type="text"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded"
                  placeholder="Max"
                />
              </div>
            </div>

            {/* Binding */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Binding (Optional)
              </label>
              <div className="space-y-2">
                <ValueSetPicker
                  value={bindingUrl || null}
                  onChange={(url) => setBindingUrl(url || '')}
                  disabled={false}
                />
                <select
                  value={bindingStrength}
                  onChange={(e) =>
                    setBindingStrength(
                      e.target.value as
                        | 'Required'
                        | 'Extensible'
                        | 'Preferred'
                        | 'Example'
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="Required">Required</option>
                  <option value="Extensible">Extensible</option>
                  <option value="Preferred">Preferred</option>
                  <option value="Example">Example</option>
                </select>
              </div>
            </div>

            {/* Fixed Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fixed Value (Optional JSON)
              </label>
              <textarea
                placeholder='{"system": "http://loinc.org", "code": "85354-9"}'
                value={fixedJson}
                onChange={(e) => {
                  setFixedJson(e.target.value);
                  if (e.target.value.trim()) {
                    setPatternJson(''); // Clear pattern if fixed is set
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                rows={3}
              />
              <div className="text-xs text-gray-500 mt-1">
                Treated as opaque JSON. No validation performed. Clears pattern.
              </div>
            </div>

            {/* Pattern Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pattern Value (Optional JSON)
              </label>
              <textarea
                placeholder='{"system": "http://loinc.org"}'
                value={patternJson}
                onChange={(e) => {
                  setPatternJson(e.target.value);
                  if (e.target.value.trim()) {
                    setFixedJson(''); // Clear fixed if pattern is set
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                rows={3}
              />
              <div className="text-xs text-gray-500 mt-1">
                Treated as opaque JSON. No validation performed. Clears fixed.
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddChildConstraint}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Child Constraint
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
