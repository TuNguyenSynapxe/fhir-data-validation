import React, { useState } from 'react';

interface AddSliceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  elementPath: string;
  discriminators: Array<{ type: string; path: string }>;
  existingSliceNames: string[];
  onAdd: (sliceName: string) => void;
}

/**
 * Drawer for adding slices to a sliced element.
 * Shows inherited discriminators (read-only) to reinforce FHIR semantics:
 * - All slices share the same discriminators
 * - Discriminators are element-level, not slice-level
 * 
 * EPIC 3 Extension: This drawer will be extended to include:
 * - Slice cardinality
 * - Slice-specific conditions
 * - Slice-specific constraints
 */
export function AddSliceDrawer({
  isOpen,
  onClose,
  elementPath,
  discriminators,
  existingSliceNames,
  onAdd,
}: AddSliceDrawerProps) {
  const [sliceName, setSliceName] = useState('');
  const [error, setError] = useState('');

  const handleApply = () => {
    setError('');
    
    if (!sliceName.trim()) {
      setError('Slice name is required');
      return;
    }
    
    // Validate slice name format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(sliceName)) {
      setError('Slice name must start with a letter and contain only letters, numbers, hyphens, or underscores');
      return;
    }
    
    // Check for duplicates
    if (existingSliceNames.includes(sliceName)) {
      setError('A slice with this name already exists');
      return;
    }
    
    onAdd(sliceName);
    setSliceName('');
    setError('');
    onClose();
  };

  const handleCancel = () => {
    setSliceName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleCancel}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-[600px] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Slice</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create a named category for this element
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Element Context */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-xs font-medium text-blue-900 mb-1">Parent Element</div>
            <div className="font-mono text-sm text-blue-800">{elementPath}</div>
          </div>

          {/* Active Discriminators (Read-only) */}
          <div className="p-4 bg-green-50 border-2 border-green-300 rounded">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-semibold text-green-900">
                Active Discriminators (Shared)
              </div>
              <span
                className="text-xs text-green-700 cursor-help"
                title="All slices use the same discriminators"
              >
                ℹ️
              </span>
            </div>
            
            {discriminators.length > 0 ? (
              <div className="space-y-2">
                {discriminators.map((disc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-green-200"
                  >
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                      {disc.type}
                    </span>
                    <span className="font-mono text-sm text-gray-800">{disc.path}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-green-800">
                No discriminators configured
              </div>
            )}
            
            <div className="mt-3 text-xs text-green-700 bg-white p-2 rounded border border-green-200">
              ✓ All slices share the same discriminators
            </div>
          </div>

          {/* Slice Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slice Name <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Choose a descriptive name for this slice (e.g., "systolic", "diastolic", "hearing")
            </p>
            <input
              type="text"
              value={sliceName}
              onChange={(e) => {
                setSliceName(e.target.value);
                setError('');
              }}
              placeholder="e.g., systolic"
              className={`w-full px-3 py-2 border rounded ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && (
              <div className="mt-2 text-xs text-red-600">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* EPIC 3 Extension Point */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded">
            <div className="text-xs font-medium text-gray-700 mb-2">
              📋 EPIC 3: Additional slice configuration
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Slice cardinality (min/max)</div>
              <div>• Slice-specific conditions</div>
              <div>• Slice-specific constraints</div>
            </div>
            <div className="text-xs text-gray-500 mt-2 italic">
              Coming soon - configure via SliceConstraintPanel
            </div>
          </div>

          {/* Helper Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-xs text-blue-900 space-y-2">
              <div><strong>What happens next:</strong></div>
              <div>
                1. This slice will appear in the element tree with a 🔖 icon
              </div>
              <div>
                2. You can configure slice-specific constraints in the SliceConstraintPanel
              </div>
              <div>
                3. All slices will share the discriminators defined above
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!sliceName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add Slice
          </button>
        </div>
      </div>
    </div>
  );
}
