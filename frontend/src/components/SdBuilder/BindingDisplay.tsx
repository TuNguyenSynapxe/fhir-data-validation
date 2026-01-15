/**
 * BindingDisplay Component
 * 
 * Human-readable binding display with inline code preview.
 * 
 * RESPONSIBILITIES:
 * - Fetch and display ValueSet metadata (name, description)
 * - Show inline code preview (5 codes max)
 * - Visual distinction between base and override bindings
 * 
 * RULES:
 * - NO validation logic
 * - NO code selection/editing
 * - Read-only display only
 * - Treats all data as opaque DTOs
 */

import React, { useState, useEffect } from 'react';
import { previewValueSetCodes, type ValueSetPreviewDto, type ValueSetCodeDto } from '../../api/terminologyApi';
import type { BindingConfig } from '../../api/sdBuilderApi';
import { parseCanonicalUrl, formatFhirVersion } from '../../features/sd-builder/utils/canonicalUrlUtils';

interface BindingDisplayProps {
  binding: BindingConfig;
  variant: 'base' | 'current';
  showActions?: boolean;
  onChangeValueSet?: () => void;
  onClearOverride?: () => void;
  children?: React.ReactNode; // For BindingStrengthControl
}

export const BindingDisplay: React.FC<BindingDisplayProps> = ({
  binding,
  variant,
  showActions = false,
  onChangeValueSet,
  onClearOverride,
  children,
}) => {
  const [preview, setPreview] = useState<ValueSetPreviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ValueSet preview on mount
  useEffect(() => {
    let cancelled = false;

    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await previewValueSetCodes(binding.valueSetUrl, 20);
        if (!cancelled) {
          setPreview(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load ValueSet');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      cancelled = true;
    };
  }, [binding.valueSetUrl]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Build code summary: "code1, code2, code3 (+N more)"
  const getCodeSummary = (): string => {
    if (!preview || preview.codes.length === 0) return 'No codes available';
    
    const displayCodes = preview.codes.slice(0, 3).map(c => c.code);
    const remaining = preview.codes.length - 3;
    
    if (remaining > 0) {
      return `${displayCodes.join(', ')} (+${remaining} more)`;
    }
    
    return displayCodes.join(', ');
  };

  return (
    <div className={`binding-display ${variant === 'base' ? 'binding-display-base' : 'binding-display-current'}`}>
      {/* Header */}
      <div className="binding-display-header">
        <h4 className="binding-display-label">
          {variant === 'base' ? 'Base ValueSet (Read-Only)' : 'Selected ValueSet'}
        </h4>
        {showActions && (
          <div className="binding-actions">
            <button 
              className="action-btn-outline" 
              onClick={onChangeValueSet}
            >
              Change ValueSet
            </button>
            {variant === 'current' && onClearOverride && (
              <button 
                className="action-btn-text-danger" 
                onClick={onClearOverride}
              >
                Clear Override
              </button>
            )}
          </div>
        )}
      </div>

      {/* ValueSet Info */}
      <div className="binding-valueset-info">
        {loading && (
          <div className="binding-loading">
            <span className="spinner-small"></span>
            Loading...
          </div>
        )}

        {error && (() => {
          const { baseUrl, version } = parseCanonicalUrl(binding.valueSetUrl);
          
          return (
            <div className="binding-error-minimal">
              <div className="binding-name-fallback">Unknown ValueSet</div>
              <div className="binding-url-minimal">
                <code>{baseUrl}</code>
                <button
                  onClick={() => copyToClipboard(binding.valueSetUrl)}
                  className="btn-copy-tiny"
                  title="Copy full URL"
                >
                  📋
                </button>
              </div>
              {version && (
                <div className="binding-version-info">
                  {formatFhirVersion(version)}
                </div>
              )}
            </div>
          );
        })()}

        {!loading && !error && preview && (() => {
          const { baseUrl, version } = parseCanonicalUrl(binding.valueSetUrl);
          
          return (
            <>
              <div className="binding-name-minimal">{preview.name}</div>
              <div className="binding-url-minimal">
                <code>{baseUrl}</code>
                <button
                  onClick={() => copyToClipboard(binding.valueSetUrl)}
                  className="btn-copy-tiny"
                  title="Copy full URL"
                >
                  📋
                </button>
              </div>
              
              {/* Version Metadata */}
              {version && (
                <div className="binding-version-info">
                  {formatFhirVersion(version)}
                </div>
              )}
              
              {/* Code Summary Line */}
              <div className="binding-code-summary">
                <span className="summary-label">Codes:</span>
                <span className="summary-value">{getCodeSummary()}</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Strength Control (passed as children) */}
      {children && (
        <div className="binding-strength-section">
          {children}
        </div>
      )}
    </div>
  );
};
