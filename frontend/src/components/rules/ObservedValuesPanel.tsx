import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import type { RuleIntent, CodeSystemParams, AllowedCodesParams } from '../../types/ruleIntent';

interface ObservedValue {
  value: string;
  count?: number; // How many times observed
}

interface ObservedValuesPanelProps {
  path: string;
  fieldType: 'system' | 'code'; // What field this is
  observedValues: ObservedValue[]; // Values seen in sample data
  existingSystemIntent?: RuleIntent; // Existing CODE_SYSTEM intent
  existingCodesIntent?: RuleIntent; // Existing ALLOWED_CODES intent
  onIntentChange: (intent: RuleIntent | null) => void;
}

/**
 * ObservedValuesPanel - Display observed terminology values with selection
 * 
 * Core Principles:
 * - Shows values inferred from sample data
 * - User selects which values to constrain
 * - Selection creates/updates RuleIntent (does NOT create rule)
 * - Clearing removes RuleIntent
 * 
 * Behavior:
 * - For 'system': Show "Constrain to this system" button
 * - For 'code': Show checkboxes for multi-select
 * - Pending state shows blue styling
 */
export default function ObservedValuesPanel({
  path,
  fieldType,
  observedValues,
  existingSystemIntent,
  existingCodesIntent,
  onIntentChange,
}: ObservedValuesPanelProps) {
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);

  // Sync with existing intents
  useEffect(() => {
    if (fieldType === 'system' && existingSystemIntent?.params) {
      const params = existingSystemIntent.params as CodeSystemParams;
      setSelectedSystem(params.system);
    } else if (fieldType === 'code' && existingCodesIntent?.params) {
      const params = existingCodesIntent.params as AllowedCodesParams;
      setSelectedCodes(new Set(params.codes));
    }
  }, [existingSystemIntent, existingCodesIntent, fieldType]);

  const handleSystemSelect = (system: string) => {
    if (selectedSystem === system) {
      // Deselect - remove intent
      setSelectedSystem(null);
      onIntentChange(null);
    } else {
      // Select - create intent
      setSelectedSystem(system);
      const intent: RuleIntent = {
        type: 'CODE_SYSTEM',
        path,
        params: { system },
      };
      onIntentChange(intent);
    }
  };

  const handleCodeToggle = (code: string) => {
    const newSelected = new Set(selectedCodes);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedCodes(newSelected);

    if (newSelected.size === 0) {
      // No codes selected - remove intent
      onIntentChange(null);
    } else {
      // Create/update intent
      const intent: RuleIntent = {
        type: 'ALLOWED_CODES',
        path,
        params: { codes: Array.from(newSelected) },
      };
      onIntentChange(intent);
    }
  };

  if (observedValues.length === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-500">
        No values observed in sample data
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 space-y-3">
      <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        Observed {fieldType === 'system' ? 'Systems' : 'Codes'}
      </div>

      {fieldType === 'system' ? (
        // System selection
        <div className="space-y-2">
          {observedValues.map((obs) => {
            const isSelected = selectedSystem === obs.value;
            return (
              <button
                key={obs.value}
                onClick={() => handleSystemSelect(obs.value)}
                className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 text-blue-900'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono truncate">{obs.value}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {obs.count && (
                      <span className="text-xs text-gray-500">({obs.count})</span>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-1 text-xs text-blue-700">
                    Click Apply to constrain to this system
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // Code multi-select
        <div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {observedValues.map((obs) => {
              const isSelected = selectedCodes.has(obs.value);
              return (
                <label
                  key={obs.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleCodeToggle(obs.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-sm font-mono text-gray-900">
                    {obs.value}
                  </span>
                  {obs.count && (
                    <span className="text-xs text-gray-500">({obs.count})</span>
                  )}
                </label>
              );
            })}
          </div>

          {selectedCodes.size > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700 font-medium">
                  {selectedCodes.size} code{selectedCodes.size !== 1 ? 's' : ''} selected
                </span>
                <span className="text-gray-500">Click Apply to create rule</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Intent status indicator */}
      {((fieldType === 'system' && selectedSystem) || (fieldType === 'code' && selectedCodes.size > 0)) && (
        <div className="flex items-center gap-2 text-xs text-blue-600 pt-2 border-t border-blue-200">
          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
          <span>Pending (click Apply to create rule)</span>
        </div>
      )}
    </div>
  );
}
