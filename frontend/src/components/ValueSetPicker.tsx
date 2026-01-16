import React, { useState, useEffect, useRef } from 'react';
import { useTerminologyStore } from '../stores/useTerminologyStore';
import type { TerminologyLayer } from '../api/terminologyApi';
import { getPreviewability } from '../api/terminologyApi';
import { getBindingExplanation, isPreviewable } from '../constants/bindingExplanations';

interface ValueSetPickerProps {
  value: string | null;
  onChange: (canonicalUrl: string | null) => void;
  disabled?: boolean;
}

/**
 * ValueSet Picker Component
 * 
 * Phase 4A: Searchable ValueSet picker with code preview.
 * 
 * DESIGN PRINCIPLES:
 * - Emits canonicalUrl only
 * - Preview is read-only
 * - No validation
 * - No automatic binding application
 * - No FHIR logic
 */
export function ValueSetPicker({
  value,
  onChange,
  disabled = false,
}: ValueSetPickerProps) {
  const {
    searchQuery,
    searchResults,
    searchLoading,
    searchError,
    selectedValueSet,
    detailsLoading,
    detailsError,
    previewCodes,
    previewLoading,
    previewError,
    search,
    selectValueSet,
    loadPreviewCodes,
    clearSelection,
    setSearchQuery,
  } = useTerminologyStore();

  const [showPreview, setShowPreview] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<TerminologyLayer | undefined>('Hl7');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load selected ValueSet details if value prop changes
  useEffect(() => {
    if (value && value !== selectedValueSet?.url) {
      selectValueSet(value);
    } else if (!value && selectedValueSet) {
      clearSelection();
    }
  }, [value, selectedValueSet?.url, selectValueSet, clearSelection]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      search(searchQuery, selectedLayer);
    }
  };

  const handleSelectValueSet = (canonicalUrl: string) => {
    onChange(canonicalUrl);
    selectValueSet(canonicalUrl);
  };

  const handleClearSelection = () => {
    onChange(null);
    clearSelection();
  };

  const handleShowPreview = () => {
    if (selectedValueSet) {
      loadPreviewCodes(selectedValueSet.url, 100);
      setShowPreview(true);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const copyToClipboard = () => {
    if (value) {
      navigator.clipboard.writeText(value);
    }
  };

  return (
    <div ref={dropdownRef} className="space-y-3">
      {/* Current Value Display */}
      {value && (
        <div className="flex items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm">
          <span className="flex-1 truncate font-mono text-gray-700">{value}</span>
          <button
            type="button"
            onClick={copyToClipboard}
            className="text-gray-500 hover:text-gray-700"
            title="Copy to clipboard"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      )}

      {/* Search Section */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search ValueSets..."
            disabled={disabled || searchLoading}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSearch}
            disabled={disabled || searchLoading || !searchQuery.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Layer Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Layer:</label>
          <select
            value={selectedLayer ?? ''}
            onChange={(e) => setSelectedLayer(e.target.value as TerminologyLayer || undefined)}
            disabled={disabled}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="Hl7">HL7 (R5 Core)</option>
            <option value="Pss" disabled>PSS (Custom) - Coming Soon</option>
            <option value="Project" disabled>Project - Coming Soon</option>
          </select>
        </div>
      </div>

      {/* Search Error */}
      {searchError && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {searchError}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="rounded border border-gray-300">
          <div className="border-b border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium">
            {searchResults.length} result(s)
          </div>
          <div className="max-h-60 overflow-y-auto">
            {searchResults.map((vs) => (
              <button
                key={vs.url}
                type="button"
                onClick={() => handleSelectValueSet(vs.url)}
                className={`w-full border-b border-gray-100 px-3 py-3 text-left hover:bg-gray-50 last:border-b-0 ${
                  selectedValueSet?.url === vs.url ? 'bg-blue-50' : ''
                }`}
              >
                <div className="font-medium text-gray-900">{vs.name}</div>
                <div className="mt-1 truncate font-mono text-xs text-gray-500">{vs.url}</div>
                {vs.description && (
                  <div className="mt-1 text-sm text-gray-600 line-clamp-2">{vs.description}</div>
                )}
                <div className="mt-1">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                    vs.layer === 'Hl7' ? 'bg-green-100 text-green-800' :
                    vs.layer === 'Pss' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {vs.layer}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected ValueSet Summary */}
      {selectedValueSet && (
        <div className="rounded border border-blue-300 bg-blue-50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Selected ValueSet</h4>
            <button
              onClick={handleClearSelection}
              disabled={disabled}
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:bg-gray-300"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Name:</span>{' '}
              <span className="text-gray-900">{selectedValueSet.name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">URL:</span>{' '}
              <span className="font-mono text-xs text-gray-900">{selectedValueSet.url}</span>
            </div>
            {selectedValueSet.description && (
              <div>
                <span className="font-medium text-gray-700">Description:</span>{' '}
                <span className="text-gray-900">{selectedValueSet.description}</span>
              </div>
            )}
            {selectedValueSet.publisher && (
              <div>
                <span className="font-medium text-gray-700">Publisher:</span>{' '}
                <span className="text-gray-900">{selectedValueSet.publisher}</span>
              </div>
            )}
            {(() => {
              const previewability = getPreviewability(selectedValueSet);
              const explanation = getBindingExplanation(previewability);
              return (
                <div>
                  <span className="font-medium text-gray-700">Type:</span>{' '}
                  <span className="text-gray-900">{explanation.label}</span>
                  {!isPreviewable(previewability) && (
                    <span className="ml-2 text-xs text-gray-600">({explanation.description})</span>
                  )}
                </div>
              );
            })()}
          </div>

          {isPreviewable(getPreviewability(selectedValueSet)) && (
            <button
              onClick={handleShowPreview}
              disabled={disabled || previewLoading}
              className="mt-3 w-full rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
            >
              {previewLoading ? 'Loading Preview...' : 'Preview Codes'}
            </button>
          )}

          {detailsError && (
            <div className="mt-2 text-sm text-red-600">{detailsError}</div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleClosePreview}
        >
          <div 
            className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold">Code Preview: {selectedValueSet?.name}</h3>
              <button
                onClick={handleClosePreview}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {previewError && (
                <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {previewError}
                </div>
              )}

              {previewLoading && (
                <div className="py-8 text-center text-gray-600">Loading codes...</div>
              )}

              {!previewLoading && previewCodes.length > 0 && (
                <>
                  <div className="mb-3 text-sm text-gray-600">
                    Showing {previewCodes.length} code(s)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border-b border-gray-300 px-4 py-2 text-left font-semibold">Code</th>
                          <th className="border-b border-gray-300 px-4 py-2 text-left font-semibold">Display</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewCodes.map((code, idx) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-xs">{code.code}</td>
                            <td className="px-4 py-2 text-gray-700">{code.display || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!previewLoading && previewCodes.length === 0 && !previewError && selectedValueSet && (() => {
                const previewability = getPreviewability(selectedValueSet);
                const explanation = getBindingExplanation(previewability);
                return (
                  <div className="py-8 text-center">
                    <div className="text-gray-700 font-medium mb-2">{explanation.label}</div>
                    <div className="text-gray-600">{explanation.description}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
