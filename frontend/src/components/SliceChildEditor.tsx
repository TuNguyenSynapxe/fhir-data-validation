/**
 * Slice Child Constraint Editor Component
 * 
 * Edit constraints on child elements within a slice:
 * - Cardinality
 * - Binding
 * - Fixed value (opaque JSON)
 * - Pattern value (opaque JSON)
 * 
 * Rules:
 * - Fixed and Pattern values are opaque JSON (no parsing/validation)
 * - Clearing fixed clears pattern and vice versa
 * - All changes call sendCommand()
 */

import React, { useState } from 'react';
import { useSdBuilderStore } from '../stores/useSdBuilderStore';
import type { ElementDesign, SliceDesign } from '../api/sdBuilderApi';

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

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleAddChildConstraint = async () => {
    if (!selectedSlice || !relativePath.trim()) return;

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
                  {child.binding && (
                    <div className="text-sm text-gray-600">
                      Binding: {child.binding.valueSetUrl} ({child.binding.strength})
                    </div>
                  )}

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

            {/* Relative Path */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relative Path *
              </label>
              <input
                type="text"
                placeholder="e.g., system, value, code"
                value={relativePath}
                onChange={(e) => setRelativePath(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
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
                <input
                  type="text"
                  placeholder="ValueSet URL"
                  value={bindingUrl}
                  onChange={(e) => setBindingUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
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
