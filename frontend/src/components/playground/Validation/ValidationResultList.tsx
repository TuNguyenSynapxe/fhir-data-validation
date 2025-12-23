import React from 'react';
import { IssueGroupCard } from './IssueGroupCard';
import { IssueCard } from './IssueCard';
import { CheckCircle2 } from 'lucide-react';
import { normalizeSource, getLayerSortPriority } from '../../../utils/validationLayers';
import { groupValidationIssues } from '../../../utils/validationGrouping';
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

  // Use new grouping logic
  const { grouped, ungrouped } = groupValidationIssues(filteredErrors);
  
  // Sort grouped by layer priority
  const sortedGrouped = grouped.sort((a, b) => 
    getLayerSortPriority(a.source) - getLayerSortPriority(b.source)
  );
  
  // Sort ungrouped by layer priority
  const sortedUngrouped = ungrouped.sort((a, b) => 
    getLayerSortPriority(a.source) - getLayerSortPriority(b.source)
  );

  // Handler to convert ValidationIssue click to ValidationError click
  const handleIssueClick = (issue: ValidationIssue) => {
    if (onErrorClick) {
      // Convert back to ValidationError format for backward compatibility
      const error: ValidationError = {
        source: issue.source,
        severity: issue.severity,
        resourceType: issue.resourceType,
        path: issue.location,
        jsonPointer: issue.jsonPointer ?? undefined,
        errorCode: issue.code,
        message: issue.message,
        details: issue.details,
      };
      onErrorClick(error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Grouped issues (2+ occurrences) - EACH ITEM HAS ITS OWN MESSAGE */}
      {sortedGrouped.map((group) => (
        <IssueGroupCard
          key={group.groupId}
          group={group}
          onIssueClick={handleIssueClick}
          onNavigateToPath={onNavigateToPath}
          showExplanations={showExplanations}
          bundleJson={bundleJson}
        />
      ))}
      
      {/* Ungrouped issues (single occurrences) */}
      {sortedUngrouped.map((issue) => (
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
  );
};
