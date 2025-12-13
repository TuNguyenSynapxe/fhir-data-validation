import React from 'react';
import type { CoverageStatus, MatchType } from '../types/ruleCoverage';

/**
 * CoverageStatusBadge - Lightweight coverage indicator
 * 
 * Requirements:
 * - Display coverage status with color coding
 * - Green = covered, Blue = suggested, Grey = uncovered
 * - Show match type icon when covered
 * - Minimal design, read-only
 * 
 * Constraints:
 * - No business logic
 * - Pure presentational component
 * - No state, no side effects
 */
interface CoverageStatusBadgeProps {
  status: CoverageStatus;
  matchType?: MatchType;
  size?: 'sm' | 'md';
}

const CoverageStatusBadge: React.FC<CoverageStatusBadgeProps> = ({
  status,
  matchType,
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  // Color mapping: green = covered, blue = suggested, grey = uncovered
  const statusConfig = {
    covered: {
      bgColor: 'bg-green-500',
      label: 'Covered',
    },
    suggested: {
      bgColor: 'bg-blue-500',
      label: 'Suggested',
    },
    uncovered: {
      bgColor: 'bg-gray-300',
      label: 'Uncovered',
    },
  };

  const config = statusConfig[status];

  // Match type icons (for covered status only)
  const renderMatchIcon = () => {
    if (status !== 'covered' || !matchType || matchType === 'none') return null;

    const iconClasses = 'w-3 h-3 text-green-700 ml-1';

    switch (matchType) {
      case 'exact':
        // Checkmark for exact match
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'wildcard':
        // Asterisk for wildcard match
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'parent':
        // Arrow up for parent coverage
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-1" title={config.label}>
      <div className={`${sizeClasses} rounded-full ${config.bgColor} flex-shrink-0`} />
      {renderMatchIcon()}
    </div>
  );
};

export default CoverageStatusBadge;
