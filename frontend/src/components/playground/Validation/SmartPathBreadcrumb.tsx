import React from 'react';
import { ChevronRight, Target } from 'lucide-react';
import type { PathSegment } from '../../../utils/smartPathFormatting';

interface SmartPathBreadcrumbProps {
  resourceType?: string;
  segments: PathSegment[];
  onNavigate?: () => void;
  className?: string;
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
 */
export const SmartPathBreadcrumb: React.FC<SmartPathBreadcrumbProps> = ({
  resourceType,
  segments,
  onNavigate,
  className = ''
}) => {
  if (segments.length === 0 && !resourceType) {
    return <span className="text-gray-400 text-sm">Unknown path</span>;
  }

  const hasNavigation = !!onNavigate;

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
                ? 'font-medium text-blue-700'
                : 'font-normal text-gray-500'
            }`}
            style={{ fontSize: '12.5px' }}
          >
            {segment.name}
            {segment.index !== undefined && (
              <span className="text-blue-700 font-medium">
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

      {/* Navigation icon (always visible, blue-700) */}
      {hasNavigation && (
        <Target className="w-3.5 h-3.5 text-blue-700 ml-1 flex-shrink-0" />
      )}
    </div>
  );
};
