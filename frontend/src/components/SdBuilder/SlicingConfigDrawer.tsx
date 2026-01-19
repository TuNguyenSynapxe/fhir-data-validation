/**
 * Slicing Configuration Drawer — Binding-Aligned UX
 * 
 * Drawer-based slicing configuration with tree-driven discriminator selection.
 * Enforces FHIR semantics: discriminators are element-level and shared across all slices.
 * 
 * Structure:
 * - Section A: Slicing Rules (Matching, Order)
 * - Section B: Discriminators (Add via drawer with tree selection)
 * - Section C: Slices (Add via drawer, disabled until discriminators exist)
 * 
 * NO FREE TEXT PATHS. NO PER-SLICE DISCRIMINATORS.
 */

import React, { useState } from 'react';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import type { ElementDesign, Discriminator } from '../../api/sdBuilderApi';
import { AddDiscriminatorDrawer } from './AddDiscriminatorDrawer';
import { AddSliceDrawer } from './AddSliceDrawer';

interface SlicingConfigDrawerProps {
  isOpen: boolean;
  element: ElementDesign;
  allElements?: ElementDesign[]; // Needed for discriminator path extraction
  onClose: () => void;
}

/**
 * Main slicing configuration drawer.
 * Replaces modal-based SlicingEditor with drawer-aligned UX.
 */
