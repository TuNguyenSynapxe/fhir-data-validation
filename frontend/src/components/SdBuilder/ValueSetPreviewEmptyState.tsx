/**
 * ValueSetPreviewEmptyState Component
 * 
 * Shows contextual explanations when ValueSet preview is not available,
 * based on the runtime previewability classification.
 */

import React from 'react';
import type { ValueSetPreviewability } from '../../api/terminologyApi';

interface ValueSetPreviewEmptyStateProps {
  previewability: ValueSetPreviewability;
  url: string;
}

export const ValueSetPreviewEmptyState: React.FC<ValueSetPreviewEmptyStateProps> = ({
  previewability,
  url,
}) => {
  if (previewability === 'External') {
    return (
      <div className="empty-state-explanation">
        <div className="empty-state-icon">🌐</div>
        <h4 className="empty-state-title">External ValueSet</h4>
        <p className="empty-state-body">
          This ValueSet references an external standard (e.g., BCP-47, IANA, MIME, ISO). 
          Codes aren't stored in this system, so preview isn't available offline.
        </p>
        <p className="empty-state-hint">
          💡 You can still bind to this ValueSet
        </p>
      </div>
    );
  }

  if (previewability === 'Unsupported') {
    return (
      <div className="empty-state-explanation">
        <div className="empty-state-icon">⚠️</div>
        <h4 className="empty-state-title">Preview not supported</h4>
        <p className="empty-state-body">
          This ValueSet uses features we don't expand offline yet (filters, imports, or excludes). 
          You can still bind it, but code preview is unavailable.
        </p>
        <p className="empty-state-hint">
          💡 Binding will still work at runtime
        </p>
      </div>
    );
  }

  // Explicit or Computed but codes array is empty
  return (
    <div className="empty-state-explanation">
      <div className="empty-state-icon">📭</div>
      <h4 className="empty-state-title">No codes returned</h4>
      <p className="empty-state-body">
        No codes were returned for this ValueSet. Try increasing max items or verify the ValueSet definition.
      </p>
    </div>
  );
};
