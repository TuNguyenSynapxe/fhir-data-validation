import React from 'react';
import { AlertCircle, AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';
import { getLayerMetadata } from '../../../utils/validationLayers';
import { formatSmartPath, getScopedSegments, convertToJsonPath } from '../../../utils/smartPathFormatting';
import { SmartPathBreadcrumb } from './SmartPathBreadcrumb';
import { PathInfoTooltip } from './PathInfoTooltip';
import { getBlockingStatusDisplay } from '../../../utils/validationOverrides';

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
  allErrors?: ValidationError[]; // All errors for override detection
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
export const ErrorCard: React.FC<ErrorCardProps> = ({ error, allErrors = [], onClick }) => {
  const metadata = getLayerMetadata(error.source);
  const SeverityIcon = getSeverityIcon(error.severity);
  const severityColor = getSeverityColor(error.severity);
  
  const fhirPath = error.details?.fhirPath || error.path;
  const hasNavigation = error.jsonPointer || error.navigation?.jsonPointer;
  
  // Get blocking status with override detection
  const blockingStatus = getBlockingStatusDisplay(error, allErrors);

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
              blockingStatus.text === 'Blocking: YES'
                ? 'bg-red-50 text-red-700 border-red-200' 
                : blockingStatus.isOverridden
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {blockingStatus.text === 'Blocking: YES' ? (
                <>
                  <XCircle className="w-3 h-3" />
                  <span className="font-semibold">{blockingStatus.text}</span>
                </>
              ) : blockingStatus.isOverridden ? (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-semibold">{blockingStatus.text}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-semibold">{blockingStatus.text}</span>
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

          {/* FHIR Path - Smart Breadcrumb */}
          {fhirPath && (
            <div className="group/row mb-2 p-2.5 bg-gray-50/50 rounded-md border border-gray-200/60 hover:bg-gray-50/80 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <SmartPathBreadcrumb
                    resourceType={error.resourceType}
                    segments={getScopedSegments(
                      formatSmartPath(fhirPath, error.resourceType).segments,
                      error.resourceType
                    )}
                    fullPath={fhirPath}
                    onNavigate={hasNavigation ? onClick : undefined}
                  />
                </div>
                
                {/* Path Info Tooltip */}
                <PathInfoTooltip
                  fhirPath={fhirPath}
                  jsonPath={convertToJsonPath(error.jsonPointer || error.navigation?.jsonPointer)}
                />
              </div>
            </div>
          )}

          {/* Navigation hint */}
          {!hasNavigation && (
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
