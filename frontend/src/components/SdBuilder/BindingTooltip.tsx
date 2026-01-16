/**
 * BindingTooltip Component
 * 
 * Shows ValueSet binding information on hover in the tree.
 * Displays:
 * - ValueSet name
 * - Previewability status
 * - Whether binding is base or overridden
 * - Preview availability
 */

import React, { useEffect, useState } from 'react';
import type { BindingConfig } from '../../api/sdBuilderApi';
import { previewValueSetCodes, type ValueSetPreviewDto, getPreviewability, type ValueSetPreviewability } from '../../api/terminologyApi';

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

  const getPreviewabilityLabel = (previewability: ValueSetPreviewability): string => {
    switch (previewability) {
      case 'Explicit':
        return 'Explicit codes';
      case 'Computed':
        return 'Computed expansion';
      case 'External':
        return 'External standard';
      case 'Unsupported':
        return 'No preview';
      default:
        return 'Unknown';
    }
  };

  const getPreviewAvailability = (previewability: ValueSetPreviewability): string => {
    switch (previewability) {
      case 'Explicit':
      case 'Computed':
        return 'Preview available';
      case 'External':
        return 'External system - no offline preview';
      case 'Unsupported':
        return 'Preview not supported';
      default:
        return 'Unknown';
    }
  };

  const previewability = preview ? getPreviewability(preview) : 'Unsupported';

  return (
    <div className="binding-tooltip">
      <div className="binding-tooltip-header">
        <strong>{loading ? 'Loading...' : (error ? 'Unknown ValueSet' : preview?.name)}</strong>
      </div>
      
      {!loading && !error && preview && (
        <>
          <div className="binding-tooltip-row">
            <span className="binding-tooltip-label">Type:</span>
            <span className="binding-tooltip-value">{getPreviewabilityLabel(previewability)}</span>
          </div>
          
          <div className="binding-tooltip-row">
            <span className="binding-tooltip-label">Status:</span>
            <span className="binding-tooltip-value">{getPreviewAvailability(previewability)}</span>
          </div>
          
          <div className="binding-tooltip-row">
            <span className="binding-tooltip-label">Binding:</span>
            <span className="binding-tooltip-value">
              {isOverride ? 'Overridden' : 'Base'} ({binding.strength})
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
