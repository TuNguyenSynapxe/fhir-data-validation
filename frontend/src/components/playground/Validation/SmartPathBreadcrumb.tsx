import React from 'react';
import { ChevronRight, Target, AlertCircle, Filter } from 'lucide-react';
import type { PathSegment } from '../../../utils/smartPathFormatting';
import { parseFhirPathComponents, formatScopeSelector } from '../../../utils/smartPathFormatting';
import { validateJsonPointer, findNearestValidPath } from '../../../utils/pathNavigation';

interface SmartPathBreadcrumbProps {
  resourceType?: string;
  segments: PathSegment[];
  onNavigate?: () => void;
  className?: string;
  bundleJson?: string; // For path validation
  jsonPointer?: string; // For path validation
  fullPath?: string; // Full FHIRPath for filter detection
}

/**
 * SmartPathBreadcrumb Component
 * 
 * Renders a FHIR path correctly according to FHIRPath semantics:
 * 
 * Layer 1 - Scope Context (Resource + Filter)
 * -------------------------------------------
 * Shows the resource type with optional filter predicate:
 * - "Observation (code = HS)" if filter exists
 * - "Observation" if no filter
 * 
 * Layer 2 - Structural Breadcrumb
 * --------------------------------
 * Shows only actual JSON structure segments:
 * - "performer > display"
 * - Does NOT include where() clauses
 * 
 * Features:
 * - Bold resource name
 * - Filter badge with purple styling
 * - Monospace path segments
 * - Visual separation between segments
 * - Highlighted final segment
 * - Optional array indices
 * - Navigation icon on hover
 * - Color indicators: blue (path exists), red (path not found, will navigate to nearest parent)
 */
export const SmartPathBreadcrumb: React.FC<SmartPathBreadcrumbProps> = ({
  resourceType,
  segments,
  onNavigate,
  className = '',
  bundleJson,
  jsonPointer,
  fullPath
}) => {
  if (segments.length === 0 && !resourceType) {
    return <span className="text-gray-400 text-sm">Unknown path</span>;
  }

  // Parse FHIRPath to extract filter context
  const pathComponents = React.useMemo(() => {
    if (!fullPath) return null;
    return parseFhirPathComponents(fullPath);
  }, [fullPath]);

  // Validate path if bundleJson is provided
  const pathValidation = React.useMemo(() => {
    if (!bundleJson || !jsonPointer) {
      return { isValid: true, canNavigate: !!onNavigate, nearestPath: null };
    }
    
    const isExactPath = validateJsonPointer(bundleJson, jsonPointer);
    const nearest = findNearestValidPath(bundleJson, jsonPointer);
    
    return {
      isValid: isExactPath,
      canNavigate: nearest !== null,
      nearestPath: nearest?.isExact ? null : nearest?.path || null
    };
  }, [bundleJson, jsonPointer, onNavigate]);

  const hasNavigation = onNavigate && pathValidation.canNavigate;
  
  // Color based on path validation:
  // - Blue: path exists exactly
  // - Red: path doesn't exist, but nearest parent available
  const segmentColor = pathValidation.isValid ? 'text-blue-700' : 'text-red-600';
  const iconColor = pathValidation.isValid ? 'text-blue-700' : 'text-red-600';
  const Icon = pathValidation.isValid ? Target : AlertCircle;

  // Get formatted filter text
  const filterText = pathComponents?.scopeSelector 
    ? formatScopeSelector(pathComponents.scopeSelector)
    : null;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* Layer 1: Scope Context (Resource + Filter) */}
      <div className="flex items-center gap-1.5">
        {/* Resource name */}
        {(resourceType || pathComponents?.resourceType) && (
          <span className="font-semibold text-gray-800" style={{ fontSize: '13px' }}>
            {resourceType || pathComponents?.resourceType}
          </span>
        )}

        {/* Filter badge (if present) */}
        {filterText && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200"
            title={`Filtered by: ${pathComponents?.scopeSelector}`}
          >
            <Filter className="w-3 h-3 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">
              {filterText}
            </span>
          </span>
        )}
      </div>

      {/* Layer 2: Structural Breadcrumb (JSON structure only) */}
      {segments.length > 0 && (
        <div
          onClick={(e) => {
            if (hasNavigation) {
              e.stopPropagation();
              onNavigate();
            }
          }}
          className={`group flex items-center gap-1 ${
            hasNavigation ? 'cursor-pointer' : ''
          }`}
          title={
            !pathValidation.isValid && pathValidation.nearestPath !== null
              ? `Path not found. Will navigate to nearest parent: ${pathValidation.nearestPath || '(root)'}`
              : pathValidation.isValid && hasNavigation
              ? 'Click to navigate to this path'
              : undefined
          }
        >
          {/* Path segments (structural only) */}
          {segments.map((segment, index) => (
            <React.Fragment key={index}>
              <span
                className={`font-mono ${
                  segment.isLast
                    ? `font-medium ${segmentColor}`
                    : 'font-normal text-gray-500'
                }`}
                style={{ fontSize: '12.5px' }}
              >
                {segment.name}
                {segment.index !== undefined && (
                  <span className={`font-medium ${segmentColor}`}>
                    [{segment.index}]
                  </span>
                )}
              </span>

              {/* Separator (chevron) */}
              {!segment.isLast && (
                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}

          {/* Navigation icon (changes based on path validity) */}
          {hasNavigation && (
            <Icon className={`w-3.5 h-3.5 ${iconColor} ml-1 flex-shrink-0`} />
          )}
        </div>
      )}
    </div>
  );
};
