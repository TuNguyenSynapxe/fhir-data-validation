/**
 * SliceConstraintPanel Component — EPIC 3
 * 
 * Configure slice-specific constraints for a named slice.
 * 
 * Shows:
 * - Read-only discriminator reference (from EPIC 2)
 * - Slice condition editor (per discriminator path)
 * - Slice cardinality override
 * - Slice metadata (optional)
 * 
 * Hard Constraints:
 * - ❌ Cannot edit discriminator paths
 * - ❌ Cannot add/remove discriminators
 * - ❌ Cannot configure on base element
 * - ✅ Conditions only for defined discriminator paths
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import type { ElementDesign, Discriminator } from '../../api/sdBuilderApi';

interface SliceConstraintPanelProps {
  element: ElementDesign;
  sliceName: string;
  onClose: () => void;
}

interface SliceCondition {
  discriminatorPath: string;
  type: 'fixed' | 'pattern' | null;
  value: any;
}

// Helper to get child element type from parent
function getChildElementType(element: ElementDesign, discriminatorPath: string): string[] {
  // Simple heuristic: if path ends with common type names, return those
  const path = discriminatorPath.toLowerCase();
  if (path === 'code') return ['CodeableConcept', 'Coding', 'code'];
  if (path === 'system') return ['uri'];
  if (path === 'value') return ['string', 'boolean', 'integer'];
  if (path === 'url') return ['uri'];
  if (path === 'use') return ['code'];
  return ['string']; // Default fallback
}

export const SliceConstraintPanel: React.FC<SliceConstraintPanelProps> = ({
  element,
  sliceName,
  onClose,
}) => {
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  
  // Get slice data - handle both array and object types
  let sliceData: any = null;
  if (element.slices) {
    if (Array.isArray(element.slices)) {
      sliceData = element.slices.find((s: any) => s.sliceName === sliceName);
    } else if (typeof element.slices === 'object') {
      sliceData = (element.slices as any)[sliceName];
    }
  }

  if (!sliceData) {
    return (
      <div className="slice-constraint-panel-error">
        <p>Slice "{sliceName}" not found</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  // Get discriminators from slicing config (EPIC 2)
  const discriminators = element.slicing?.discriminators || [];

  // Local state
  const [conditions, setConditions] = useState<Record<string, SliceCondition>>({});
  const [minCardinality, setMinCardinality] = useState<string>('');
  const [maxCardinality, setMaxCardinality] = useState<string>('');
  const [shortLabel, setShortLabel] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [cardinalityError, setCardinalityError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize state from existing slice data
  useEffect(() => {
    if (sliceData?.cardinality) {
      setMinCardinality(sliceData.cardinality.min?.toString() || '');
      setMaxCardinality(sliceData.cardinality.max || '');
    }
  }, [sliceData]);

  const handleConditionTypeChange = (discPath: string, type: 'fixed' | 'pattern' | '') => {
    setConditions(prev => ({
      ...prev,
      [discPath]: {
        discriminatorPath: discPath,
        type: type === '' ? null : type,
        value: null,
      }
    }));
  };

  const handleConditionValueChange = (discPath: string, value: any) => {
    setConditions(prev => ({
      ...prev,
      [discPath]: {
        ...prev[discPath],
        value: value,
      }
    }));
  };

  const validateCardinality = (min: string, max: string): string => {
    const baseMin = element.baseCardinality.min;
    const baseMax = element.baseCardinality.max;
    
    if (!min && !max) return ''; // Empty is OK (inherits base)
    
    const minNum = parseInt(min) || 0;
    const maxValue = max || '*';
    
    // Validate min
    if (minNum < baseMin) {
      return `Slice min (${minNum}) cannot be less than base min (${baseMin})`;
    }
    
    // Validate max
    if (baseMax !== '*' && maxValue !== '*') {
      const baseMaxNum = parseInt(baseMax);
      const maxNum = parseInt(maxValue);
      if (maxNum > baseMaxNum) {
        return `Slice max (${maxNum}) cannot be greater than base max (${baseMax})`;
      }
    }
    
    // Validate min <= max
    if (maxValue !== '*') {
      const maxNum = parseInt(maxValue);
      if (minNum > maxNum) {
        return `Min (${minNum}) cannot be greater than max (${maxNum})`;
      }
    }
    
    return '';
  };

  const handleMinCardinalityChange = (value: string) => {
    setMinCardinality(value);
    const error = validateCardinality(value, maxCardinality);
    setCardinalityError(error);
  };

  const handleMaxCardinalityChange = (value: string) => {
    setMaxCardinality(value);
    const error = validateCardinality(minCardinality, value);
    setCardinalityError(error);
  };

  const handleSave = async () => {
    // Validate cardinality before saving
    if (cardinalityError) {
      toast.error('Please fix cardinality errors before saving', {
        duration: 3000,
        position: 'bottom-right',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Build cardinality object if either min or max is set
      const cardinality = (minCardinality || maxCardinality) ? {
        min: parseInt(minCardinality) || 0,
        max: maxCardinality || '*'
      } : null;

      // Build conditions array from state
      const conditionsList = Object.values(conditions).filter(c => c.type !== null);

      // Send SetSliceConstraint command to backend
      await applyCommand({
        commandType: 'SetSliceConstraint',
        path: element.path,
        sliceName: sliceName,
        cardinality: cardinality,
        conditions: conditionsList.map(c => ({
          discriminatorPath: c.discriminatorPath,
          type: c.type,
          value: c.value
        })),
        metadata: (shortLabel || description) ? {
          shortLabel: shortLabel || undefined,
          description: description || undefined
        } : undefined
      });

      toast.success(`Slice "${sliceName}" constraints saved`, {
        duration: 2000,
        position: 'bottom-right',
      });

      onClose();
    } catch (err) {
      console.error('❌ Failed to save slice constraints:', err);
      toast.error('Failed to save slice constraints', {
        duration: 3000,
        position: 'bottom-right',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Slice: {sliceName}</h2>
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
          {/* Section 1: Discriminator Reference (Read-only) */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-blue-900 mb-2">
              Discriminator rules (from slicing):
            </h3>
            {discriminators.length > 0 ? (
              <ul className="list-none space-y-1 mb-3">
                {discriminators.map((disc, idx) => (
                  <li key={idx} className="text-sm text-blue-800">
                    • {disc.type.toLowerCase()} → {disc.path}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-blue-800 mb-3">No discriminators defined</p>
            )}
            <p className="text-xs text-blue-700 italic">
              All slices use the same discriminator paths.
              This slice defines which values match them.
            </p>
          </div>

          {/* Section 2: Slice Conditions */}
          {discriminators.length > 0 ? (
            <div className="border border-gray-300 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Slice Conditions</h3>
              <p className="text-sm text-gray-600 mb-4">
                Define the values that match this slice for each discriminator.
              </p>
              
              {discriminators.map((disc, idx) => {
                const childTypes = getChildElementType(element, disc.path);
                const isPrimitive = childTypes.some(t => ['string', 'boolean', 'integer', 'decimal', 'code', 'uri'].includes(t));
                const isCoding = childTypes.includes('Coding') || disc.path === 'code';
                
                return (
                  <div key={idx} className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {disc.type.toLowerCase()} → {disc.path}
                      <span className="ml-2 text-xs text-gray-500">({childTypes.join(' | ')})</span>
                    </h4>
                    
                    {/* Condition Type Selector */}
                    <div className="flex gap-2 mb-2">
                      <select 
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                        value={conditions[disc.path]?.type || ''}
                        onChange={(e) => handleConditionTypeChange(disc.path, e.target.value as any)}
                      >
                        <option value="">No condition</option>
                        <option value="fixed">Fixed value</option>
                        <option value="pattern">Pattern</option>
                      </select>
                    </div>

                    {/* Value Editor - Context Specific */}
                    {conditions[disc.path]?.type && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Value:
                        </label>
                        
                        {/* Coding/Code Editor */}
                        {isCoding && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Code (e.g., 85354-9)"
                              value={conditions[disc.path]?.value?.code || ''}
                              onChange={(e) => handleConditionValueChange(disc.path, {
                                ...conditions[disc.path]?.value,
                                code: e.target.value
                              })}
                            />
                            <input
                              type="text"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="System (e.g., http://loinc.org)"
                              value={conditions[disc.path]?.value?.system || ''}
                              onChange={(e) => handleConditionValueChange(disc.path, {
                                ...conditions[disc.path]?.value,
                                system: e.target.value
                              })}
                            />
                            <p className="text-xs text-gray-500 italic">
                              Coding: code + system
                            </p>
                          </div>
                        )}
                        
                        {/* Boolean Editor */}
                        {!isCoding && childTypes.includes('boolean') && (
                          <div>
                            <select
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              value={conditions[disc.path]?.value?.toString() || ''}
                              onChange={(e) => handleConditionValueChange(disc.path, e.target.value === 'true')}
                            >
                              <option value="">Select...</option>
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          </div>
                        )}
                        
                        {/* Integer/Decimal Editor */}
                        {!isCoding && !childTypes.includes('boolean') && (childTypes.includes('integer') || childTypes.includes('decimal')) && (
                          <div>
                            <input
                              type="number"
                              step={childTypes.includes('decimal') ? '0.01' : '1'}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Enter number..."
                              value={conditions[disc.path]?.value || ''}
                              onChange={(e) => handleConditionValueChange(disc.path, 
                                childTypes.includes('integer') ? parseInt(e.target.value) : parseFloat(e.target.value)
                              )}
                            />
                          </div>
                        )}
                        
                        {/* String/Code/URI Editor (default) */}
                        {!isCoding && !childTypes.includes('boolean') && !childTypes.includes('integer') && !childTypes.includes('decimal') && (
                          <div>
                            <input
                              type="text"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Enter value..."
                              value={conditions[disc.path]?.value || ''}
                              onChange={(e) => handleConditionValueChange(disc.path, e.target.value)}
                            />
                            {childTypes.includes('uri') && (
                              <p className="text-xs text-gray-500 mt-1 italic">
                                URI format expected
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="text-sm text-amber-900">
                ⚠️ No discriminators defined. Configure slicing first.
              </p>
            </div>
          )}

          {/* Section 3: Slice Cardinality Override */}
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Slice Cardinality (Optional)</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Base:</span> {element.baseCardinality.min}..{element.baseCardinality.max}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Slice:</label>
                <input
                  type="number"
                  min="0"
                  placeholder="min"
                  value={minCardinality}
                  onChange={(e) => handleMinCardinalityChange(e.target.value)}
                  className={`w-20 px-2 py-1 border rounded text-sm ${
                    cardinalityError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <span className="text-sm">..</span>
                <input
                  type="text"
                  placeholder="max"
                  value={maxCardinality}
                  onChange={(e) => handleMaxCardinalityChange(e.target.value)}
                  className={`w-20 px-2 py-1 border rounded text-sm ${
                    cardinalityError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {cardinalityError && (
                <p className="text-xs text-red-600 font-medium">
                  ❌ {cardinalityError}
                </p>
              )}
              <p className="text-xs text-gray-500 italic">
                Leave empty to inherit base cardinality. Must be within base constraints.
              </p>
            </div>
          </div>

          {/* Section 4: Slice Metadata */}
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Slice Metadata (Optional)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Label
                </label>
                <input
                  type="text"
                  placeholder="Display label for this slice"
                  value={shortLabel}
                  onChange={(e) => setShortLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed description of this slice"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            disabled={discriminators.length === 0 || !!cardinalityError || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Slice Constraints'}
          </button>
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
