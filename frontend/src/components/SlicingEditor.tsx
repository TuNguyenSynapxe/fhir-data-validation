/**
 * Slicing Editor Component
 * 
 * Configure slicing on an element:
 * - Add/remove slices
 * - Configure discriminators
 * - Set slicing rules (Open/Closed/OpenAtEnd)
 * - Set ordered flag
 * 
 * Rules:
 * - Discriminators treated as strings
 * - No validation logic
 * - All actions call sendCommand()
 */

import React, { useState } from 'react';
import { useSdBuilderStore } from '../stores/useSdBuilderStore';
import type { ElementDesign, Discriminator } from '../api/sdBuilderApi';

// ============================================================================
// Props
// ============================================================================

interface SlicingEditorProps {
  element: ElementDesign;
  onClose: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const SlicingEditor: React.FC<SlicingEditorProps> = ({
  element,
  onClose,
}) => {
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);

  // Local state for slicing configuration
  const [ordered, setOrdered] = useState(
    element.slicing?.ordered ?? false
  );
  const [rules, setRules] = useState<'Open' | 'Closed' | 'OpenAtEnd'>(
    element.slicing?.rules ?? 'Open'
  );
  const [discriminators, setDiscriminators] = useState<Discriminator[]>(
    element.slicing?.discriminators ?? []
  );

  // Local state for adding new discriminator
  const [newDiscType, setNewDiscType] = useState<
    'Value' | 'Pattern' | 'Type' | 'Profile' | 'Exists'
  >('Value');
  const [newDiscPath, setNewDiscPath] = useState('');

  // Local state for adding new slice
  const [newSliceName, setNewSliceName] = useState('');

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleConfigureSlicing = async () => {
    await applyCommand({
      commandType: 'ConfigureSlicing',
      path: element.path,
      ordered,
      rules,
      discriminators,
    });
  };

  const handleAddDiscriminator = () => {
    if (!newDiscPath.trim()) return;

    setDiscriminators([
      ...discriminators,
      { type: newDiscType, path: newDiscPath.trim() },
    ]);
    setNewDiscPath('');
  };

  const handleRemoveDiscriminator = (index: number) => {
    setDiscriminators(discriminators.filter((_, i) => i !== index));
  };

  const handleAddSlice = async () => {
    if (!newSliceName.trim()) return;

    await applyCommand({
      commandType: 'AddSlice',
      path: element.path,
      sliceName: newSliceName.trim(),
    });

    setNewSliceName('');
  };

  const handleRemoveSlice = async (sliceName: string) => {
    if (!confirm(`Remove slice "${sliceName}"?`)) return;

    await applyCommand({
      commandType: 'RemoveSlice',
      path: element.path,
      sliceName,
    });
  };

  const handleSetSliceCardinality = async (
    sliceName: string,
    min: number,
    max: string
  ) => {
    await applyCommand({
      commandType: 'SetSliceCardinality',
      path: element.path,
      sliceName,
      min,
      max,
    });
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Slicing Editor</h2>
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

          {/* Slicing Configuration */}
          <div className="border border-gray-300 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Slicing Configuration</h3>

            {/* Ordered */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ordered"
                checked={ordered}
                onChange={(e) => setOrdered(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="ordered" className="ml-2 text-sm text-gray-700">
                Ordered
              </label>
            </div>

            {/* Rules */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slicing Rules
              </label>
              <select
                value={rules}
                onChange={(e) =>
                  setRules(e.target.value as 'Open' | 'Closed' | 'OpenAtEnd')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="OpenAtEnd">Open At End</option>
              </select>
            </div>

            {/* Discriminators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discriminators
              </label>

              {/* Discriminator List */}
              {discriminators.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {discriminators.map((disc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {disc.type}
                        </span>
                        <span className="font-mono text-sm">{disc.path}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveDiscriminator(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mb-3">
                  No discriminators configured
                </div>
              )}

              {/* Add Discriminator */}
              <div className="flex gap-2">
                <select
                  value={newDiscType}
                  onChange={(e) =>
                    setNewDiscType(
                      e.target.value as
                        | 'Value'
                        | 'Pattern'
                        | 'Type'
                        | 'Profile'
                        | 'Exists'
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="Value">Value</option>
                  <option value="Pattern">Pattern</option>
                  <option value="Type">Type</option>
                  <option value="Profile">Profile</option>
                  <option value="Exists">Exists</option>
                </select>
                <input
                  type="text"
                  placeholder="Discriminator path"
                  value={newDiscPath}
                  onChange={(e) => setNewDiscPath(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded"
                />
                <button
                  onClick={handleAddDiscriminator}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Apply Configuration */}
            <button
              onClick={handleConfigureSlicing}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Apply Slicing Configuration
            </button>
          </div>

          {/* Slices */}
          <div className="border border-gray-300 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Slices</h3>

            {/* Existing Slices */}
            {element.slices.length > 0 ? (
              <div className="space-y-3">
                {element.slices.map((slice) => (
                  <div
                    key={slice.sliceName}
                    className="border border-gray-200 rounded p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{slice.sliceName}</span>
                      <button
                        onClick={() => handleRemoveSlice(slice.sliceName)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Slice Cardinality */}
                    <SliceCardinalityEditor
                      sliceName={slice.sliceName}
                      currentCardinality={slice.cardinality}
                      onSave={handleSetSliceCardinality}
                    />

                    {/* Slice Info */}
                    <div className="text-sm text-gray-600">
                      {(() => {
                        const binding = slice.overrideBinding ?? slice.baseBinding;
                        return binding && <div>Binding: {binding.valueSetUrl}</div>;
                      })()}
                      {slice.children.length > 0 && (
                        <div>{slice.children.length} child constraint(s)</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No slices defined</div>
            )}

            {/* Add Slice */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Slice name"
                value={newSliceName}
                onChange={(e) => setNewSliceName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              />
              <button
                onClick={handleAddSlice}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Slice
              </button>
            </div>
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

// ============================================================================
// Slice Cardinality Editor Sub-Component
// ============================================================================

interface SliceCardinalityEditorProps {
  sliceName: string;
  currentCardinality: { min: number; max: string } | null;
  onSave: (sliceName: string, min: number, max: string) => void;
}

const SliceCardinalityEditor: React.FC<SliceCardinalityEditorProps> = ({
  sliceName,
  currentCardinality,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [min, setMin] = useState(currentCardinality?.min.toString() ?? '0');
  const [max, setMax] = useState(currentCardinality?.max ?? '*');

  const handleSave = () => {
    const minNum = parseInt(min, 10);
    if (isNaN(minNum)) return;
    onSave(sliceName, minNum, max);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="text-sm text-gray-600 cursor-pointer hover:text-blue-600"
      >
        Cardinality:{' '}
        {currentCardinality
          ? `${currentCardinality.min}..${currentCardinality.max}`
          : 'Not set (click to edit)'}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
      />
      <span className="text-sm">..</span>
      <input
        type="text"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
      />
      <button
        onClick={handleSave}
        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Save
      </button>
      <button
        onClick={() => setEditing(false)}
        className="px-2 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
      >
        Cancel
      </button>
    </div>
  );
};
