import React from 'react';
import { XCircle, CheckCircle } from 'lucide-react';
import { ValidationIcon } from '../../../ui/icons/ValidationIcons';
import { getLayerMetadata } from '../../../utils/validationLayers';
import { SmartPathBreadcrumb } from './SmartPathBreadcrumb';
import { PathInfoTooltip } from './PathInfoTooltip';
import { formatSmartPath, getScopedSegments, convertToJsonPath } from '../../../utils/smartPathFormatting';
import { isIssueBlocking } from '../../../types/validationIssues';
import type { ValidationIssue } from '../../../types/validationIssues';

interface IssueCardProps {
  issue: ValidationIssue;
  onClick?: (issue: ValidationIssue) => void;
  onNavigateToPath?: (jsonPointer: string) => void;
  showExplanations?: boolean;
  bundleJson?: string; // For path validation
}

/**
 * IssueCard Component
 * 
 * Renders a single ungrouped validation issue.
 */
export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onClick,
  onNavigateToPath,
  showExplanations = false,
  bundleJson
}) => {
  const metadata = getLayerMetadata(issue.source);
  const blocking = isIssueBlocking(issue);

  const displayPath = issue.location || 'Unknown';
  const formattedPath = formatSmartPath(displayPath, issue.resourceType || '');
  const scopedSegments = getScopedSegments(formattedPath.segments, issue.resourceType || '');
  const jsonPath = convertToJsonPath(issue.jsonPointer);

  // Determine if this is a non-blocking advisory source
  const isAdvisorySource = issue.source === 'LINT' || issue.source === 'HL7Advisory' || issue.source === 'Lint' || issue.source === 'HL7_SPEC_HINT';
  
  const cardBgColor = isAdvisorySource ? 'bg-blue-50/30' : 'bg-gray-50/50';
  const borderColor = isAdvisorySource ? 'border-blue-200/50' : 'border-gray-200';

  return (
    <div
      className={`border ${borderColor} rounded-lg p-3 transition-colors ${
        issue.jsonPointer ? 'cursor-pointer hover:shadow-sm' : ''
      } ${cardBgColor}`}
      onClick={(e) => {
        if (issue.jsonPointer) {
          e.stopPropagation();
          onClick?.(issue);
        }
      }}
    >
      {/* Advisory Notice */}
      {isAdvisorySource && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <p className="font-medium">ℹ️ Advisory - Non-blocking</p>
          <p className="mt-0.5 text-gray-700">
            This is a recommendation that does not prevent validation or rule editing.
          </p>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <ValidationIcon
          source={issue.source}
          severity={issue.severity}
          className="flex-shrink-0 w-4 h-4 mt-0.5"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Location breadcrumb */}
          {issue.resourceType && issue.location && issue.location !== 'unknown' ? (
            <SmartPathBreadcrumb
              resourceType={issue.resourceType}
              segments={scopedSegments}
              onNavigate={
                issue.jsonPointer ? () => onNavigateToPath?.(issue.jsonPointer!) : undefined
              }
              bundleJson={bundleJson}
              jsonPointer={issue.jsonPointer}
            />
          ) : (
            <span className="text-xs text-gray-500 italic">Location not available</span>
          )}

          {/* Message */}
          <p className="text-sm text-gray-900 mt-1.5">{issue.message}</p>

          {/* Optional: Rule path for Project Rules */}
          {issue.rulePath && issue.source === 'PROJECT' && (
            <p className="text-xs text-gray-500 mt-1 font-mono">
              Rule: {issue.rulePath}
            </p>
          )}

          {/* Optional: Explanations (if enabled) */}
          {showExplanations && issue.details?.explanation && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
              {issue.details.explanation}
            </div>
          )}
        </div>

        {/* Right side badges */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Source badge */}
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: metadata.bgColor,
              color: metadata.textColor,
              border: `1px solid ${metadata.borderColor}`,
            }}
          >
            {metadata.displayName}
          </span>

          {/* Blocking indicator */}
          <div
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${
              blocking
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {blocking ? (
              <>
                <XCircle className="w-3 h-3" />
                <span className="font-semibold">Blocking</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3" />
                <span className="font-semibold">Non-blocking</span>
              </>
            )}
          </div>

          {/* Path info tooltip */}
          <PathInfoTooltip fhirPath={formattedPath.fullPath} jsonPath={jsonPath} />
        </div>
      </div>
    </div>
  );
};
