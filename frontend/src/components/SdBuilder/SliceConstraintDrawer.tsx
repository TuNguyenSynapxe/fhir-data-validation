import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import { Layers, Lock, FlaskConical, Ruler, Tag, Save, Ban, Target, List, Code, Check, Info, AlertTriangle } from 'lucide-react';

interface SliceConstraintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  element: any; // ElementDesign
  sliceName: string;
}

interface SliceCondition {
  discriminatorPath: string;
  discriminatorType: string;
  operator: 'none' | 'equals' | 'in' | 'regex' | 'exists';
  value?: string;
  system?: string;
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
  // BUGFIX: Only depend on isOpen and sliceName to prevent form reset on every render
  useEffect(() => {
    if (!isOpen) return;

    console.log('[SliceConstraintDrawer] Initializing form');
    console.log('[SliceConstraintDrawer] slice data:', slice);
    console.log('[SliceConstraintDrawer] slice.Conditions:', slice?.Conditions);
    console.log('[SliceConstraintDrawer] slice.OverrideCardinality:', slice?.OverrideCardinality);
    console.log('[SliceConstraintDrawer] slice.Metadata:', slice?.Metadata);

    if (!slice) {
      console.warn('[SliceConstraintDrawer] Slice not found:', sliceName);
      return;
    }

    // Initialize conditions from existing conditions array
    const initialConditions: Record<string, SliceCondition> = {};
    const discs = element.slicing?.discriminators || [];
    
    discs.forEach((disc: any) => {
      const key = `${disc.type}:${disc.path}`;
      
      // Find existing condition for this discriminator
      const existingCondition = slice.Conditions?.find(
        (c: any) => c.DiscriminatorType === disc.type && c.DiscriminatorPath === disc.path
      );

      console.log(`[SliceConstraintDrawer] Discriminator ${key}:`, existingCondition);

      if (existingCondition) {
        initialConditions[key] = {
          discriminatorPath: disc.path,
          discriminatorType: disc.type,
          operator: existingCondition.Operator?.toLowerCase() || 'none', // Ensure lowercase
          value: existingCondition.Value,
          system: existingCondition.System,
        };
      } else {
        initialConditions[key] = {
          discriminatorPath: disc.path,
          discriminatorType: disc.type,
          operator: 'none',
        };
      }
    });

    console.log('[SliceConstraintDrawer] Initialized conditions:', initialConditions);

    setConditions(initialConditions);
    setMinCardinality(slice.OverrideCardinality?.Min?.toString() || '');
    setMaxCardinality(slice.OverrideCardinality?.Max || '');
    setShortLabel(slice.Metadata?.ShortLabel || '');
    setDescription(slice.Metadata?.Description || '');
  }, [isOpen, sliceName, element.path]); // BUGFIX: Only depend on isOpen, sliceName, and element.path

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

    console.log('[SliceConstraintDrawer] validateAndSave called');
    console.log('[SliceConstraintDrawer] conditions:', conditions);

    // Validate: At least one discriminator must have a non-"none" operator
    const hasCondition = Object.values(conditions).some(
      c => c.operator !== 'none'
    );

    console.log('[SliceConstraintDrawer] hasCondition:', hasCondition);

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

    // Build conditions array
    const conditionsArray = Object.values(conditions)
      .filter(c => c.operator !== 'none')
      .map(c => ({
        discriminatorType: c.discriminatorType,
        discriminatorPath: c.discriminatorPath,
        operator: c.operator,
        ...(c.value && { value: c.value }),
        ...(c.system && { system: c.system }),
      }));

    console.log('[SliceConstraintDrawer] conditionsArray:', conditionsArray);

    const command = {
      commandType: 'SetSliceConstraints',
      elementPath: element.path,
      sliceName,
      conditions: conditionsArray,
      ...(minCardinality || maxCardinality ? {
        overrideCardinality: {
          min: parseInt(minCardinality) || 0,
          max: maxCardinality || '*'
        }
      } : {}),
      ...((shortLabel || description) ? {
        metadata: {
          ...(shortLabel && { shortLabel }),
          ...(description && { description }),
        }
      } : {}),
    };

    console.log('[SliceConstraintDrawer] Sending command:', command);

    try {
      await applyCommand(command);
      console.log('[SliceConstraintDrawer] Command succeeded, closing drawer');
      toast.success('Slice constraints saved successfully');
      onClose();
    } catch (err) {
      console.error('[SliceConstraintDrawer] Failed to save slice constraint:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to save constraints: ${errorMessage}`);
      toast.error(`Failed to save: ${errorMessage}`);
    }
  };

  const hasAnyCondition = Object.values(conditions).some(
    c => c.operator !== 'none'
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
                🧩 Slice: {sliceName}
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
            <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Discriminator rules (from slicing)
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
            <p className="text-xs text-green-700 mt-3 bg-white p-2 rounded border border-green-200 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> All slices share the same discriminator paths. This slice defines which values match them.
            </p>
          </div>

          {/* B: Slice Conditions (CORE EPIC 3) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <FlaskConical className="w-4 h-4" /> Slice Conditions
            </h3>
            <p className="text-xs text-gray-600 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Define the values that match this slice for each discriminator.
            </p>

            {discriminators.map((disc: any, idx: number) => {
              const key = `${disc.type}:${disc.path}`;
              const condition = conditions[key] || {
                discriminatorPath: disc.path,
                discriminatorType: disc.type,
                operator: 'none',
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
                      value={condition.operator}
                      onChange={(e) => handleConditionChange(key, {
                        operator: e.target.value as any,
                        value: e.target.value === 'none' ? undefined : condition.value
                      })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="none">No condition</option>
                      <option value="equals">Equals</option>
                      <option value="in">In (value set)</option>
                      <option value="regex">Regex pattern</option>
                      <option value="exists">Exists</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1 flex items-start gap-1.5">
                      {condition.operator === 'none' && <><Ban className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> This discriminator is not constrained</>}
                      {condition.operator === 'equals' && <><Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Value must exactly match</>}
                      {condition.operator === 'in' && <><List className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Value must be in the specified set</>}
                      {condition.operator === 'regex' && <><Code className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Value must match regex pattern</>}
                      {condition.operator === 'exists' && <><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Value must exist</>}
                    </p>
                  </div>

                  {condition.operator !== 'none' && condition.operator !== 'exists' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={condition.value || ''}
                        onChange={(e) => handleConditionChange(key, { value: e.target.value })}
                        placeholder={`Enter ${condition.operator} value...`}
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
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Ruler className="w-4 h-4" /> Slice Cardinality (Optional)
            </h3>
            <p className="text-xs text-gray-600 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Overrides how many times this slice may appear. Must remain within the base element's cardinality.
            </p>
            <p className="text-xs text-gray-500">
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
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4" /> Slice Metadata (Optional)
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Short Label
              </label>
              <input
                type="text"
                value={shortLabel}
                onChange={(e) => setShortLabel(e.target.value)}
                placeholder="Display label for this slice"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Used to show a friendly name in the tree and UI.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of this slice"
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
              <p className="text-xs text-yellow-800 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> At least one discriminator must have a matching condition.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {error}
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
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Slice Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
