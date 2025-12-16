import React from 'react';
import { ErrorCard } from './ErrorCard';
import { GroupedErrorCard } from './GroupedErrorCard';
import { CheckCircle2 } from 'lucide-react';
import { normalizeSource, getLayerSortPriority } from '../../../utils/validationLayers';
import type { SourceFilterState } from './ValidationSourceFilter';

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
}

/**
 * Group errors by source + errorCode (PRIMARY GROUPING)
 * 
 * This follows the requirement:
 * - Group by source AND errorCode
 * - NOT by resourceType at top level
 * - Threshold: 2 errors minimum
 */
const groupErrors = (errors: ValidationError[]): {
  grouped: Map<string, ValidationError[]>;
  ungrouped: ValidationError[];
} => {
  const groups = new Map<string, ValidationError[]>();
  
  // First pass: group by source + errorCode
  errors.forEach(error => {
    const source = normalizeSource(error.source);
    const errorCode = error.errorCode || 'UNKNOWN';
    const key = `${source}|${errorCode}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(error);
  });
  
  // Second pass: separate grouped (>=2) from ungrouped (<2)
  const groupedMap = new Map<string, ValidationError[]>();
  const ungroupedList: ValidationError[] = [];
  
  groups.forEach((groupErrors, key) => {
    if (groupErrors.length >= 2) {
      groupedMap.set(key, groupErrors);
    } else {
      ungroupedList.push(...groupErrors);
    }
  });
  
  return {
    grouped: groupedMap,
    ungrouped: ungroupedList,
  };
};

export const ValidationResultList: React.FC<ValidationResultListProps> = ({ 
  errors, 
  onErrorClick,
  onNavigateToPath,
  sourceFilters,
  showExplanations = false
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

  // Group errors by source + errorCode
  const { grouped, ungrouped } = groupErrors(filteredErrors);
  
  // Sort grouped entries by layer priority
  const sortedGroupedKeys = Array.from(grouped.keys()).sort((a, b) => {
    const [sourceA] = a.split('|');
    const [sourceB] = b.split('|');
    return getLayerSortPriority(sourceA) - getLayerSortPriority(sourceB);
  });
  
  // Sort ungrouped by layer priority
  const sortedUngrouped = ungrouped.sort((a, b) => 
    getLayerSortPriority(a.source) - getLayerSortPriority(b.source)
  );

  return (
    <div className="divide-y divide-gray-100">
      {/* Grouped errors (source + errorCode, 2+ occurrences) */}
      {sortedGroupedKeys.map((key) => {
        const groupErrors = grouped.get(key)!;
        const [source, errorCode] = key.split('|');
        return (
          <GroupedErrorCard
            key={`grouped-${key}`}
            errors={groupErrors}
            errorCode={errorCode}
            source={source}
            allErrors={errors} // Pass all errors for override detection
            onClick={onErrorClick}
            onNavigateToPath={onNavigateToPath}
            showExplanations={showExplanations}
          />
        );
      })}
      
      {/* Ungrouped errors (single occurrences) */}
      {sortedUngrouped.map((error, index) => (
        <ErrorCard
          key={`ungrouped-${index}-${error.source}-${error.errorCode || 'unknown'}`}
          error={error}
          allErrors={errors} // Pass all errors for override detection
          onClick={() => onErrorClick?.(error)}
        />
      ))}
    </div>
  );
};
