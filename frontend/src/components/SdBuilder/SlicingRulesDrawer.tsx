import React, { useState, useMemo } from 'react';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import { AddDiscriminatorDrawer } from './AddDiscriminatorDrawer';

interface SlicingRulesDrawerProps {
  isOpen: boolean;
  element: any;
  allElements: any[];
  onClose: () => void;
}

/**
 * SlicingRulesDrawer — Edit Slicing Rules & Discriminators
 * 
 * PURPOSE: Configure slicing rules and discriminators ONLY.
 * - Slicing rules (matching, order)
 * - Discriminators (list, add, remove)
 * 
 * EXPLICITLY OUT OF SCOPE:
 * - ❌ Slices (use Add Slice action)
 * - ❌ Slice constraints (EPIC 3)
 * 
 * FHIR Semantics:
 * - Discriminators are element-level, NOT per-slice
 * - All slices share the same discriminators
 * - Discriminators must exist before slices can be added
 */
export function SlicingRulesDrawer({
  isOpen,
  element,
  allElements,
  onClose,
}: SlicingRulesDrawerProps) {
  const applyCommand = useSdBuilderStore((state: any) => state.applyCommand);

  // Local state for editing
  const [rules, setRules] = useState<'Open' | 'Closed' | 'OpenAtEnd'>(
    element?.slicing?.rules || 'Open'
  );
  const [ordered, setOrdered] = useState(element?.slicing?.ordered || false);
  const [discriminators, setDiscriminators] = useState<Array<{ type: string; path: string }>>(
    element?.slicing?.discriminators || []
  );

  const [showAddDiscriminator, setShowAddDiscriminator] = useState(false);

  // Hooks must be called unconditionally
  React.useEffect(() => {
    if (isOpen && element?.slicing) {
      setRules(element.slicing.rules || 'Open');
      setOrdered(element.slicing.ordered || false);
      setDiscriminators(element.slicing.discriminators || []);
    }
  }, [isOpen, element]);

  // Early return AFTER all hooks
  if (!isOpen || !element) return null;

  const handleAddDiscriminator = (type: string, path: string) => {
    setDiscriminators([...discriminators, { type, path }]);
    setShowAddDiscriminator(false);
  };

  const handleRemoveDiscriminator = (index: number) => {
    setDiscriminators(discriminators.filter((_, i) => i !== index));
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
    onClose();
  };

  return (
    <>
      {/* Main Slicing Rules Drawer */}
      <div className="fixed inset-0 z-40 overflow-hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Drawer Panel */}
        <div className="absolute right-0 top-0 h-full w-[600px] bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Slicing Rules & Discriminators
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure how repeated elements are distinguished
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* SECTION A: Slicing Rules */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Slicing Rules
              </h3>

              {/* Matching */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matching
                </label>
                <select
                  value={rules}
                  onChange={(e) => setRules(e.target.value as 'Open' | 'Closed' | 'OpenAtEnd')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="OpenAtEnd">OpenAtEnd</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {rules === 'Open' && 'Additional slices not matching any discriminator are allowed anywhere.'}
                  {rules === 'Closed' && 'Only slices matching discriminators are allowed.'}
                  {rules === 'OpenAtEnd' && 'Additional slices allowed only at the end.'}
                </p>
              </div>

              {/* Ordered */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={ordered}
                    onChange={(e) => setOrdered(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Order matters
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When enabled, elements must appear in the order defined by slicing.
                </p>
              </div>
            </div>

            {/* SECTION B: Discriminators */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Discriminators
                </h3>
                <button
                  onClick={() => setShowAddDiscriminator(true)}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                >
                  Add Discriminator
                </button>
              </div>

              <p className="text-xs text-gray-600">
                Discriminators define how to distinguish one slice from another.
                All slices share the same discriminators.
              </p>

              {/* Discriminator List */}
              {discriminators.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No discriminators defined. Add at least one discriminator to enable slicing.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {discriminators.map((disc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded p-3"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {disc.type}
                        </span>
                        <span className="text-sm text-gray-500 mx-2">→</span>
                        <span className="text-sm text-gray-700">{disc.path}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveDiscriminator(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* INFO BOX: What this drawer does NOT do */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                What this configures
              </h4>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>How to match slices (matching rules)</li>
                <li>Whether order matters</li>
                <li>What paths distinguish slices (discriminators)</li>
              </ul>
              <p className="text-xs text-blue-800 mt-3">
                To add named slices, use the <strong>Add Slice</strong> action.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyConfiguration}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Apply Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Drawer: Add Discriminator */}
      {showAddDiscriminator && (
        <AddDiscriminatorDrawer
          isOpen={showAddDiscriminator}
          element={element}
          allElements={allElements}
          existingDiscriminators={discriminators}
          onClose={() => setShowAddDiscriminator(false)}
          onAdd={handleAddDiscriminator}
        />
      )}
    </>
  );
}
