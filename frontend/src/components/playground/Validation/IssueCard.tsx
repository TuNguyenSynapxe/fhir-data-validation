import React, { useState } from 'react';
import { XCircle, CheckCircle, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import { ValidationIcon } from '../../../ui/icons/ValidationIcons';
import { getLayerMetadata } from '../../../utils/validationLayers';
import { SmartPathBreadcrumb } from './SmartPathBreadcrumb';
import { ScopeSelectorChip } from './ScopeSelectorChip';
import { PathInfoTooltip } from './PathInfoTooltip';
import { formatSmartPath, getScopedSegments, convertToJsonPath, jsonPointerToFhirPathStyle } from '../../../utils/smartPathFormatting';
import { isIssueBlocking } from '../../../types/validationIssues';
import type { ValidationIssue } from '../../../types/validationIssues';
import { ExplanationPanel } from './ExplanationPanel';
import { explainError } from '../../../validation';
import { BundleDiffDisplay } from './BundleDiffDisplay';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const metadata = getLayerMetadata(issue.source);
  const blocking = isIssueBlocking(issue);

  // Generate display path - prefer location (FHIRPath), fallback to jsonPointer converted to FHIRPath style
  const displayPath = issue.location || (issue.jsonPointer ? jsonPointerToFhirPathStyle(issue.jsonPointer) : 'Unknown');
  const formattedPath = formatSmartPath(displayPath, issue.resourceType || '');
  const scopedSegments = getScopedSegments(formattedPath.segments, issue.resourceType || '');
  const jsonPath = convertToJsonPath(issue.jsonPointer ?? undefined);

  // Determine if this is a non-blocking advisory source
  const isAdvisorySource = issue.source === 'LINT' || issue.source === 'HL7Advisory' || issue.source === 'Lint' || issue.source === 'HL7_SPEC_HINT';
  
  // Determine if this is a STRUCTURE (pre-parse) validation issue
  const isStructureSource = issue.source === 'STRUCTURE';
  
  // Phase 8: Check path/location for navigation (not just jsonPointer)
  const canNavigate = !!(issue.location || issue.jsonPointer);
  
  const cardBgColor = isAdvisorySource ? 'bg-blue-50/30' : 'bg-gray-50/50';
  const borderColor = isAdvisorySource ? 'border-blue-200/50' : 'border-gray-200';

  return (
    <div
      className={`border ${borderColor} rounded-lg p-4 transition-colors ${cardBgColor}`}
    >
      {/* STRUCTURE (Pre-Parse) Notice */}
      {isStructureSource && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          <p className="font-medium">🔍 FHIR Structure (Pre-Parse)</p>
          <p className="mt-0.5 text-gray-700">
            This check validates the raw JSON structure before the FHIR model is parsed. It must be resolved to produce valid HL7 FHIR.
          </p>
        </div>
      )}
      
      {/* Advisory Notice */}
      {isAdvisorySource && (
        <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <p className="font-medium">ℹ️ Recommended</p>
          <p className="mt-0.5 text-gray-700">
            This is a best-practice recommendation. The resource is valid FHIR, but addressing this may improve interoperability.
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
          {/* Location breadcrumb + scope selectors */}
          {(issue.resourceType && issue.location && issue.location !== 'unknown') || issue.jsonPointer ? (
            <div className="space-y-1.5">
              {/* Structure-only breadcrumb - clickable */}
              <div
                onClick={(e) => {
                  if (canNavigate) {
                    e.stopPropagation();
                    onClick?.(issue);
                  }
                }}
                className={canNavigate ? 'cursor-pointer' : ''}
              >
                <SmartPathBreadcrumb
                  resourceType={issue.resourceType}
                  segments={scopedSegments}
                  fullPath={issue.location || ''}
                  onNavigate={
                    issue.jsonPointer ? () => onNavigateToPath?.(issue.jsonPointer!) : undefined
                  }
                  bundleJson={bundleJson}
                  jsonPointer={issue.jsonPointer ?? undefined}
                />
              </div>
              {/* Scope selectors (where clauses) - Phase 6 */}
              {issue.location && <ScopeSelectorChip fhirPath={issue.location} />}
            </div>
          ) : (
            <span className="text-xs text-gray-500 italic">Location not available</span>
          )}

          {/* Phase 7: Use canonical explanation - collapsed and expandable */}
          <div className="mt-2">
            {(() => {
              const explanation = explainError({ 
                errorCode: issue.code || '', 
                details: issue.details 
              });
              
              // Check if this is a bundle composition error
              const isBundleComposition = issue.code === 'RESOURCE_REQUIREMENT_VIOLATION' && 
                issue.details?.expected && 
                issue.details?.actual &&
                issue.details?.diff;
              
              return (
                <div className="space-y-2">
                  {/* Collapsed state: Title + Summary only */}
                  <p className="text-sm font-medium text-gray-900">{explanation.title}</p>
                  <p className="text-sm text-gray-700">{explanation.reason}</p>
                  
                  {/* Author-provided hint (only for Project rules) */}
                  {issue.hint && (issue.source === 'PROJECT' || issue.source === 'Business') && (
                    <div className="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Hint</p>
                          <p className="text-sm text-gray-700">{issue.hint}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Expandable "Why am I seeing this?" button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors mt-2"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <HelpCircle className="w-4 h-4" />
                    <span>Why am I seeing this?</span>
                  </button>
                  
                  {/* Expanded state: All detailed information */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
                      {/* Section 1: What this rule checks */}
                      {explanation.whatThisMeans && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">What this rule checks</p>
                          <p className="text-sm text-gray-700">{explanation.whatThisMeans}</p>
                        </div>
                      )}
                      
                      {/* Bundle Composition: Structured display */}
                      {isBundleComposition && issue.details && (
                        <>
                          {/* Section 2: Expected resources */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Expected resources</p>
                            <BundleDiffDisplay
                              expected={issue.details.expected}
                              actual={issue.details.actual}
                              diff={issue.details.diff}
                            />
                          </div>
                        </>
                      )}
                      
                      {/* Non-bundle composition: Standard fields */}
                      {!isBundleComposition && (
                        <>
                          {explanation.whatWasFound && typeof explanation.whatWasFound === 'string' && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">What was found</p>
                              <p className="text-sm text-gray-700">{explanation.whatWasFound}</p>
                            </div>
                          )}
                          
                          {explanation.expected && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Expected</p>
                              {Array.isArray(explanation.expected) ? (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {explanation.expected.map((val, idx) => (
                                    <li key={idx} className="text-sm text-gray-700">
                                      {typeof val === 'string' ? val : JSON.stringify(val)}
                                    </li>
                                  ))}
                                </ul>
                              ) : typeof explanation.expected === 'string' ? (
                                <p className="text-sm text-gray-700">{explanation.expected}</p>
                              ) : null}
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Section: How to fix */}
                      {explanation.howToFix && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">How to fix</p>
                          <p className="text-sm text-gray-700">{explanation.howToFix}</p>
                        </div>
                      )}
                      
                      {/* Section: Note */}
                      {explanation.note && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Note</p>
                          <p className="text-sm text-gray-600 italic">{explanation.note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Optional: Rule path for Project Rules */}
          {issue.rulePath && issue.source === 'PROJECT' && (
            <p className="text-xs text-gray-500 mt-1.5 font-mono">
              Rule: {issue.rulePath}
            </p>
          )}

          {/* Structured explanation - HIDDEN */}
          {/* {issue.explanation && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExplanationExpanded(!isExplanationExpanded);
                }}
                className="flex items-center justify-between gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors w-full"
              >
                <div className="flex items-center gap-2">
                  {isExplanationExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <InformationCircleIcon className="w-4 h-4 text-blue-600" />
                  <span>What is this?</span>
                </div>
                {getConfidenceBadge(issue.explanation.confidence)}
              </button>

              {isExplanationExpanded && (
                <div className="mt-2 space-y-3 pl-6">
                  <div className="text-sm text-gray-700 leading-relaxed bg-blue-50/50 p-3 rounded-md border border-blue-100">
                    {issue.explanation.what}
                  </div>

                  {issue.explanation.how && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <WrenchScrewdriverIcon className="w-4 h-4 text-green-600" />
                        <span>How to fix</span>
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed bg-green-50/50 p-3 rounded-md border border-green-100 whitespace-pre-line">
                        {issue.explanation.how}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )} */}

          {/* Optional: Explanations (legacy - if enabled) */}
          {showExplanations && !issue.explanation && issue.details?.explanation && (
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

          {/* Must fix / Recommended indicator */}
          <div
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${
              blocking
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {blocking ? (
              <>
                <XCircle className="w-3 h-3" />
                <span className="font-semibold">Must fix</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3" />
                <span className="font-semibold">Recommended</span>
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
