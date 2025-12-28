/**
 * AdvisoryPanel - Rule Advisory Display
 * Phase 3D: Non-blocking advisory panel with severity grouping
 * 
 * Features:
 * - Group by severity (Error / Warning / Info)
 * - Click to navigate to related concept/constraint
 * - Collapsible sections
 * - No blocking behavior
 */

import { useState } from 'react';
import type { RuleAdvisory, AdvisoryResponse } from '../../types/terminology';
import { InfoTooltip, TooltipContent } from './InfoTooltip';
import {
  filterBySeverity,
  countBySeverity,
} from '../../api/advisoryApi';

interface AdvisoryPanelProps {
  /** Advisory response from API */
  advisoryResponse: AdvisoryResponse | null;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string;
  /** Callback when advisory is clicked */
  onAdvisoryClick: (advisory: RuleAdvisory) => void;
  /** Whether panel is collapsed */
  isCollapsed?: boolean;
  /** Toggle collapse */
  onToggleCollapse?: () => void;
}

export function AdvisoryPanel({
  advisoryResponse,
  isLoading,
  error,
  onAdvisoryClick,
  isCollapsed = false,
  onToggleCollapse,
}: AdvisoryPanelProps) {
  const [expandedSeverity, setExpandedSeverity] = useState<Set<string>>(
    new Set(['Error', 'Warning'])
  );

  const toggleSeverity = (severity: string) => {
    const newExpanded = new Set(expandedSeverity);
    if (newExpanded.has(severity)) {
      newExpanded.delete(severity);
    } else {
      newExpanded.add(severity);
    }
    setExpandedSeverity(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-white border-t border-gray-200">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
        <span className="text-gray-600 text-sm">Loading advisories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-t border-red-200">
        <p className="text-red-800 text-sm">⚠️ Failed to load advisories: {error}</p>
      </div>
    );
  }

  if (!advisoryResponse) {
    return null;
  }

  const advisories = advisoryResponse.advisories;
  const counts = countBySeverity(advisories);
  const totalCount = counts.errors + counts.warnings + counts.info;

  if (totalCount === 0) {
    return (
      <div className="p-4 bg-green-50 border-t border-green-200">
        <p className="text-green-800 text-sm flex items-center">
          <span className="mr-2">✓</span>
          No advisories found. All terminology references are valid.
        </p>
      </div>
    );
  }

  const errors = filterBySeverity(advisories, 'Error');
  const warnings = filterBySeverity(advisories, 'Warning');
  const infos = filterBySeverity(advisories, 'Info');

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleCollapse}
            className="text-gray-600 hover:text-gray-900"
            title={isCollapsed ? 'Expand advisories' : 'Collapse advisories'}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            Rule Advisories
            <InfoTooltip content={TooltipContent.advisory} />
          </h3>
          <div className="flex items-center space-x-2">
            {counts.errors > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                {counts.errors} Error{counts.errors !== 1 ? 's' : ''}
              </span>
            )}
            {counts.warnings > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                {counts.warnings} Warning{counts.warnings !== 1 ? 's' : ''}
              </span>
            )}
            {counts.info > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                {counts.info} Info
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 flex items-center">
          Non-blocking
          <InfoTooltip content={TooltipContent.nonBlocking} />
          • Click to navigate
        </p>
      </div>

      {/* Advisory Sections (collapsible) */}
      {!isCollapsed && (
        <div className="max-h-80 overflow-y-auto">
          {/* Errors Section */}
          {counts.errors > 0 && (
            <AdvisorySection
              title="Errors"
              severity="Error"
              count={counts.errors}
              advisories={errors}
              isExpanded={expandedSeverity.has('Error')}
              onToggle={() => toggleSeverity('Error')}
              onAdvisoryClick={onAdvisoryClick}
            />
          )}

          {/* Warnings Section */}
          {counts.warnings > 0 && (
            <AdvisorySection
              title="Warnings"
              severity="Warning"
              count={counts.warnings}
              advisories={warnings}
              isExpanded={expandedSeverity.has('Warning')}
              onToggle={() => toggleSeverity('Warning')}
              onAdvisoryClick={onAdvisoryClick}
            />
          )}

          {/* Info Section */}
          {counts.info > 0 && (
            <AdvisorySection
              title="Info"
              severity="Info"
              count={counts.info}
              advisories={infos}
              isExpanded={expandedSeverity.has('Info')}
              onToggle={() => toggleSeverity('Info')}
              onAdvisoryClick={onAdvisoryClick}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * AdvisorySection - Collapsible section for one severity level
 */
interface AdvisorySectionProps {
  title: string;
  severity: 'Error' | 'Warning' | 'Info';
  count: number;
  advisories: RuleAdvisory[];
  isExpanded: boolean;
  onToggle: () => void;
  onAdvisoryClick: (advisory: RuleAdvisory) => void;
}

function AdvisorySection({
  title,
  severity,
  count,
  advisories,
  isExpanded,
  onToggle,
  onAdvisoryClick,
}: AdvisorySectionProps) {
  const bgColors = {
    Error: 'bg-red-50',
    Warning: 'bg-yellow-50',
    Info: 'bg-blue-50',
  };

  const borderColors = {
    Error: 'border-red-200',
    Warning: 'border-yellow-200',
    Info: 'border-blue-200',
  };

  const textColors = {
    Error: 'text-red-900',
    Warning: 'text-yellow-900',
    Info: 'text-blue-900',
  };

  const badgeColors = {
    Error: 'bg-red-100 text-red-700',
    Warning: 'bg-yellow-100 text-yellow-700',
    Info: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className={`border-b ${borderColors[severity]}`}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 ${bgColors[severity]} hover:opacity-80`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm">{isExpanded ? '▼' : '▶'}</span>
          <span className={`text-sm font-medium ${textColors[severity]}`}>
            {title}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded ${badgeColors[severity]}`}>
            {count}
          </span>
        </div>
      </button>

      {/* Advisory List */}
      {isExpanded && (
        <div className="divide-y divide-gray-200">
          {advisories.map((advisory, index) => (
            <AdvisoryListItem
              key={index}
              advisory={advisory}
              onClick={() => onAdvisoryClick(advisory)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * AdvisoryListItem - Individual advisory display
 */
interface AdvisoryListItemProps {
  advisory: RuleAdvisory;
  onClick: () => void;
}

function AdvisoryListItem({ advisory, onClick }: AdvisoryListItemProps) {
  const severityIcons = {
    Error: '❌',
    Warning: '⚠️',
    Info: 'ℹ️',
  };

  const severityColors = {
    Error: 'hover:bg-red-50',
    Warning: 'hover:bg-yellow-50',
    Info: 'hover:bg-blue-50',
  };

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 cursor-pointer transition-colors ${severityColors[advisory.severity]}`}
    >
      <div className="flex items-start space-x-3">
        <span className="text-lg mt-0.5">{severityIcons[advisory.severity]}</span>
        <div className="flex-1 min-w-0">
          {/* Advisory Code */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-mono font-medium text-gray-900">
              {advisory.advisoryCode}
            </span>
            {advisory.context.constraintId && (
              <span className="text-xs text-gray-500">
                → {advisory.context.constraintId}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-gray-700 mb-2">{advisory.message}</p>

          {/* Context Details */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            {advisory.context.system && (
              <span className="px-2 py-1 bg-gray-100 rounded font-mono">
                System: {truncate(advisory.context.system, 40)}
              </span>
            )}
            {advisory.context.code && (
              <span className="px-2 py-1 bg-gray-100 rounded font-mono">
                Code: {advisory.context.code}
              </span>
            )}
            {advisory.context.display && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                Display: {advisory.context.display}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper: Truncate long strings
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}
