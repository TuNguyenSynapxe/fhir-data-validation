/**
 * ValueSetSelectionDrawer Component
 * 
 * REFACTORED UX: Selection-only drawer
 * 
 * RESPONSIBILITIES:
 * - Search and filter ValueSets by name/publisher/keyword
 * - Auto-preview codes on click (no separate button)
 * - Allow selection of ONE ValueSet (emits URL via callback)
 * 
 * RULES (CRITICAL):
 * - NO display of current/base binding (that's on element details page)
 * - NO binding strength controls (that's inline in element panel)
 * - NO direct persistence (emits selection via callback only)
 * - NO validation logic
 * - NO AI logic (placeholder section only)
 * - Preview panel shows ONLY the clicked ValueSet (single source of truth)
 * 
 * UX GOAL: Calm, focused, premium selection experience
 */

import React, { useState, useEffect } from 'react';
import { useTerminologyStore } from '../../stores/useTerminologyStore';
import type { BindingConfig } from '../../api/sdBuilderApi';
import type { TerminologyLayer } from '../../api/terminologyApi';
import { parseCanonicalUrl, isSameCanonical } from '../../features/sd-builder/utils/canonicalUrlUtils';

interface ValueSetSelectionDrawerProps {
  elementPath: string;
  elementName: string;
  fhirType: string; // e.g. "code", "Coding", "CodeableConcept"
  baseBinding: BindingConfig | null; // Used only for smart filtering
  currentValueSetUrl: string | null; // Used only for visual indicator
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
  const [clickedValueSetUrl, setClickedValueSetUrl] = useState<string | null>(null);

  // Auto-search on open with smart filtering
  useEffect(() => {
    if (open && !searchResults.length && !searchQuery) {
      // If base binding exists, pre-filter by name tokens
      if (baseBinding) {
        const baseName = extractBaseNameTokens(baseBinding.valueSetUrl);
        setSearchQuery(baseName);
        search(baseName, selectedLayer);
      } else {
        // Default search shows all ValueSets
        search('', selectedLayer);
      }
    }
  }, [open]);

  // Extract name tokens from ValueSet URL for filtering (Point 3)
  const extractBaseNameTokens = (url: string): string => {
    // Extract last segment after final slash
    const segments = url.split('/');
    const lastSegment = segments[segments.length - 1];
    
    // Remove common prefixes/suffixes
    return lastSegment
      .replace(/^valueset-/i, '')
      .replace(/-codes$/i, '')
      .replace(/-/g, ' ');
  };

  const handleSearch = () => {
    search(searchQuery, selectedLayer);
  };

  const handleSelectValueSet = (url: string) => {
    onSelectValueSet(url);
    onClose();
  };

  // Auto-preview on click
  const handleClickValueSet = (url: string) => {
    setClickedValueSetUrl(url);
    selectValueSet(url);
    loadPreviewCodes(url, 20); // Load codes for THIS ValueSet only
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
                  {searchResults.map((vs) => {
                    const isSelected = clickedValueSetUrl === vs.url;
                    const isCurrent = currentValueSetUrl ? isSameCanonical(currentValueSetUrl, vs.url) : false;
                    const { baseUrl, version } = parseCanonicalUrl(vs.url);
                    
                    return (
                      <li 
                        key={vs.url} 
                        className={`valueset-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                        onClick={() => handleClickValueSet(vs.url)}
                      >
                        <div className="valueset-header">
                          <div>
                            <h4 className="valueset-name">
                              {vs.name}
                              {isCurrent && <span className="current-indicator">Current</span>}
                            </h4>
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
                          <code>{baseUrl}</code>
                          {version && <span className="url-version-badge">|{version}</span>}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(vs.url);
                            }}
                            className="btn-copy-small"
                            title="Copy full URL"
                          >
                            📋
                          </button>
                        </div>
                      </li>
                    );
                  })}
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

          {/* Right Column: Selected ValueSet Preview ONLY */}
          <div className="drawer-right-col">
            {clickedValueSetUrl ? (
              <div className="preview-panel">
                <div className="preview-header">
                  <h3>Preview</h3>
                </div>

                {previewLoading && (
                  <div className="preview-loading">
                    <div className="spinner-small"></div>
                    Loading codes...
                  </div>
                )}

                {previewError && (
                  <div className="preview-error">{previewError}</div>
                )}

                {!previewLoading && !previewError && previewCodes.length > 0 && (
                  <div className="preview-codes">
                    <p className="preview-note">
                      Showing first {previewCodes.length} codes
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
                    <button
                      onClick={() => handleSelectValueSet(clickedValueSetUrl)}
                      className="btn-select-primary-large"
                    >
                      Select this ValueSet
                    </button>
                  </div>
                )}

                {!previewLoading && !previewError && previewCodes.length === 0 && (
                  <p className="no-codes">No codes available for preview</p>
                )}
              </div>
            ) : (
              <div className="empty-right-col">
                <div className="empty-state-icon">🔍</div>
                <p className="empty-state-title">No ValueSet selected</p>
                <p className="empty-state-hint">Click a ValueSet from the list to preview its codes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};