/**
 * ValueSetSelectionDrawer Component
 * 
 * Phase 4A Refactor: Wide drawer (70-80%) focused ONLY on ValueSet discovery and selection.
 * 
 * RESPONSIBILITIES:
 * - Search ValueSets by name/publisher/keyword
 * - Show results with preview
 * - Allow selection of ONE ValueSet
 * - Show base binding as READ-ONLY reference
 * 
 * RULES (CRITICAL):
 * - NO binding strength controls (that's inline in element panel)
 * - NO direct persistence (emits selection via callback only)
 * - NO validation logic
 * - NO AI logic (placeholder section only)
 * 
 * UX GOAL: Calm, focused discovery experience
 */

import React, { useState, useEffect } from 'react';
import { useTerminologyStore } from '../../stores/useTerminologyStore';
import type { BindingConfig } from '../../api/sdBuilderApi';
import type { TerminologyLayer } from '../../api/terminologyApi';

interface ValueSetSelectionDrawerProps {
  elementPath: string;
  elementName: string;
  fhirType: string; // e.g. "code", "Coding", "CodeableConcept"
  baseBinding: BindingConfig | null;
  currentValueSetUrl: string | null;
  open: boolean;
  onSelectValueSet: (url: string) => void;
  onClose: () => void;
}

export const ValueSetSelectionDrawer: React.FC<ValueSetSelectionDrawerProps> = ({
  elementPath,
  elementName,
  fhirType,
  baseBinding,
  currentValueSetUrl,
  open,
  onSelectValueSet,
  onClose,
}) => {
  const {
    searchQuery,
    searchResults,
    searchLoading,
    searchError,
    selectedValueSet,
    previewCodes,
    previewLoading,
    previewError,
    search,
    selectValueSet,
    loadPreviewCodes,
    clearSelection,
    setSearchQuery,
  } = useTerminologyStore();

  const [selectedLayer, setSelectedLayer] = useState<TerminologyLayer | undefined>('Hl7');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Auto-search on open
  useEffect(() => {
    if (open && !searchResults.length && !searchQuery) {
      // Default search shows all ValueSets
      search('', selectedLayer);
    }
  }, [open]);

  const handleSearch = () => {
    search(searchQuery, selectedLayer);
  };

  const handleSelectValueSet = (url: string) => {
    onSelectValueSet(url);
    onClose();
  };

  const handleShowPreview = (url: string) => {
    setPreviewUrl(url);
    loadPreviewCodes(url, 20); // Show first 20 codes
  };

  const handleClosePreview = () => {
    setPreviewUrl(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="drawer-backdrop" 
        onClick={onClose}
      />

      {/* Wide Drawer (70-80% width) */}
      <div className="valueset-selection-drawer">
        {/* Header */}
        <div className="drawer-header">
          <div>
            <h2>Select ValueSet</h2>
            <p className="drawer-subtitle">
              {elementPath} <span className="fhir-type-badge">{fhirType}</span>
            </p>
          </div>
          <button 
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body-wide">
          {/* Left Column: Search & Results */}
          <div className="drawer-left-col">
            {/* Search Section */}
            <div className="search-section">
              <div className="search-controls">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name, publisher, or keyword..."
                  disabled={searchLoading}
                  className="search-input-wide"
                />
                <button
                  onClick={handleSearch}
                  disabled={searchLoading}
                  className="btn-search"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Layer Filter */}
              <div className="layer-filter">
                <label>Layer:</label>
                <select
                  value={selectedLayer ?? ''}
                  onChange={(e) => setSelectedLayer(e.target.value as TerminologyLayer || undefined)}
                  className="layer-select"
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
              <div className="search-error">
                {searchError}
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="search-results">
                <p className="results-count">{searchResults.length} ValueSets found</p>
                <ul className="valueset-list">
                  {searchResults.map((vs) => (
                    <li key={vs.url} className="valueset-item">
                      <div className="valueset-header">
                        <div>
                          <h4 className="valueset-name">{vs.name}</h4>
                          <p className="valueset-publisher">{vs.publisher}</p>
                        </div>
                        {vs.layer && (
                          <span className={`layer-badge layer-${vs.layer.toLowerCase()}`}>
                            {vs.layer}
                          </span>
                        )}
                      </div>
                      {vs.description && (
                        <p className="valueset-description">{vs.description}</p>
                      )}
                      <div className="valueset-url">
                        <code>{vs.url}</code>
                        <button
                          onClick={() => copyToClipboard(vs.url)}
                          className="btn-copy-small"
                          title="Copy URL"
                        >
                          📋
                        </button>
                      </div>
                      <div className="valueset-actions">
                        <button
                          onClick={() => handleShowPreview(vs.url)}
                          className="btn-preview"
                        >
                          Preview Codes
                        </button>
                        <button
                          onClick={() => handleSelectValueSet(vs.url)}
                          className="btn-select"
                        >
                          Select
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No Results */}
            {!searchLoading && searchResults.length === 0 && searchQuery && (
              <div className="no-results">
                <p>No ValueSets found matching "{searchQuery}"</p>
                <p className="hint">Try a different search term or layer filter</p>
              </div>
            )}

            {/* AI Placeholder Section */}
            <div className="ai-placeholder-section">
              <h3>✨ Suggested ValueSets <span className="coming-soon-badge">Coming Soon</span></h3>
              <p className="ai-placeholder-text">
                AI-powered ValueSet recommendations based on element path and context will appear here.
              </p>
            </div>
          </div>

          {/* Right Column: Preview OR Base Binding */}
          <div className="drawer-right-col">
            {/* Code Preview */}
            {previewUrl && (
              <div className="preview-panel">
                <div className="preview-header">
                  <h3>Code Preview</h3>
                  <button
                    onClick={handleClosePreview}
                    className="btn-close-preview"
                  >
                    ✕
                  </button>
                </div>

                {previewLoading && (
                  <div className="preview-loading">Loading codes...</div>
                )}

                {previewError && (
                  <div className="preview-error">{previewError}</div>
                )}

                {previewCodes.length > 0 && (
                  <div className="preview-codes">
                    <p className="preview-note">
                      Showing first {previewCodes.length} codes (read-only preview)
                    </p>
                    <ul className="code-list">
                      {previewCodes.map((code, idx) => (
                        <li key={idx} className="code-item">
                          <code className="code-value">{code.code}</code>
                          {code.display && (
                            <span className="code-display">{code.display}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Base Binding Reference (when no preview) */}
            {!previewUrl && baseBinding && (
              <div className="base-binding-panel">
                <h3>Base Binding (Read-Only)</h3>
                <dl className="base-binding-info">
                  <dt>ValueSet:</dt>
                  <dd>
                    <code>{baseBinding.valueSetUrl}</code>
                  </dd>
                  <dt>Strength:</dt>
                  <dd>
                    <span className="strength-badge">{baseBinding.strength}</span>
                  </dd>
                </dl>
                <p className="base-binding-note">
                  This is the binding defined in the base StructureDefinition.
                  You can override it by selecting a different ValueSet.
                </p>
              </div>
            )}

            {/* Empty State */}
            {!previewUrl && !baseBinding && (
              <div className="empty-right-col">
                <p>Click "Preview Codes" on a ValueSet to see sample codes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
