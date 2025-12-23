import React from 'react';
import { ChevronRight, Target, AlertCircle } from 'lucide-react';
import type { PathSegment } from '../../../utils/smartPathFormatting';
import { validateJsonPointer, findNearestValidPath } from '../../../utils/pathNavigation';

interface SmartPathBreadcrumbProps {
  resourceType?: string;
  segments: PathSegment[];
  onNavigate?: () => void;
  className?: string;
  bundleJson?: string; // For path validation
  jsonPointer?: string; // For path validation
  fullPath?: string; // Full FHIRPath (unused - kept for backward compatibility)
}

/**
 * SmartPathBreadcrumb Component
 * 
 * Phase 6: Structure-Only Breadcrumb Rendering
 * 
 * Renders ONLY structural JSON path segments as breadcrumbs.
 * 
 * ⚠️ IMPORTANT: This component does NOT render scope selectors (where clauses).
 * Scope selectors must be rendered separately using ScopeSelectorChip component.
 * 
 * Why where() is excluded:
 * - where() clauses are FILTERS (scope selectors), not structure
 * - They don't map to JSON object properties
 * - Mixing filters with structure creates semantic confusion
 * - Separation enables proper multi-filter support
 * 
 * Example:
 * Input:  Observation.where(code='HS').performer.where(use='official').display
 * This component shows: Observation → performer → display
 * ScopeSelectorChip shows: [Filter: code='HS'] [Filter: use='official']
 * 
 * Features:
 * - Bold resource name
 * - Monospace path segments
 * - Visual separation between segments (chevron)
 * - Highlighted final segment
 * - Optional array indices
 * - Navigation icon on hover
 * - Color indicators: blue (path exists), red (path not found)
 */
export const SmartPathBreadcrumb: React.FC<SmartPathBreadcrumbProps> = ({
  resourceType,
  segments,
  onNavigate,
  className = '',
  bundleJson,
  jsonPointer,
  // fullPath is unused - scope selectors are handled by ScopeSelectorChip
}) => {
  if (segments.length === 0 && !resourceType) {
    return <span className="text-gray-400 text-sm">Unknown path</span>;
  }

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

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* Resource Type (structure root) */}
      {resourceType && (
        <span className="font-semibold text-gray-800" style={{ fontSize: '13px' }}>
          {resourceType}
        </span>
      )}

      {/* Structural Breadcrumb (JSON structure only - NO filters) */}
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
