import React, { useState } from 'react';
import { previewValueSet, type ValueSetPreviewDto } from '../api/sdBuilderApi';

interface ValueSetPreviewProps {
  valueSetUrl?: string;
}

/**
 * ValueSet Preview Component
 * 
 * Display-only component to show codes from a ValueSet.
 * No validation logic - purely informational UX.
 */
export function ValueSetPreview({ valueSetUrl }: ValueSetPreviewProps) {
  const [preview, setPreview] = useState<ValueSetPreviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!valueSetUrl) {
    return null;
  }

  const handlePreview = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await previewValueSet(valueSetUrl, 50);
      setPreview(data);
      setIsExpanded(true);
    } catch (err: any) {
      console.error('Preview failed:', err);
      setError('Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
      <button
        type="button"
        onClick={handlePreview}
        disabled={isLoading}
        className="flex w-full items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 disabled:text-gray-400"
      >
        <span>Preview codes</span>
        <svg
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isLoading && (
        <div className="mt-2 flex items-center justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-600">{error}</div>
      )}

      {isExpanded && preview && (
        <div className="mt-3 space-y-1">
          <div className="mb-2 text-xs font-semibold text-gray-500">
            {preview.name} ({preview.codes.length} code{preview.codes.length !== 1 ? 's' : ''})
          </div>
          <div className="max-h-60 space-y-1 overflow-auto">
            {preview.codes.length === 0 && (
              <div className="text-sm text-gray-500">No preview available</div>
            )}
            {preview.codes.map((code) => (
              <div
                key={code.code}
                className="flex items-baseline gap-2 rounded bg-white px-2 py-1 text-xs"
              >
                <code className="font-semibold text-blue-600">{code.code}</code>
                {code.display && <span className="text-gray-600">{code.display}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
