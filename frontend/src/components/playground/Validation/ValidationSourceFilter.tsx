import React, { useState } from 'react';
import { Filter, Check } from 'lucide-react';

export interface SourceFilterState {
  structure: boolean;
  lint: boolean;
  reference: boolean;
  firely: boolean;
  business: boolean;
  codeMaster: boolean;
  specHint: boolean;
}

interface ValidationSourceFilterProps {
  filters: SourceFilterState;
  onChange: (filters: SourceFilterState) => void;
  counts: {
    structure: number;
    lint: number;
    reference: number;
    firely: number;
    business: number;
    codeMaster: number;
    specHint: number;
  };
}

/**
 * ValidationSourceFilter Component
 * 
 * Provides a compact dropdown filter for validation sources.
 * Shows counts and allows toggling individual sources.
 */
export const ValidationSourceFilter: React.FC<ValidationSourceFilterProps> = ({
  filters,
  onChange,
  counts
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const allEnabled = Object.values(filters).every(v => v);
  const activeCount = Object.values(filters).filter(v => v).length;

  const toggleSource = (source: keyof SourceFilterState) => {
    onChange({
      ...filters,
      [source]: !filters[source]
    });
  };

  const toggleAll = () => {
    const newState = !allEnabled;
    onChange({
      structure: newState,
      lint: newState,
      reference: newState,
      firely: newState,
      business: newState,
      codeMaster: newState,
      specHint: newState
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      >
        <Filter className="w-3.5 h-3.5" />
        <span>By source: {allEnabled ? 'All' : `${activeCount} selected`}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
            <div className="p-2 space-y-1">
              {/* All/None toggle */}
              <button
                onClick={toggleAll}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded transition-colors"
              >
                <span>{allEnabled ? 'Deselect All' : 'Select All'}</span>
              </button>

              <div className="border-t border-gray-200 my-1" />

              {/* Individual sources */}
              {counts.structure > 0 && (
                <button
                  onClick={() => toggleSource('structure')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center">
                      {filters.structure && <Check className="w-3 h-3 text-red-600" />}
                    </div>
                    <span className="font-medium text-gray-700">FHIR Structure</span>
                  </div>
                  <span className="text-gray-500">({counts.structure})</span>
                </button>
              )}

              {counts.lint > 0 && (
                <button
                  onClick={() => toggleSource('lint')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center">
                      {filters.lint && <Check className="w-3 h-3 text-amber-600" />}
                    </div>
                    <span className="font-medium text-gray-700">Lint</span>
                  </div>
                  <span className="text-gray-500">({counts.lint})</span>
                </button>
              )}

              {counts.reference > 0 && (
                <button
                  onClick={() => toggleSource('reference')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center">
                      {filters.reference && <Check className="w-3 h-3 text-red-600" />}
                    </div>
                    <span className="font-medium text-gray-700">Reference Validation</span>
                  </div>
                  <span className="text-gray-500">({counts.reference})</span>
                </button>
              )}

              {counts.firely > 0 && (
                <button
                  onClick={() => toggleSource('firely')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center">
                      {filters.firely && <Check className="w-3 h-3 text-blue-600" />}
                    </div>
                    <span className="font-medium text-gray-700">HL7 / Firely</span>
                  </div>
                  <span className="text-gray-500">({counts.firely})</span>
                </button>
              )}

              {counts.business > 0 && (
                <button
                  onClick={() => toggleSource('business')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center">
                      {filters.business && <Check className="w-3 h-3 text-purple-600" />}
                    </div>
                    <span className="font-medium text-gray-700">Project Rules</span>
                  </div>
                  <span className="text-gray-500">({counts.business})</span>
                </button>
              )}

              {counts.codeMaster > 0 && (
                <button
                  onClick={() => toggleSource('codeMaster')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center">
                      {filters.codeMaster && <Check className="w-3 h-3 text-orange-600" />}
                    </div>
                    <span className="font-medium text-gray-700">CodeMaster</span>
                  </div>
                  <span className="text-gray-500">({counts.codeMaster})</span>
                </button>
              )}

              {counts.specHint > 0 && (
                <button
                  onClick={() => toggleSource('specHint')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center">
                      {filters.specHint && <Check className="w-3 h-3 text-cyan-600" />}
                    </div>
                    <span className="font-medium text-gray-700">Spec Hints</span>
                  </div>
                  <span className="text-gray-500">({counts.specHint})</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
