/**
 * ValueSetPreviewEmptyState Component
 * 
 * Shows contextual explanations when ValueSet preview is not available,
 * based on the runtime previewability classification.
 */

import React from 'react';
import type { ValueSetPreviewability } from '../../api/terminologyApi';
import { getBindingExplanation, isPreviewable } from '../../constants/bindingExplanations';

interface ValueSetPreviewEmptyStateProps {
  previewability: ValueSetPreviewability;
  url: string;
}

export const ValueSetPreviewEmptyState: React.FC<ValueSetPreviewEmptyStateProps> = ({
  previewability,
  url,
}) => {
  const explanation = getBindingExplanation(previewability);
  
  // If previewable but empty, show generic "no codes" message
  if (isPreviewable(previewability)) {
    return (
      <div className="empty-state-explanation">
        <div className="empty-state-icon">📭</div>
        <h4 className="empty-state-title">No codes returned</h4>
        <p className="empty-state-body">
          No codes were returned for this ValueSet. Try increasing max items or verify the ValueSet definition.
        </p>
      </div>
    );
  }

  // For non-previewable ValueSets, use the explanation from the registry
  const iconMap: Record<string, string> = {
    info: '💡',
    neutral: '🌐',
    warning: '⚠️',
  };

  return (
    <div className="empty-state-explanation">
      <div className="empty-state-icon">{iconMap[explanation.tone]}</div>
      <h4 className="empty-state-title">{explanation.label}</h4>
      <p className="empty-state-body">{explanation.description}</p>
      <p className="empty-state-hint">
        💡 {explanation.authorGuidance}
      </p>
    </div>
  );
};
