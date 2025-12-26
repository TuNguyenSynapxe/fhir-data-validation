/**
 * ConceptTable — Center panel table for concept browsing and management
 * 
 * Features:
 * - Table with columns: Code, Display, Description (optional), Actions
 * - Search/filter functionality
 * - Edit button to open drawer
 * - No inline editing (all editing happens in drawer)
 * - Maintains scroll position and navigation state
 */

import React, { useState } from 'react';
import { Search, Edit2, Plus, Trash2 } from 'lucide-react';
import type { CodeSetConcept } from '../../types/codeSystem';

interface ConceptTableProps {
  concepts: CodeSetConcept[];
  systemName: string;
  systemUrl?: string;
  onEditConcept: (concept: CodeSetConcept) => void;
  onAddConcept: () => void;
  onDeleteCodeSystem?: () => void;
}

export const ConceptTable: React.FC<ConceptTableProps> = ({
  concepts,
  systemName,
  systemUrl,
  onEditConcept,
  onAddConcept,
  onDeleteCodeSystem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter concepts by search query
  const filteredConcepts = concepts.filter((concept) => {
    const query = searchQuery.toLowerCase();
    return (
      concept.code.toLowerCase().includes(query) ||
      (concept.display && concept.display.toLowerCase().includes(query)) ||
      (concept.description && concept.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with Search and Add */}
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {systemName}
            </h2>
            {systemUrl && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                {systemUrl}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">
              {concepts.length} concept{concepts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {onDeleteCodeSystem && (
              <button
                onClick={onDeleteCodeSystem}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors"
                title="Delete this CodeSystem"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={onAddConcept}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Concept</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, display, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {searchQuery && (
          <div className="mt-2 text-xs text-gray-600">
            Showing {filteredConcepts.length} of {concepts.length} concept
            {filteredConcepts.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filteredConcepts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">No matching concepts</p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search query
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">📋</div>
                <p className="text-sm font-medium text-gray-900 mb-1">No concepts yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Add your first concept to get started
                </p>
                <button
                  onClick={onAddConcept}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Concept
                </button>
              </>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Display
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredConcepts.map((concept) => (
                <tr
                  key={concept.code}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2.5 text-sm font-mono text-gray-900">
                    {concept.code}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-900">
                    {concept.display || <span className="text-gray-400 italic">No display</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-md">
                    {concept.description ? (
                      <div className="truncate" title={concept.description}>
                        {concept.description}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => onEditConcept(concept)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
