/**
 * ConceptListPanel — PHASE 1 CodeSystem Concept List
 * 
 * PHASE 1 SCOPE: Simple lookup table display
 * - Code in monospace font
 * - Display in bold font
 * - Slightly taller rows for readability
 * - "+ Add Concept" button
 * - Search by code or display
 * 
 * PHASE 1 LIMITATION: No additional fields shown
 * TODO (Phase 2): Add definition, designation columns
 * TODO (Phase 2): Add property filtering
 * 
 * See: /docs/TERMINOLOGY_PHASE_1.md
 */

import React from 'react';
import { Plus, Search } from 'lucide-react';
import type { CodeSetConcept } from '../../types/codeSystem';

interface ConceptListPanelProps {
  concepts: CodeSetConcept[];
  selectedCode: string | null;
  onSelectConcept: (code: string) => void;
  onAddConcept: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ConceptListPanel: React.FC<ConceptListPanelProps> = ({
  concepts,
  selectedCode,
  onSelectConcept,
  onAddConcept,
  searchQuery,
  onSearchChange,
}) => {
  // Filter concepts by search query
  const filteredConcepts = concepts.filter(
    (concept) =>
      concept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (concept.display && concept.display.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Concepts ({concepts.length})
          </h3>
          <button
            onClick={onAddConcept}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Concept
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Concept List */}
      <div className="flex-1 overflow-auto">
        {filteredConcepts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-500">
            {searchQuery ? 'No matching concepts' : 'No concepts yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConcepts.map((concept) => (
              <button
                key={concept.code}
                onClick={() => onSelectConcept(concept.code)}
                className={`w-full px-3 py-3 text-left transition-colors ${
                  selectedCode === concept.code
                    ? 'bg-blue-50 border-l-2 border-l-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-mono text-sm text-gray-900 mb-0.5">
                  {concept.code}
                </div>
                {concept.display && (
                  <div className="font-bold text-sm text-gray-700">
                    {concept.display}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
