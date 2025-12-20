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
}

/**
 * SmartPathBreadcrumb Component
 * 
 * Renders a FHIR path as structured breadcrumbs with:
 * - Bold resource name
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
  jsonPointer
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
    <div
      onClick={(e) => {
        if (hasNavigation) {
          e.stopPropagation();
          onNavigate();
        }
      }}
      className={`group flex items-center gap-1 ${
        hasNavigation ? 'cursor-pointer' : ''
      } ${className}`}
      title={
        !pathValidation.isValid && pathValidation.nearestPath !== null
          ? `Path not found. Will navigate to nearest parent: ${pathValidation.nearestPath || '(root)'}`
          : pathValidation.isValid && hasNavigation
          ? 'Click to navigate to this path'
          : undefined
      }
    >
      {/* Resource name (13px, 600 weight, gray-800) */}
      {resourceType && (
        <>
          <span className="font-semibold text-gray-800" style={{ fontSize: '13px' }}>
            {resourceType}
          </span>
          {segments.length > 0 && (
            <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
          )}
        </>
      )}

      {/* Path segments */}
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
  );
};