export function SlicingConfigDrawer({
  isOpen,
  element,
  allElements,
  onClose,
}: SlicingConfigDrawerProps) {
  const applyCommand = useSdBuilderStore((state: any) => state.applyCommand);

  // Slicing rules state
  const [ordered, setOrdered] = useState(element?.slicing?.ordered ?? false);
  const [rules, setRules] = useState<'Open' | 'Closed' | 'OpenAtEnd'>(
    element?.slicing?.rules ?? 'Open'
  );
  const [discriminators, setDiscriminators] = useState<Discriminator[]>(
    element?.slicing?.discriminators ?? []
  );

  // Sub-drawer states
  const [showAddDiscriminator, setShowAddDiscriminator] = useState(false);
  const [showAddSlice, setShowAddSlice] = useState(false);

  // Early return after hooks (Rules of Hooks compliance)
  if (!isOpen || !element) return null;

  // Handle discriminator operations
  const handleAddDiscriminator = (type: string, path: string) => {
    const newDisc: Discriminator = {
      type: type.charAt(0).toUpperCase() + type.slice(1) as 'Value' | 'Pattern' | 'Type' | 'Profile' | 'Exists',
      path,
    };
    setDiscriminators([...discriminators, newDisc]);
  };

  const handleRemoveDiscriminator = (index: number) => {
    setDiscriminators(discriminators.filter((_, i) => i !== index));
  };

  // Handle slice operations
  const handleAddSlice = (sliceName: string) => {
    applyCommand({
      command: 'AddSlice',
      elementPath: element.path,
      sliceName,
    });
  };

  const handleRemoveSlice = (sliceName: string) => {
    applyCommand({
      commandType: 'RemoveSlice',
      elementPath: element.path,
      sliceName,
    });
  };

  // Apply slicing configuration
  const handleApplyConfiguration = () => {
    applyCommand({
      commandType: 'ConfigureSlicing',
      elementPath: element.path,
      ordered,
      rules,
      discriminators,
    });
  };

  const existingSliceNames = (Array.isArray(element.slices) ? element.slices : []).map((s: any) => s.sliceName);

  return (
    <>
      {/* Main Slicing Drawer */}
      <div className="fixed inset-0 z-40 overflow-hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Drawer */}
        <div className="absolute right-0 top-0 h-full w-[700px] bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Configure Slicing</h2>
              <p className="text-sm text-gray-600 mt-1">
                Define how repeated elements are distinguished and categorized
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Element Path */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="text-xs font-medium text-gray-700 mb-1">Element Path</div>
              <div className="font-mono text-sm text-gray-900">{element.path}</div>
            </div>

            {/* ========================================================================
                SECTION A: SLICING RULES
                ======================================================================== */}
            <div className="border-2 border-blue-300 rounded-lg p-4 space-y-4 bg-blue-50">
              <div>
                <h3 className="font-semibold text-blue-900 text-base">Slicing Rules</h3>
                <p className="text-xs text-blue-700 mt-1">
                  How repeated elements are distinguished
                </p>
              </div>

              {/* Matching */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Matching
                </label>
                <select
                  value={rules}
                  onChange={(e) => setRules(e.target.value as 'Open' | 'Closed' | 'OpenAtEnd')}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                >
                  <option value="Open">Open (allows unsliced items)</option>
                  <option value="Closed">Closed (only sliced items)</option>
                  <option value="OpenAtEnd">Open At End (unsliced items at end)</option>
                </select>
              </div>

              {/* Order */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ordered"
                  checked={ordered}
                  onChange={(e) => setOrdered(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="ordered" className="ml-2 text-sm text-gray-700">
                  Order matters
                </label>
              </div>
            </div>

            {/* ========================================================================
                SECTION B: DISCRIMINATORS
                ======================================================================== */}
            <div className="border-2 border-green-300 rounded-lg p-4 space-y-4 bg-green-50">
              <div>
                <h3 className="font-semibold text-green-900 text-base">Discriminators</h3>
                <p className="text-xs text-green-700 mt-1">
                  Select element paths used to distinguish slices
                </p>
              </div>

              {/* Discriminator List */}
              {discriminators.length > 0 ? (
                <div className="space-y-2">
                  {discriminators.map((disc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded border border-green-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                          {disc.type}
                        </span>
                        <span className="font-mono text-sm text-gray-800">{disc.path}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveDiscriminator(idx)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600 bg-white p-3 rounded border border-green-200">
                  No discriminators configured. Click "Add Discriminator" below.
                </div>
              )}

              {/* Add Discriminator Button */}
              <button
                onClick={() => setShowAddDiscriminator(true)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
              >
                ➕ Add Discriminator
              </button>

              {/* Apply Configuration */}
              <button
                onClick={handleApplyConfiguration}
                disabled={discriminators.length === 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                Apply Slicing Configuration
              </button>
            </div>

            {/* ========================================================================
                SECTION C: SLICES
                ======================================================================== */}
            <div className="border-2 border-gray-300 rounded-lg p-4 space-y-4 bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">Slices</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Named categories of this element
                </p>
              </div>

              {/* Warning when no discriminators */}
              {discriminators.length === 0 && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded">
                  <div className="text-sm text-amber-900 font-medium">
                    ⚠️ Configure discriminators before adding slices
                  </div>
                  <div className="text-xs text-amber-700 mt-2">
                    Discriminators help distinguish repeated elements. Add at least one discriminator above.
                  </div>
                </div>
              )}

              {/* Slice List */}
              {(Array.isArray(element.slices) ? element.slices : []).length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Configured slices:
                  </div>
                  {[...(Array.isArray(element.slices) ? element.slices : [])]
                    .sort((a, b) => a.sliceName.localeCompare(b.sliceName))
                    .map((slice) => (
                      <div
                        key={slice.sliceName}
                        className="flex items-center justify-between bg-white px-4 py-2 rounded border border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔖</span>
                          <span className="font-medium text-gray-900">{slice.sliceName}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveSlice(slice.sliceName)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                </div>
              ) : discriminators.length > 0 ? (
                <div className="text-sm text-gray-500 bg-white p-3 rounded border border-gray-200">
                  No slices defined yet. Click "Add Slice" below.
                </div>
              ) : null}

              {/* Add Slice Button */}
              <button
                onClick={() => setShowAddSlice(true)}
                disabled={discriminators.length === 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                ➕ Add Slice
              </button>

              {/* Helper Text */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs text-blue-900 space-y-1">
                  <div><strong>What slicing does:</strong></div>
                  <div>Slicing defines how repeated elements are grouped.</div>
                  <div className="mt-2"><strong>What it does not do:</strong></div>
                  <div>Slice-specific constraints are configured separately.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Sub-drawers (Higher z-index) */}
      <AddDiscriminatorDrawer
        isOpen={showAddDiscriminator}
        onClose={() => setShowAddDiscriminator(false)}
        element={element}
        allElements={allElements || []}
        existingDiscriminators={discriminators}
        onAdd={handleAddDiscriminator}
      />

      <AddSliceDrawer
        isOpen={showAddSlice}
        onClose={() => setShowAddSlice(false)}
        elementPath={element.path}
        discriminators={discriminators}
        existingSliceNames={existingSliceNames}
        onAdd={handleAddSlice}
      />
    </>
  );
}
