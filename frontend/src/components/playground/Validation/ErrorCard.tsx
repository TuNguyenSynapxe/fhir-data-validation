import React from 'react';
import { AlertCircle, AlertTriangle, Info, MapPin, XCircle, CheckCircle } from 'lucide-react';
import { getLayerMetadata } from '../../../utils/validationLayers';

interface ValidationError {
  source: string;
  severity: string;
  resourceType?: string;
  path?: string;
  jsonPointer?: string;
  errorCode?: string;
  message: string;
  details?: Record<string, any>;
  navigation?: {
    jsonPointer?: string;
    breadcrumb?: string;
    resourceIndex?: number;
  };
}

interface ErrorCardProps {
  error: ValidationError;
  onClick?: () => void;
}

/**
 * Get severity icon
 */
const getSeverityIcon = (severity: string) => {
  const normalized = severity.toLowerCase();
  
  if (normalized === 'error') return AlertCircle;
  if (normalized === 'warning') return AlertTriangle;
  return Info;
};

/**
 * Get severity color
 */
const getSeverityColor = (severity: string): string => {
  const normalized = severity.toLowerCase();
  
  if (normalized === 'error') return 'text-red-600';
  if (normalized === 'warning') return 'text-yellow-600';
  return 'text-blue-600';
};

/**
 * ErrorCard Component
 * 
 * Unified error card for all validation layers with:
 * - Clear source badge with display name
 * - Blocking indicator (YES/NO)
 * - Standard explanation text
 * - Smart path navigation
 */
export const ErrorCard: React.FC<ErrorCardProps> = ({ error, onClick }) => {
  const metadata = getLayerMetadata(error.source);
  const SeverityIcon = getSeverityIcon(error.severity);
  const severityColor = getSeverityColor(error.severity);
  
  const fhirPath = error.details?.fhirPath || error.path;
  const hasNavigation = error.jsonPointer || error.navigation?.jsonPointer;

  return (
    <div
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${metadata.borderColor}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <SeverityIcon className={`w-5 h-5 ${severityColor} flex-shrink-0 mt-0.5`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Error message */}
          <p className="text-sm font-medium text-gray-900 mb-2">
            {error.message}
          </p>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {/* Source badge */}
            <span className={`text-xs px-2 py-1 rounded border font-medium ${metadata.badgeColor}`}>
              {metadata.displayName}
            </span>

            {/* Blocking indicator */}
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${
              metadata.isBlocking 
                ? 'bg-red-50 text-red-700 border-red-200' 
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {metadata.isBlocking ? (
                <>
                  <XCircle className="w-3 h-3" />
                  <span className="font-semibold">Blocking: YES</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-semibold">Does NOT block validation</span>
                </>
              )}
            </div>

            {/* Error Code */}
            {error.errorCode && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 font-mono">
                {error.errorCode}
              </span>
            )}

            {/* Resource Type */}
            {error.resourceType && (
              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200">
                {error.resourceType}
              </span>
            )}
          </div>

          {/* Standard explanation text */}
          <p className={`text-xs italic mb-2 ${metadata.textColor}`}>
            {metadata.explanation}
          </p>

          {/* FHIR Path */}
          {fhirPath && (
            <div className="mb-2">
              <button
                className="text-sm font-mono font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                {fhirPath}
              </button>
            </div>
          )}

          {/* Navigation */}
          {hasNavigation ? (
            <button
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
            >
              <MapPin className="w-3 h-3" />
              Jump to field
            </button>
          ) : (
            <span className="text-xs text-gray-400 italic">
              Location not available
            </span>
          )}

          {/* Details (if any) */}
          {error.details && Object.keys(error.details).filter(k => k !== 'fhirPath').length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Additional details
              </summary>
              <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(error.details).filter(([k]) => k !== 'fhirPath')
                  ),
                  null,
                  2
                )}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};
