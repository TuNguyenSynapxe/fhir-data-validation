import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronRight, XCircle, CheckCircle, MapPin } from 'lucide-react';
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

interface GroupedErrorCardProps {
  errors: ValidationError[];
  errorCode: string;
  source: string;
  onClick?: (error: ValidationError) => void;
  onNavigateToPath?: (jsonPointer: string) => void;
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
 * Group errors by resourceType for internal sub-grouping
 */
const groupByResourceType = (errors: ValidationError[]): Map<string, ValidationError[]> => {
  const groups = new Map<string, ValidationError[]>();
  
  errors.forEach(error => {
    const resourceType = error.resourceType || 'Unknown';
    if (!groups.has(resourceType)) {
      groups.set(resourceType, []);
    }
    groups.get(resourceType)!.push(error);
  });
  
  return groups;
};

/**
 * GroupedErrorCard Component
 * 
 * Groups multiple errors with the same source+errorCode.
 * Shows:
 * - Total count
 * - Sub-grouped by resourceType
 * - Expandable/collapsible
 * - Shared explanation
 */
export const GroupedErrorCard: React.FC<GroupedErrorCardProps> = ({ 
  errors, 
  errorCode,
  source,
  onClick,
  onNavigateToPath 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  
  const metadata = getLayerMetadata(source);
  const firstError = errors[0];
  const SeverityIcon = getSeverityIcon(firstError.severity);
  
  // Check if this is a SPEC_HINT group
  const isSpecHint = source === 'SPEC_HINT' || source === 'spec_hint';
  
  // Group by resourceType
  const resourceGroups = groupByResourceType(errors);
  
  // Create headline with count - Format: [Label] — [Error Code] ([Count] occurrences)
  const totalCount = errors.length;
  const headline = `${metadata.displayName} — ${errorCode || 'Validation Issue'} (${totalCount} occurrence${totalCount > 1 ? 's' : ''})`;

  return (
    <div className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${metadata.borderColor}`}>
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <SeverityIcon className={`w-5 h-5 ${metadata.textColor} flex-shrink-0 mt-0.5`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Headline with expand/collapse */}
          <div 
            className="flex items-center gap-2 mb-2 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium text-gray-900">
              {headline}
            </p>
          </div>

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
          </div>

          {/* Standard explanation text */}
          <p className={`text-xs italic mb-2 ${metadata.textColor}`}>
            {metadata.explanation}
          </p>

          {/* SPEC_HINT Explanation Banner */}
          {isSpecHint && isBannerVisible && (
            <div className="mb-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-cyan-900 mb-1">
                    Why am I seeing this?
                  </p>
                  <div className="text-xs text-cyan-800 space-y-1">
                    <p>HL7 FHIR specifications define required fields to ensure interoperability.</p>
                    <p>Some FHIR engines (including Firely) do not strictly enforce all required fields.</p>
                    <p>These warnings help build portable, standards-aligned bundles but do not block validation.</p>
                  </div>
                </div>
                <button
                  className="flex-shrink-0 text-cyan-600 hover:text-cyan-800 text-xs font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBannerVisible(false);
                  }}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Resource type breakdown */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {Array.from(resourceGroups.entries()).map(([resourceType, groupErrors]) => (
              <span 
                key={resourceType}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200"
              >
                {resourceType} ({groupErrors.length})
              </span>
            ))}
          </div>

          {/* Expandable list of individual errors */}
          {isExpanded && (
            <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
              {Array.from(resourceGroups.entries()).map(([resourceType, groupErrors]) => (
                <div key={resourceType}>
                  {/* Resource type header */}
                  {resourceGroups.size > 1 && (
                    <h4 className="text-xs font-semibold text-gray-700 mb-1">
                      {resourceType}
                    </h4>
                  )}
                  
                  {/* Individual errors */}
                  <div className="space-y-1">
                    {groupErrors.map((error, index) => {
                      const displayPath = error.path || error.navigation?.breadcrumb || 'Unknown';
                      const jsonPointer = error.jsonPointer || error.navigation?.jsonPointer;
                      
                      return (
                        <div
                          key={index}
                          className={`p-2 rounded border hover:bg-opacity-70 transition-colors cursor-pointer ${metadata.bgColor}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClick?.(error);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {/* Path - prominent and clickable */}
                              {displayPath && (
                                <button
                                  className="text-sm font-mono font-semibold text-blue-700 hover:text-blue-900 hover:underline text-left mb-1 block"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (jsonPointer) {
                                      onNavigateToPath?.(jsonPointer);
                                    }
                                  }}
                                  title={jsonPointer ? "Click to locate this field in the bundle" : "No navigation available"}
                                  disabled={!jsonPointer}
                                >
                                  {displayPath}
                                </button>
                              )}
                              
                              {/* Message - secondary, reduced */}
                              {error.message && !error.message.includes(displayPath || '') && (
                                <p className="text-xs text-gray-600 italic">
                                  {error.message}
                                </p>
                              )}
                            </div>
                            
                            {/* Navigation icon */}
                            {jsonPointer && (
                              <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
