import React from 'react';
import { IssueCard } from './IssueCard';
import { CheckCircle2 } from 'lucide-react';
import { normalizeSource, getLayerSortPriority } from '../../../utils/validationLayers';
import { convertToIssue } from '../../../utils/validationGrouping';
import type { SourceFilterState } from './ValidationSourceFilter';
import type { ValidationIssue } from '../../../types/validationIssues';

interface ValidationError {
  source: string; // LINT, SPEC_HINT, FHIR, Business, CodeMaster, Reference
  severity: string; // error, warning, info
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

interface ValidationResultListProps {
  errors: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
  onNavigateToPath?: (jsonPointer: string) => void;
  sourceFilters?: SourceFilterState;
  showExplanations?: boolean;
  bundleJson?: string; // For path validation
}

export const ValidationResultList: React.FC<ValidationResultListProps> = ({ 
  errors, 
  onErrorClick,
  onNavigateToPath,
  sourceFilters,
  showExplanations = false,
  bundleJson
}) => {
  // Apply source filtering
  const filteredErrors = sourceFilters ? errors.filter(error => {
    const source = normalizeSource(error.source);
    const filterMap: Record<string, keyof SourceFilterState> = {
      'LINT': 'lint',
      'Reference': 'reference',
      'FHIR': 'firely',
      'PROJECT': 'business',
      'CodeMaster': 'codeMaster',
      'SPEC_HINT': 'specHint',
    };
    const filterKey = filterMap[source];
    return filterKey ? sourceFilters[filterKey] : true;
  }) : errors;

  if (filteredErrors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-3" />
        <p className="text-sm font-medium text-green-700">
          {errors.length === 0 ? 'Validation Passed' : 'No Matching Results'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {errors.length === 0 
            ? 'No issues found in your FHIR bundle' 
            : 'All findings filtered out by current source selection'}
        </p>
      </div>
    );
  }

  // Option A: Convert all errors to issues (no grouping)
  // All validation issues render as individual rows
  const allIssues = filteredErrors.map((error, index) => convertToIssue(error, index));
  
  // Sort by layer priority for consistent ordering
  const sortedIssues = allIssues.sort((a, b) => 
    getLayerSortPriority(a.source) - getLayerSortPriority(b.source)
  );

  // Split into three categories for visual section headers
  const projectRulesIssues = sortedIssues.filter(i => 
    i.source === 'Business' || i.details?.source === 'ProjectRule'
  );
  
  const specHintIssues = sortedIssues.filter(i => i.source === 'SPEC_HINT');
  
  const lintIssues = sortedIssues.filter(i => i.source === 'LINT');
  
  const otherIssues = sortedIssues.filter(i => 
    i.source !== 'Business' && 
    i.source !== 'SPEC_HINT' && 
    i.source !== 'LINT' &&
    i.details?.source !== 'ProjectRule'
  );

  // Handler to convert ValidationIssue click to ValidationError click
  const handleIssueClick = (issue: ValidationIssue) => {
    if (onErrorClick) {
      // Convert ValidationIssue to ValidationError (no message field used)
      const error: ValidationError = {
        source: issue.source,
        severity: issue.severity,
        resourceType: issue.resourceType,
        path: issue.location,
        jsonPointer: issue.jsonPointer ?? undefined,
        errorCode: issue.code,
        message: '', // Legacy field - not used for display
        details: issue.details,
      };
      onErrorClick(error);
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* PROJECT RULES Section */}
      {projectRulesIssues.length > 0 && (
        <>
          <div className="mt-6 mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Project Rules
          </div>
          
          <div className="space-y-3">
            {projectRulesIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onClick={handleIssueClick}
                onNavigateToPath={onNavigateToPath}
                showExplanations={showExplanations}
                bundleJson={bundleJson}
              />
            ))}
          </div>
        </>
      )}

      {/* FHIR STANDARD HINTS Section */}
      {specHintIssues.length > 0 && (
        <>
          <div className="mt-6 mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            FHIR Standard Hints
          </div>
          
          <div className="space-y-3">
            {specHintIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onClick={handleIssueClick}
                onNavigateToPath={onNavigateToPath}
                showExplanations={showExplanations}
                bundleJson={bundleJson}
              />
            ))}
          </div>
        </>
      )}

      {/* QUALITY CHECKS Section */}
      {lintIssues.length > 0 && (
        <>
          <div className="mt-6 mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Quality Checks
          </div>
          
          <div className="space-y-3">
            {lintIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onClick={handleIssueClick}
                onNavigateToPath={onNavigateToPath}
                showExplanations={showExplanations}
                bundleJson={bundleJson}
              />
            ))}
          </div>
        </>
      )}

      {/* Other sources (FHIR, CodeMaster, Reference) - no section header */}
      {otherIssues.length > 0 && (
        <div className="space-y-3">
          {otherIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={handleIssueClick}
              onNavigateToPath={onNavigateToPath}
              showExplanations={showExplanations}
              bundleJson={bundleJson}
            />
          ))}
        </div>
      )}
    </div>
  );
};
