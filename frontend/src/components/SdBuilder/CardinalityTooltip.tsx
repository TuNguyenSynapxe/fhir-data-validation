/**
 * CardinalityTooltip Component
 * 
 * Shows cardinality information on hover.
 * Displays:
 * - Required vs Optional status
 * - Min and Max values
 */

import React from 'react';
import type { Cardinality } from '../../types/treeNode';

interface CardinalityTooltipProps {
  currentCardinality: Cardinality;
  baseCardinality: Cardinality;
  isFixed: boolean;
}

export const CardinalityTooltip: React.FC<CardinalityTooltipProps> = ({
  currentCardinality,
  baseCardinality,
  isFixed,
}) => {
  const isNotAllowed = currentCardinality.max === '0';
  const isRequired = currentCardinality.min >= 1;
  
  let status = 'Optional';
  if (isNotAllowed) {
    status = 'Not Allowed';
  } else if (isRequired) {
    status = 'Required';
  }

  return (
    <div className="cardinality-tooltip">
      <div className="cardinality-tooltip-header">
        <strong>{status}</strong>
      </div>
      
      <div className="cardinality-tooltip-row">
        <span className="cardinality-tooltip-label">Min:</span>
        <span className="cardinality-tooltip-value">{currentCardinality.min}</span>
      </div>
      
      <div className="cardinality-tooltip-row">
        <span className="cardinality-tooltip-label">Max:</span>
        <span className="cardinality-tooltip-value">{currentCardinality.max}</span>
      </div>

      {isFixed && (
        <div className="cardinality-tooltip-footer">
          Fixed by FHIR specification
        </div>
      )}
    </div>
  );
};
