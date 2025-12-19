import React from 'react';
import type { RefinementMode } from '../../types/fhirPathRefinement';

/**
 * RefinementModeSelector - Radio button selector for refinement modes
 * 
 * Phase 1 modes:
 * - First element (default)
 * - All elements [*]
 * - Index [n]
 * - Filter (where)
 */
interface RefinementModeSelectorProps {
  selectedMode: RefinementMode;
  onChange: (mode: RefinementMode) => void;
  disabled?: boolean;
}

const RefinementModeSelector: React.FC<RefinementModeSelectorProps> = ({
  selectedMode,
  onChange,
  disabled = false,
}) => {
  const modes: { value: RefinementMode; label: string; description: string }[] = [
    {
      value: 'first',
      label: 'First element (default)',
      description: 'No modification to the path',
    },
    {
      value: 'all',
      label: 'All elements [*]',
      description: 'Apply to all items in array',
    },
    {
      value: 'index',
      label: 'Index [n]',
      description: 'Select specific array index',
    },
    {
      value: 'filter',
      label: 'Filter (where)',
      description: 'Apply where condition',
    },
  ];

  return (
    <div className="space-y-2">
      {modes.map((mode) => (
        <label
          key={mode.value}
          className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
            selectedMode === mode.value
              ? 'bg-blue-50 border-blue-500'
              : 'bg-white border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name="refinement-mode"
            value={mode.value}
            checked={selectedMode === mode.value}
            onChange={() => onChange(mode.value)}
            disabled={disabled}
            className="mt-0.5 mr-3"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">{mode.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{mode.description}</div>
          </div>
        </label>
      ))}
    </div>
  );
};

export default RefinementModeSelector;
