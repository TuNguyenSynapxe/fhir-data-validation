/**
 * SlicingSummaryPanel Component — EPIC 2 Read-Only
 * 
 * Displays configured slicing information in a read-only format.
 * Shows:
 * - Slicing rules (open/closed/openAtEnd)
 * - Ordered flag
 * - Discriminators (type → path)
 * - Slice names (alphabetical)
 * 
 * Hard Constraints:
 * - ❌ No fixed values
 * - ❌ No per-slice cardinality
 * - ❌ No bindings
 * - ❌ No edit controls
 * - ✅ Purely presentational (EPIC 2 only)
 */

import React from 'react';

interface SlicingSummaryPanelProps {
  slicing: {
    rules: 'Open' | 'Closed' | 'OpenAtEnd';
    ordered: boolean;
    discriminators: {
      type: string;
      path: string;
    }[];
  };
  sliceNames: string[];
  onConfigureSlice?: (sliceName: string) => void; // EPIC 3: Trigger slice constraint panel
}

export const SlicingSummaryPanel: React.FC<SlicingSummaryPanelProps> = ({
  slicing,
  sliceNames,
  onConfigureSlice,
}) => {
  // Sort slice names alphabetically
  const sortedSliceNames = [...sliceNames].sort((a, b) => a.localeCompare(b));

  return (
    <div className="details-section slicing-summary-panel">
      <h4>SLICING</h4>
      <p className="slicing-sublabel">How repeated elements are distinguished</p>

      {/* Metadata block */}
      <dl className="details-list">
        <dt>Matching:</dt>
        <dd>{slicing.rules}</dd>

        <dt>Order matters:</dt>
        <dd>{slicing.ordered ? 'Yes' : 'No'}</dd>
      </dl>

      {/* Discriminators */}
      {slicing.discriminators.length > 0 && (
        <div className="slicing-discriminators">
          <h5>Discriminators:</h5>
          <ul className="discriminator-list">
            {slicing.discriminators.map((disc, idx) => (
              <li key={idx}>
                <span className="discriminator-type" title={`${disc.type} discriminator\nEach slice is identified by a specific ${disc.type.toLowerCase()} in this element.`}>
                  {disc.type.toLowerCase()}
                </span>
                {' → '}
                <span className="discriminator-path">{disc.path}</span>
              </li>
            ))}
          </ul>
          <p className="discriminator-explanation">Used to distinguish each repetition</p>
        </div>
      )}

      {/* Slice names */}
      {sortedSliceNames.length > 0 && (
        <div className="slicing-slices">
          <h5>Slices (by name):</h5>
          <ul className="slice-name-list">
            {sortedSliceNames.map((name) => (
              <li key={name} className="slice-item-with-button">
                <span>• {name}</span>
                {onConfigureSlice && (
                  <button
                    className="configure-slice-btn"
                    onClick={() => onConfigureSlice(name)}
                    title="Configure slice constraints (fixed values, cardinality, etc.)"
                  >
                    Configure
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="slice-explanation">
            Each slice represents a category of this element.
            The discriminator above defines how items are matched to slices.
          </p>
        </div>
      )}

      {/* Helper text (mandatory) */}
      <div className="slicing-helper-text">
        <div className="helper-section">
          <strong>What slicing does</strong>
          <p>Slicing defines how repeated elements are grouped.</p>
        </div>
        <div className="helper-section">
          <strong>What it does not do</strong>
          <p>Constraints such as fixed values, cardinality, and bindings are configured per slice in the next step.</p>
        </div>
      </div>
    </div>
  );
};
