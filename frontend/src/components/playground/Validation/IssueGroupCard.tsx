import React, { useState } from 'react';
import { ChevronDown, ChevronRight, XCircle, CheckCircle } from 'lucide-react';
import { ValidationIcon } from '../../../ui/icons/ValidationIcons';
import { getLayerMetadata } from '../../../utils/validationLayers';
import { SmartPathBreadcrumb } from './SmartPathBreadcrumb';
import { PathInfoTooltip } from './PathInfoTooltip';
import { formatSmartPath, getScopedSegments, convertToJsonPath } from '../../../utils/smartPathFormatting';
import { hasIdenticalMessages } from '../../../utils/validationGrouping';
import type { IssueGroup, ValidationIssue } from '../../../types/validationIssues';

interface IssueGroupCardProps {
  group: IssueGroup;
  onIssueClick?: (issue: ValidationIssue) => void;
  onNavigateToPath?: (jsonPointer: string) => void;
  showExplanations?: boolean;
  bundleJson?: string; // For path validation
}

/**
 * IssueGroupCard Component
 * 
 * Renders a group of related validation issues.
 * CRITICAL: Each item displays its own message, not a shared group message.
 */
export const IssueGroupCard: React.FC<IssueGroupCardProps> = ({
  group,
  onIssueClick,
  onNavigateToPath,
  showExplanations = false,
  bundleJson
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const metadata = getLayerMetadata(group.source);
  const allMessagesIdentical = hasIdenticalMessages(group);

  // Determine if this is a non-blocking advisory source
  const isAdvisorySource = group.source === 'LINT' || group.source === 'HL7Advisory' || group.source === 'Lint' || group.source === 'HL7_SPEC_HINT';
  
  // Visual styling based on blocking status
  const headerBgColor = isAdvisorySource ? 'bg-blue-50/40' : 'bg-gray-50';
  const borderColor = isAdvisorySource ? 'border-blue-200/50' : 'border-gray-200';

  return (
    <div className={`border ${borderColor} rounded-lg overflow-hidden`}>
      {/* Group Header */}
      <div
        className={`${headerBgColor} border-b ${borderColor} p-3 cursor-pointer hover:bg-opacity-80 transition-colors`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Icon + Title */}
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button
              className="flex-shrink-0 mt-0.5 text-gray-600 hover:text-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <ValidationIcon
              source={group.source}
              severity={group.severity}
              className="flex-shrink-0 w-4 h-4 mt-0.5"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">
                  {group.title}
                </span>
                <span className="text-xs text-gray-600">
                  ({group.count} location{group.count > 1 ? 's' : ''})
                </span>
              </div>

              {/* Neutral description when multiple messages */}
              {!allMessagesIdentical && (
                <p className="text-xs text-gray-600 mt-1">
                  Multiple validation issues found. Expand to see details for each location.
                </p>
              )}

              {/* Show single message if all identical */}
              {allMessagesIdentical && group.items.length > 0 && (
                <p className="text-xs text-gray-700 mt-1">
                  {group.items[0].message}
                </p>
              )}
            </div>
          </div>

          {/* Right: Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Blocking indicator - Enhanced messaging for advisory sources */}
            <div
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${
                group.blocking
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : isAdvisorySource
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              }`}
              title={!group.blocking && isAdvisorySource ? 'This does not prevent validation or rule editing' : undefined}
            >
              {group.blocking ? (
                <>
                  <XCircle className="w-3 h-3" />
                  <span className="font-semibold">Blocking</span>
                </>
              ) : isAdvisorySource ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-semibold">Advisory</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-semibold">Non-blocking</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Resource type breakdown */}
        {group.resourceTypes && group.resourceTypes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-2 ml-6">
            {group.resourceTypes.map((resourceType) => {
              const count = group.items.filter(i => i.resourceType === resourceType).length;
              return (
                <span
                  key={resourceType}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200"
                >
                  {resourceType} ({count})
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded Item List - EACH ITEM SHOWS ITS OWN MESSAGE */}
      {isExpanded && (
        <div className="bg-white">
          {/* Advisory Notice for Non-blocking Sources */}
          {isAdvisorySource && (
            <div className="p-3 bg-blue-50 border-b border-blue-200 text-xs text-blue-700">
              <p className="font-medium">ℹ️ Advisory Information</p>
              <p className="mt-1 text-gray-700">
                These are recommendations to improve quality or portability. They do not block validation or rule editing.
              </p>
            </div>
          )}
          
          {group.items.map((item) => {
            const displayPath = item.location || 'Unknown';
            const formattedPath = formatSmartPath(displayPath, item.resourceType || '');
            const scopedSegments = getScopedSegments(formattedPath.segments, item.resourceType || '');
            const jsonPath = convertToJsonPath(item.jsonPointer);
            
            const rowBgColor = isAdvisorySource
              ? 'bg-blue-50/30 hover:bg-blue-50/50'
              : 'bg-gray-50/50 hover:bg-gray-50/80';

            return (
              <div
                key={item.id}
                className={`border-b ${borderColor} last:border-b-0 p-3 transition-colors ${
                  item.jsonPointer ? 'cursor-pointer' : ''
                } ${rowBgColor}`}
                onClick={(e) => {
                  if (item.jsonPointer) {
                    e.stopPropagation();
                    onIssueClick?.(item);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Left: Location breadcrumb */}
                  <div className="flex-1 min-w-0">
                    {item.resourceType && item.location && item.location !== 'unknown' ? (
                      <SmartPathBreadcrumb
                        resourceType={item.resourceType}
                        segments={scopedSegments}
                        fullPath={item.location}
                        onNavigate={
                          item.jsonPointer
                            ? () => onNavigateToPath?.(item.jsonPointer!)
                            : undefined
                        }
                        bundleJson={bundleJson}
                        jsonPointer={item.jsonPointer}
                      />
                    ) : (
                      <span className="text-xs text-gray-500 italic">Location not available</span>
                    )}

                    {/* CRITICAL: Show THIS item's message */}
                    <p className="text-sm text-gray-900 mt-1.5">
                      {item.message}
                    </p>

                    {/* Optional: Rule path for Project Rules */}
                    {item.rulePath && item.source === 'PROJECT' && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        Rule: {item.rulePath}
                      </p>
                    )}

                    {/* Optional: Explanations (if enabled) */}
                    {showExplanations && item.details?.explanation && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
                        {item.details.explanation}
                      </div>
                    )}
                  </div>

                  {/* Right: Path info tooltip */}
                  <div className="flex-shrink-0">
                    <PathInfoTooltip fhirPath={formattedPath.fullPath} jsonPath={jsonPath} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
