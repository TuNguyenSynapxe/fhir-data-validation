/**
 * BindingTooltip Component
 * 
 * Shows ValueSet binding information on hover in the tree.
 * Uses BindingExplanation registry for consistent messaging.
 * Displays:
 * - ValueSet name
 * - Previewability type (from registry)
 * - Preview availability explanation
 */

import React, { useEffect, useState } from 'react';
import type { BindingConfig } from '../../api/sdBuilderApi';
import { previewValueSetCodes, type ValueSetPreviewDto, getPreviewability, type ValueSetPreviewability } from '../../api/terminologyApi';
import { getBindingExplanation, isPreviewable } from '../../constants/bindingExplanations';

interface BindingTooltipProps {
  binding: BindingConfig;
  isOverride: boolean;
}

export const BindingTooltip: React.FC<BindingTooltipProps> = ({ binding, isOverride }) => {
  const [preview, setPreview] = useState<ValueSetPreviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPreview = async () => {
      try {
        const data = await previewValueSetCodes(binding.valueSetUrl, 1);
        if (!cancelled) {
          setPreview(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      cancelled = true;
    };
  }, [binding.valueSetUrl]);

  const previewability = preview ? getPreviewability(preview) : 'Unsupported';
  const explanation = getBindingExplanation(previewability);
  const previewAvailable = isPreviewable(previewability);

  return (
    <div className="binding-tooltip">
      <div className="binding-tooltip-header">
        <strong>{loading ? 'Loading...' : (error ? 'Unknown ValueSet' : preview?.name)}</strong>
      </div>
      
      {!loading && !error && preview && (
        <>
          <div className="binding-tooltip-row">
            <span className="binding-tooltip-label">Type:</span>
            <span className="binding-tooltip-value">{explanation.label}</span>
          </div>
          
          <div className="binding-tooltip-row">
            <span className="binding-tooltip-label">Preview:</span>
            <span className="binding-tooltip-value">
              {previewAvailable ? 'Available offline' : 'Not available offline'}
            </span>
          </div>
        </>
      )}
      
      {error && (
        <div className="binding-tooltip-error">
          Unable to load ValueSet information
        </div>
      )}
    </div>
  );
};
