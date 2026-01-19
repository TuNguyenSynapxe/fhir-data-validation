import React, { useState, useEffect } from 'react';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';

interface SliceConstraintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  element: any; // ElementDesign
  sliceName: string;
}

interface SliceCondition {
  discriminatorPath: string;
  discriminatorType: string;
  conditionType: 'none' | 'fixed' | 'pattern';
  value: any;
}

/**
 * EPIC 3: Slice Constraint Drawer
 * 
 * Configure constraints for a specific slice:
 * - View inherited discriminators (READ-ONLY)
 * - Set conditions per discriminator (CORE EPIC 3)
 * - Optional cardinality override
 * - Optional metadata (short label, description)
 * 
 * RULES:
 * - Cannot edit discriminators (they're element-level)
 * - Cannot edit slicing rules (they're element-level)
 * - Must have at least one condition to save
 * - Slice appears in tree ONLY after conditions are saved
 */
export function SliceConstraintDrawer({
  isOpen,
  onClose,
  element,
  sliceName,
}: SliceConstraintDrawerProps) {
  const applyCommand = useSdBuilderStore((state: any) => state.applyCommand);

  const slice = element.slices?.[sliceName];
  const discriminators = element.slicing?.discriminators || [];

  // Local state for editing
  const [conditions, setConditions] = useState<Record<string, SliceCondition>>({});
  const [minCardinality, setMinCardinality] = useState<string>('');
  const [maxCardinality, setMaxCardinality] = useState<string>('');
  const [shortLabel, setShortLabel] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Initialize from existing slice data
  useEffect(() => {
    if (!isOpen || !slice) return;

    // Initialize conditions from existing pattern/fixed values
    const initialConditions: Record<string, SliceCondition> = {};
    discriminators.forEach((disc: any) => {
      const key = `${disc.type}:${disc.path}`;
      initialConditions[key] = {
        discriminatorPath: disc.path,
        discriminatorType: disc.type,
        conditionType: 'none',
        value: null,
      };

      // Check if there's an existing pattern value
      if (slice.PatternValues && slice.PatternValues[disc.path]) {
        initialConditions[key].conditionType = 'pattern';
        initialConditions[key].value = slice.PatternValues[disc.path];
      }
      // Check if there's an existing fixed value
      else if (slice.FixedValues && slice.FixedValues[disc.path]) {
        initialConditions[key].conditionType = 'fixed';
        initialConditions[key].value = slice.FixedValues[disc.path];
      }
    });

    setConditions(initialConditions);
    setMinCardinality(slice.OverrideCardinality?.min?.toString() || '');
    setMaxCardinality(slice.OverrideCardinality?.max || '');
    setShortLabel(''); // TODO: Load from metadata
    setDescription(''); // TODO: Load from metadata
  }, [isOpen, slice, discriminators]);

  if (!isOpen || !element) return null;

  const handleConditionChange = (key: string, updates: Partial<SliceCondition>) => {
    setConditions(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
    setError('');
  };

  const validateAndSave = async () => {
    setError('');

    // Validate: At least one discriminator must have a condition
    const hasCondition = Object.values(conditions).some(
      c => c.conditionType !== 'none' && c.value
    );

    if (!hasCondition) {
      setError('At least one discriminator must have a condition defined');
      return;
    }

    // Validate cardinality if provided
    if (minCardinality || maxCardinality) {
      const min = parseInt(minCardinality) || 0;
      const max = maxCardinality === '*' ? '*' : parseInt(maxCardinality) || 0;

      if (max !== '*' && min > parseInt(max.toString())) {
        setError('Minimum cardinality cannot exceed maximum');
        return;
      }
    }

    // Build command payload
    const patternValues: Record<string, any> = {};
    const fixedValues: Record<string, any> = {};

    Object.values(conditions).forEach(condition => {
      if (condition.conditionType === 'pattern' && condition.value) {
        patternValues[condition.discriminatorPath] = condition.value;
      } else if (condition.conditionType === 'fixed' && condition.value) {
        fixedValues[condition.discriminatorPath] = condition.value;
      }
    });

    try {
      await applyCommand({
        commandType: 'SetSliceConstraint',
        path: element.path,
        sliceName,
        patternValues,
        fixedValues,
        cardinality: (minCardinality || maxCardinality) ? {
          min: parseInt(minCardinality) || 0,
          max: maxCardinality || '*'
        } : null,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save slice constraint:', err);
      setError('Failed to save constraints. Please try again.');
    }
  };

  const hasAnyCondition = Object.values(conditions).some(
    c => c.conditionType !== 'none'
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="absolute right-0 top-0 h-full w-[700px] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Slice: {sliceName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure constraints for this slice
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
          {/* A: Discriminator Reference (READ-ONLY) */}
          <div className="bg-green-50 border-2 border-green-300 rounded p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-3">
              Discriminator Rules (from slicing)
            </h3>
            {discriminators.length > 0 ? (
              <div className="space-y-2">
                {discriminators.map((disc: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-green-200"
                  >
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                      {disc.type}
                    </span>
                    <span className="font-mono text-sm text-gray-800">→ {disc.path}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-800">No discriminators configured</p>
            )}
            <p className="text-xs text-green-700 mt-3 bg-white p-2 rounded border border-green-200">
              ℹ️ All slices use the same discriminator paths (cannot be edited per slice)
            </p>
          </div>

          {/* B: Slice Conditions (CORE EPIC 3) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Slice Conditions
            </h3>
            <p className="text-xs text-gray-600">
              Define conditions for at least one discriminator to save this slice.
            </p>

            {discriminators.map((disc: any, idx: number) => {
              const key = `${disc.type}:${disc.path}`;
              const condition = conditions[key] || {
                discriminatorPath: disc.path,
                discriminatorType: disc.type,
                conditionType: 'none',
                value: null,
              };

              return (
                <div key={key} className="border border-gray-200 rounded p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-gray-500">
                        {disc.type} → {disc.path}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Condition Type
                    </label>
                    <select
                      value={condition.conditionType}
                      onChange={(e) => handleConditionChange(key, {
                        conditionType: e.target.value as any,
                        value: e.target.value === 'none' ? null : condition.value
                      })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="none">No condition</option>
                      <option value="pattern">Pattern (recommended)</option>
                      <option value="fixed">Fixed (strict)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {condition.conditionType === 'none' && 'This discriminator is not constrained'}
                      {condition.conditionType === 'pattern' && 'Pattern: Value must match this pattern'}
                      {condition.conditionType === 'fixed' && 'Fixed: Value must exactly match this value'}
                    </p>
                  </div>

                  {condition.conditionType !== 'none' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={condition.value || ''}
                        onChange={(e) => handleConditionChange(key, { value: e.target.value })}
                        placeholder={`Enter ${condition.conditionType} value...`}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Value to match against {disc.path}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* C: Slice Cardinality (Optional) */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Slice Cardinality (Optional)
            </h3>
            <p className="text-xs text-gray-600">
              Base: {element.baseCardinality?.min || 0}..{element.baseCardinality?.max || '*'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Min
                </label>
                <input
                  type="number"
                  min="0"
                  value={minCardinality}
                  onChange={(e) => {
                    setMinCardinality(e.target.value);
                    setError('');
                  }}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max (* = unbounded)
                </label>
                <input
                  type="text"
                  value={maxCardinality}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '*' || val === '' || /^\d+$/.test(val)) {
                      setMaxCardinality(val);
                      setError('');
                    }
                  }}
                  placeholder="*"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* D: Slice Metadata (Optional) */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Slice Metadata (Optional)
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Short Label
              </label>
              <input
                type="text"
                value={shortLabel}
                onChange={(e) => setShortLabel(e.target.value)}
                placeholder="e.g., Hearing"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Brief human-readable label
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Used for hearing-related observations"
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Detailed description of this slice's purpose
              </p>
            </div>
          </div>

          {/* Validation Warning */}
          {!hasAnyCondition && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ At least one discriminator must have a condition before saving
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-xs text-red-800">
                ⚠️ {error}
              </p>
            </div>
          )}
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
            onClick={validateAndSave}
            disabled={!hasAnyCondition}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save Constraints
          </button>
        </div>
      </div>
    </div>
  );
}
