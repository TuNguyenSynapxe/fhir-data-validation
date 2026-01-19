/**
 * Slicing Editor Component — EPIC 2 Context-Aware
 * 
 * Configure slicing on an element with intelligent defaults:
 * - Context-aware discriminator recommendations (based on type/binding/extension)
 * - Slice name suggestions from ValueSet preview (if previewable)
 * - Auto-collapsed advanced discriminators
 * - No AI logic, metadata-driven only
 * 
 * Rules:
 * 1. Show button only if max > 1 AND element has Coding/CodeableConcept/Binding/Extension
 * 2. Auto-recommend discriminator by priority (Value for Coding, Pattern for CodeableConcept, etc.)
 * 3. Suggest slice names from ValueSet codes if previewable
 * 4. Collapse non-recommended discriminators under "Advanced"
 * 
 * NO FIRELY SDK. NO AI SUGGESTIONS.
 */

import React, { useState, useEffect } from 'react';
import { useSdBuilderStore } from '../stores/useSdBuilderStore';
import type { ElementDesign, Discriminator } from '../api/sdBuilderApi';
import { getPreviewability, previewValueSetCodes, type ValueSetCodeDto } from '../api/terminologyApi';
import type { Previewability } from '../constants/bindingExplanations';
import {
  recommendDiscriminators,
  extractChildrenMetadata,
  type RecommendedDiscriminator,
} from './SdBuilder/slicing/recommendSlicing';

// ============================================================================
// Helper Functions — Context-Aware Logic
// ============================================================================

/**
 * RULE 1: Determine if "Configure Slicing" button should show
 * 
 * Show if ALL of:
 * 1. Element is repeatable (max > 1)
 * 2. Element is a valid slicing target:
 *    - Backbone element (container with children)
 *    - Complex type with discriminator candidates (Coding, CodeableConcept, binding)
 *    - Extension element
 * 
 * DO NOT show on:
 * - Primitive leaves (string, code, integer, etc.)
 * - Non-repeatable elements (0..1)
 * 
 * NOTE: For backbone elements, discriminators come from CHILDREN, not the element itself.
 * We allow slicing on any repeatable backbone/complex element, as discriminators are
 * defined during slicing configuration (not pre-validated here).
 */
export function shouldShowConfigureSlicing(element: ElementDesign): boolean {
  // Check 1: Must be repeatable
  const maxCard = element.overrideCardinality?.max ?? element.baseCardinality.max;
  const isRepeatable = maxCard === '*' || (maxCard !== '1' && parseInt(maxCard, 10) > 1);
  
  if (!isRepeatable) return false;

  const types = element.typeCodes;
  
  // Check 2: Must NOT be a primitive leaf
  // Primitive types cannot be sliced (slicing requires child elements or properties)
  const primitiveTypes = ['string', 'code', 'uri', 'url', 'canonical', 'oid', 'uuid',
    'boolean', 'integer', 'unsignedInt', 'positiveInt', 'decimal',
    'date', 'dateTime', 'time', 'instant', 'base64Binary', 'markdown', 'xhtml'];
  
  const isPrimitive = types.some(t => primitiveTypes.includes(t));
  if (isPrimitive) return false;
  
  // Check 3: Is a valid slicing target
  // Valid targets include:
  // a) Backbone elements (empty typeCodes or BackboneElement) - these are containers
  // b) Complex types with potential discriminators (Coding, CodeableConcept, Extension)
  // c) Elements with bindings (discriminator candidate)
  // d) Reference types (can discriminate by profile)
  
  const isBackbone = types.length === 0 || types.includes('BackboneElement');
  const isExtension = types.includes('Extension');
  const hasCoding = types.includes('Coding');
  const hasCodeableConcept = types.includes('CodeableConcept');
  const hasReference = types.includes('Reference');
  const hasBinding = !!(element.baseBinding || element.overrideBinding);
  
  // Allow slicing on:
  // - Backbone elements (discriminators from children)
  // - Complex types with discriminator potential
  // - Elements with bindings
  return isBackbone || isExtension || hasCoding || hasCodeableConcept || hasReference || hasBinding;
}

