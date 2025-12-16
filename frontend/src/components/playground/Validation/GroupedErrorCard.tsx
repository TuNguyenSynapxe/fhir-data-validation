import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronRight, XCircle, CheckCircle } from 'lucide-react';
import { getLayerMetadata } from '../../../utils/validationLayers';
import { getExplanationTemplate } from '../../../utils/validationExplanations';
import { formatSmartPath, getScopedSegments, extractFullJsonPath, convertToJsonPath } from '../../../utils/smartPathFormatting';
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

interface GroupedErrorCardProps {
  errors: ValidationError[];
  errorCode: string;
  source: string;
  allErrors?: ValidationError[]; // All errors for override detection
  onClick?: (error: ValidationError) => void;
  onNavigateToPath?: (jsonPointer: string) => void;
  showExplanations?: boolean;
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
/**
 * Deduplicate errors by normalized path
 */
const deduplicateByPath = (errors: ValidationError[]): Map<string, ValidationError[]> => {
  const pathGroups = new Map<string, ValidationError[]>();
  
  errors.forEach(error => {
    const normalizedPath = error.navigation?.jsonPointer || error.jsonPointer || error.path || 'unknown';
    if (!pathGroups.has(normalizedPath)) {
      pathGroups.set(normalizedPath, []);
    }
    pathGroups.get(normalizedPath)!.push(error);
  });
  
  return pathGroups;
};

export const GroupedErrorCard: React.FC<GroupedErrorCardProps> = ({ 
  errors, 
  errorCode,
  source,
  allErrors = [],
  onClick,
  onNavigateToPath,
  showExplanations = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const metadata = getLayerMetadata(source);
  const firstError = errors[0];
  
  // Get blocking status with override detection (use first error as representative)
  const blockingStatus = getBlockingStatusDisplay(firstError, allErrors);
  const SeverityIcon = getSeverityIcon(firstError.severity);
  
  // Get explanation template for this error group
  const explanationTemplate = getExplanationTemplate({
    source,
    code: errorCode,
    path: firstError.path,
    message: firstError.message
  });
  
  // Deduplicate by path, then group by resourceType
  const deduplicatedPaths = deduplicateByPath(errors);
  const resourceGroups = groupByResourceType(errors);
  
  // Create headline with count - Format: [Label] — [Error Code] ([Count] occurrences)
  const totalCount = deduplicatedPaths.size; // Count unique paths
  const headline = `${metadata.displayName} — ${errorCode || 'Validation Issue'} (${totalCount} location${totalCount > 1 ? 's' : ''})`;

  // Generate smart summary message for UNKNOWN_ELEMENT (resource-agnostic)
  const generateSmartSummary = (): { message: string; metadata?: string } => {
    // Special handling for UNKNOWN_ELEMENT related to extensions
    if (errorCode === 'UNKNOWN_ELEMENT' && source === 'LINT') {
      // Extract property name from first error
      const propertyName = firstError.details?.propertyName || 
                          firstError.message.match(/Property '([^']+)'/)?.[1] ||
                          'unknown property';
      
      // Get resource type counts
      const resourceCounts = new Map<string, number>();
      errors.forEach(error => {
        const resType = error.resourceType || 'Unknown';
        resourceCounts.set(resType, (resourceCounts.get(resType) || 0) + 1);
      });

      // Check if it's an Extension type issue
      const isExtensionIssue = firstError.message.includes('`Extension` type') || 
                               firstError.details?.schemaContext === 'Extension';

      if (isExtensionIssue && resourceCounts.size > 1) {
        // Multiple resources affected
        const resourceSummary = Array.from(resourceCounts.entries())
          .sort((a, b) => b[1] - a[1]) // Sort by count descending
          .map(([type, count]) => `${type} (${count})`)
          .join(', ');

        return {
          message: `Property '${propertyName}' is not defined on the FHIR R4 Extension type and appears in extension elements across multiple resources.`,
          metadata: `Affected resources: ${resourceSummary}`
        };
      } else if (isExtensionIssue && resourceCounts.size === 1) {
        // Single resource type
        const [[resourceType, count]] = Array.from(resourceCounts.entries());
        return {
          message: `Property '${propertyName}' is not defined on the FHIR R4 Extension type and appears in ${resourceType} extension elements.`,
          metadata: count > 1 ? `Found in ${count} locations` : undefined
        };
      }
    }

    // Default: use first error message
    return { message: firstError.message };
  };

  const { message: summaryMessage, metadata: summaryMetadata } = generateSmartSummary();

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
                : blockingStatus.isOverridden
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {metadata.isBlocking ? (
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
          </div>

          {/* Compact summary (always visible) */}
          <div className="mb-2">
            <p className="text-xs text-gray-600">
              {summaryMessage}
            </p>
            {summaryMetadata && (
              <p className="text-xs text-gray-500 italic mt-1">
                {summaryMetadata}
              </p>
            )}
          </div>

          {/* Progressive disclosure: Explanations (when enabled) */}
          {showExplanations && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded">
              {/* What this means */}
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-900 mb-1">
                  What this means
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {explanationTemplate.whatThisMeans}
                </p>
              </div>

              {/* How to fix */}
              {explanationTemplate.howToFix.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-900 mb-1">
                    How to fix
                  </p>
                  <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                    {explanationTemplate.howToFix.map((step, index) => (
                      <li key={index} className="leading-relaxed">{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Optional note */}
              {explanationTemplate.note && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    {explanationTemplate.note}
                  </p>
                </div>
              )}

              {/* Details (fallback or diagnostic info) */}
              {explanationTemplate.details && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Details
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {explanationTemplate.details}
                  </p>
                </div>
              )}
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

          {/* Expandable list of deduplicated paths */}
          {isExpanded && (
            <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
              {/* Group deduplicated paths by resourceType for display */}
              {Array.from(resourceGroups.entries()).map(([resourceType, groupErrors]) => {
                // Deduplicate within this resource type
                const resourceDeduplicatedPaths = deduplicateByPath(groupErrors);
                
                return (
                  <div key={resourceType}>
                    {/* Resource type header */}
                    {resourceGroups.size > 1 && (
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">
                        {resourceType}
                      </h4>
                    )}
                    
                    {/* Deduplicated paths */}
                    <div className="space-y-2 pl-2">
                      {Array.from(resourceDeduplicatedPaths.entries()).map(([path, pathErrors]) => {
                        const error = pathErrors[0]; // Use first error as representative
                        const displayPath = error.path || error.navigation?.breadcrumb || 'Unknown';
                        const jsonPointer = error.jsonPointer || error.navigation?.jsonPointer;
                        const count = pathErrors.length;
                        
                        // Format smart path with breadcrumbs
                        const formattedPath = formatSmartPath(displayPath, resourceType);
                        const scopedSegments = getScopedSegments(formattedPath.segments, resourceType);
                        const jsonPath = convertToJsonPath(jsonPointer);
                        
                        // Determine row background based on source
                        const isLint = source === 'LINT';
                        const rowBgColor = isLint 
                          ? 'bg-amber-50/40 border-amber-200/60 hover:bg-amber-50/60' 
                          : 'bg-gray-50/50 border-gray-200/60 hover:bg-gray-50/80';
                        
                        return (
                          <div
                            key={path}
                            className={`group/row p-2.5 rounded-md border transition-all ${rowBgColor} ${
                              jsonPointer ? 'hover:shadow-sm cursor-pointer' : ''
                            }`}
                            onClick={(e) => {
                              if (jsonPointer) {
                                e.stopPropagation();
                                onClick?.(error);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              {/* Smart Path Breadcrumb */}
                              <div className="flex-1 min-w-0">
                                <SmartPathBreadcrumb
                                  resourceType={resourceType}
                                  segments={scopedSegments}
                                  onNavigate={jsonPointer ? () => onNavigateToPath?.(jsonPointer) : undefined}
                                />
                              </div>
                              
                              {/* Right side: count + info icon */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {count > 1 && (
                                  <span className="text-xs text-gray-600 font-medium px-2 py-0.5 bg-white/70 rounded">
                                    {count}×
                                  </span>
                                )}
                                
                                {/* Path Info Tooltip */}
                                <PathInfoTooltip
                                  fhirPath={formattedPath.fullPath}
                                  jsonPath={jsonPath}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