/**
 * RULE 2: Get recommended discriminator type based on element characteristics
 * Priority order:
 * 1. Coding → Value (recommended)
 * 2. CodeableConcept → Pattern (recommended)
 * 3. Has binding → Value
 * 4. Extension → Value
 * Otherwise → no recommendation (show all in Advanced)
 */
export function getRecommendedDiscriminator(element: ElementDesign): {
  type: 'Value' | 'Pattern' | 'Type' | 'Profile' | 'Exists';
  path: string;
  isRecommended: boolean;
} | null {
  const types = element.typeCodes;
  const hasBinding = !!(element.baseBinding || element.overrideBinding);

  if (types.includes('Coding')) {
    return { type: 'Value', path: '$this', isRecommended: true };
  }

  if (types.includes('CodeableConcept')) {
    return { type: 'Pattern', path: '$this', isRecommended: true };
  }

  if (hasBinding) {
    return { type: 'Value', path: '$this', isRecommended: true };
  }

  if (types.includes('Extension')) {
    return { type: 'Value', path: 'url', isRecommended: true };
  }

  return null;
}

// ============================================================================
// Props
// ============================================================================

interface SlicingEditorProps {
  element: ElementDesign;
  allElements?: ElementDesign[]; // For extracting children metadata
  onClose: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const SlicingEditor: React.FC<SlicingEditorProps> = ({
  element,
  allElements,
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

  // EPIC 2: Context-aware recommendations
  const recommendations = React.useMemo(() => {
    if (!allElements) return [];
    const children = extractChildrenMetadata(element.path, allElements);
    return recommendDiscriminators({
      elementPath: element.path,
      elementTypeCodes: element.typeCodes,
      children,
    });
  }, [element.path, element.typeCodes, allElements]);

  // Local state for adding new discriminator (NO placeholder/auto-prefill)
  const [newDiscType, setNewDiscType] = useState<
    'Value' | 'Pattern' | 'Type' | 'Profile' | 'Exists'
  >('Value');
  const [newDiscPath, setNewDiscPath] = useState('');

  // EPIC 2: Slice name suggestions from ValueSet preview
  const [suggestedSliceNames, setSuggestedSliceNames] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [previewability, setPreviewability] = useState<Previewability>('Unsupported');

  // Local state for adding new slice
  const [newSliceName, setNewSliceName] = useState('');

  // EPIC 2: Load slice name suggestions if binding is previewable
  useEffect(() => {
    const binding = element.overrideBinding ?? element.baseBinding;
    if (!binding) return;

    setLoadingSuggestions(true);

    previewValueSetCodes(binding.valueSetUrl, 20)
      .then((preview) => {
        const capability = getPreviewability(preview);
        setPreviewability(capability);

        if (capability === 'Explicit' || capability === 'Computed') {
          const names = preview.codes
            .filter((c) => c.display)
            .map((c) => c.display!)
            .slice(0, 10);
          setSuggestedSliceNames(names);
        }
      })
      .catch(() => {
        setPreviewability('Unsupported');
        setSuggestedSliceNames([]);
      })
      .finally(() => setLoadingSuggestions(false));
  }, [element.overrideBinding, element.baseBinding]);

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleConfigureSlicing = async () => {
    console.log('🔧 [SlicingEditor] handleConfigureSlicing called');
    console.log('📋 Config:', { path: element.path, ordered, rules, discriminators });
    
    try {
      console.log('⏳ Sending ConfigureSlicing command...');
      await applyCommand({
        commandType: 'ConfigureSlicing',
        path: element.path,
        ordered,
        rules,
        discriminators,
      });
      console.log('✅ ConfigureSlicing succeeded, closing modal');
      // Close modal after successful configuration
      onClose();
    } catch (error) {
      console.error('❌ [SlicingEditor] Failed to configure slicing:', error);
      // Modal stays open on error
    }
  };

  // Validation state for manual discriminator add
  const [validationError, setValidationError] = useState<string>('');

  const handleAddDiscriminator = () => {
    const path = newDiscPath.trim();
    
    // Validation: path must be non-empty
    if (!path) {
      setValidationError('Discriminator path cannot be empty');
      return;
    }

    // Validation: path must be a valid child element
    if (allElements) {
      const children = extractChildrenMetadata(element.path, allElements);
      const validPaths = children.map((c) => {
        const fullPath = c.path;
        if (fullPath.startsWith(element.path + '.')) {
          return fullPath.substring(element.path.length + 1);
        }
        return fullPath;
      });

      // Check if path is in valid children
      const isValidPath = validPaths.some((vp) => vp === path || path.startsWith(vp + '.'));
      if (!isValidPath) {
        setValidationError(
          `Invalid path. Valid child paths: ${validPaths.length > 0 ? validPaths.join(', ') : 'none'}`
        );
        return;
      }
    }

    // Clear validation error
    setValidationError('');

    // Add discriminator
    setDiscriminators([
      ...discriminators,
      { type: newDiscType, path },
    ]);
    setNewDiscPath('');
  };

  const handleRemoveDiscriminator = (index: number) => {
    setDiscriminators(discriminators.filter((_, i) => i !== index));
  };

  const handleAddSlice = async () => {
    console.log('➕ [SlicingEditor] handleAddSlice called');
    console.log('📝 Slice name:', newSliceName);
    console.log('📊 Current slices before add:', element.slices);
    
    if (!newSliceName.trim()) {
      console.log('⚠️ Slice name is empty, returning');
      return;
    }

    try {
      console.log('⏳ Sending AddSlice command...');
      await applyCommand({
        commandType: 'AddSlice',
        path: element.path,
        sliceName: newSliceName.trim(),
      });
      console.log('✅ AddSlice succeeded, clearing input');
      console.log('📊 Current slices after add:', element.slices);
      // Only clear input on success
      setNewSliceName('');
    } catch (error) {
      console.error('❌ [SlicingEditor] Failed to add slice:', error);
      // Keep input value on error
    }
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

          {/* ========================================================================
              SECTION A: SLICING RULES (SHARED)
              ======================================================================== */}
          <div className="border-2 border-blue-300 rounded-lg p-4 space-y-4 bg-blue-50">
            <div>
              <h3 className="font-semibold text-blue-900 text-lg">Slicing Rules (Shared)</h3>
              <p className="text-sm text-blue-700 mt-1">
                These rules apply to all slices of this element.
              </p>
            </div>

            {/* Matching Rules */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Matching
              </label>
              <select
                value={rules}
                onChange={(e) =>
                  setRules(e.target.value as 'Open' | 'Closed' | 'OpenAtEnd')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
              >
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="OpenAtEnd">Open At End</option>
              </select>
            </div>

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
                Order matters
              </label>
            </div>

            {/* Discriminators — EPIC 2 Context-Aware with Recommendations */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Discriminators
                </label>
                <span
                  className="text-xs text-gray-500 cursor-help"
                  title="Recommendations are based on element child types and bindings (no AI)"
                >
                  ℹ️
                </span>
              </div>

              {/* Discriminator List */}
              {discriminators.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {discriminators.map((disc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                          {disc.type}
                        </span>
                        <span className="font-mono text-sm">{disc.path}</span>
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
                <div className="text-sm text-gray-600 mb-3 bg-white p-3 rounded border border-gray-200">
                  No discriminators configured
                </div>
              )}

              {/* EPIC 2: Context-Aware Recommendations Panel */}
              {recommendations.length > 0 ? (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="text-sm font-semibold text-green-900 mb-2">
                    ⭐ Recommended Discriminator
                  </div>
                  <div className="space-y-2">
                    {recommendations.slice(0, 1).map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white p-2 rounded border-2 border-green-400 hover:border-green-500 cursor-pointer"
                        onClick={() => {
                          setNewDiscType(rec.type);
                          setNewDiscPath(rec.path);
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xl">⭐</span>
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded font-medium">
                            {rec.type}
                          </span>
                          <span className="font-mono text-sm text-gray-800 font-semibold">{rec.path}</span>
                          <span className="text-xs text-gray-600 ml-2">
                            {rec.reason}
                          </span>
                        </div>
                        <button className="text-xs text-green-600 hover:text-green-800 px-2 font-semibold">
                          Apply →
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-green-700 mt-2">
                    Click to apply the recommended discriminator, then add it below
                  </div>
                </div>
              ) : (
                <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                  No recommendations available for this element. Choose a discriminator type and path manually.
                </div>
              )}

              {/* Add Discriminator Form */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={newDiscType}
                    onChange={(e) => {
                      setNewDiscType(
                        e.target.value as
                          | 'Value'
                          | 'Pattern'
                          | 'Type'
                          | 'Profile'
                          | 'Exists'
                      );
                      setValidationError(''); // Clear error on change
                    }}
                    className="px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="Value">Value</option>
                    <option value="Pattern">Pattern</option>
                    <option value="Type">Type</option>
                    <option value="Profile">Profile</option>
                    <option value="Exists">Exists</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Discriminator path (e.g., code)"
                    value={newDiscPath}
                    onChange={(e) => {
                      setNewDiscPath(e.target.value);
                      setValidationError(''); // Clear error on change
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white"
                  />
                  <button
                    onClick={handleAddDiscriminator}
                    disabled={!newDiscPath.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                {validationError && (
                  <div className="text-xs text-red-600 px-2">
                    ⚠️ {validationError}
                  </div>
                )}
              </div>
            </div>

            {/* Apply Configuration */}
            <button
              onClick={handleConfigureSlicing}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
            >
              Apply Slicing Configuration
            </button>
          </div>

          {/* ========================================================================
              SECTION B: SLICES (NAMES ONLY)
              ======================================================================== */}
          <div className="border-2 border-gray-300 rounded-lg p-4 space-y-4 bg-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Slices</h3>
              <p className="text-sm text-gray-600 mt-1">
                Slices are categories of this element. Slice-specific constraints are configured separately.
              </p>
            </div>

            {/* Warning when no discriminators */}
            {discriminators.length === 0 && (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded">
                <div className="text-sm text-amber-900 font-medium">
                  ⚠️ Slicing requires at least one discriminator.
                </div>
                <div className="text-xs text-amber-700 mt-2">
                  Configure at least one discriminator before adding slices.
                </div>
              </div>
            )}

            {/* EPIC 2: Slice Name Suggestions (if binding is previewable) */}
            {discriminators.length > 0 && suggestedSliceNames.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <div className="text-sm font-medium text-green-900 mb-2">
                  💡 Suggested slice names from ValueSet:
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedSliceNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setNewSliceName(name)}
                      className="px-2 py-1 text-xs bg-white border border-green-300 rounded hover:bg-green-100"
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-green-700 mt-2">
                  Click to use as slice name, or type your own below
                </div>
              </div>
            )}

            {discriminators.length > 0 && loadingSuggestions && (
              <div className="text-sm text-gray-500 italic">
                Loading slice name suggestions...
              </div>
            )}

            {/* Existing Slices - Names Only */}
            {element.slices.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Configured slices:
                </div>
                {[...element.slices].sort((a, b) => 
                  a.sliceName.localeCompare(b.sliceName)
                ).map((slice) => (
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
                No slices defined yet
              </div>
            ) : null}

            {/* Add Slice */}
            {discriminators.length > 0 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Slice name"
                  value={newSliceName}
                  onChange={(e) => setNewSliceName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white"
                />
                <button
                  onClick={handleAddSlice}
                  disabled={!newSliceName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add Slice
                </button>
              </div>
            )}

            {/* Helper Text */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-xs text-blue-900 space-y-1">
                <div><strong>What slicing does:</strong></div>
                <div>Slicing defines how repeated elements are grouped.</div>
                <div className="mt-2"><strong>What it does not do:</strong></div>
                <div>Slice-specific constraints are configured in the next step.</div>
              </div>
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
