import React from 'react';
import { Filter } from 'lucide-react';

/**
 * ScopeSelectorChip Component
 * 
 * Extracts and displays where() clauses from FHIRPath as separate filter chips.
 * 
 * Phase 5 Specification:
 * - where() clauses are scope selectors, NOT structural breadcrumbs
 * - They must be rendered separately from the path navigation
 * - Multiple where() clauses are supported
 * 
 * Examples:
 * - "Observation.component.where(code='SQ-001').valueString"
 *   → Renders: "code='SQ-001'"
 * 
 * - "Patient.contact.where(relationship.exists()).name.where(use='official').family"
 *   → Renders: "relationship.exists()" AND "use='official'"
 */

export interface ScopeSelectorChipProps {
  fhirPath: string | undefined;
  className?: string;
}

/**
 * Extract all where() clauses from a FHIRPath expression
 * Returns array of where clause contents (without the "where(" prefix and ")" suffix)
 */
export const extractWhereClausesScopeSelectors = (fhirPath: string | undefined): string[] => {
  if (!fhirPath) return [];
  
  const scopeSelectors: string[] = [];
  const whereRegex = /\.where\(([^)]+)\)/g;
  
  let match;
  while ((match = whereRegex.exec(fhirPath)) !== null) {
    scopeSelectors.push(match[1]); // Extract content inside where()
  }
  
  return scopeSelectors;
};

/**
 * Remove all where() clauses from FHIRPath, leaving only structural path
 * Used by breadcrumb components to show ONLY structural navigation
 */
export const removeWhereClauses = (fhirPath: string | undefined): string => {
  if (!fhirPath) return '';
  return fhirPath.replace(/\.where\([^)]+\)/g, '');
};

/**
 * ScopeSelectorChip Component
 * Renders where() clauses as filter chips
 */
export const ScopeSelectorChip: React.FC<ScopeSelectorChipProps> = ({
  fhirPath,
  className = '',
}) => {
  const scopeSelectors = extractWhereClausesScopeSelectors(fhirPath);
  
  if (scopeSelectors.length === 0) {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {scopeSelectors.map((selector, index) => (
        <div
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-mono"
          title={`Scope filter: where(${selector})`}
        >
          <Filter className="w-3 h-3 flex-shrink-0" />
          <span className="truncate max-w-[200px]">{selector}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Utility: Check if FHIRPath contains where() clauses
 */
export const hasWhereClause = (fhirPath: string | undefined): boolean => {
  if (!fhirPath) return false;
  return /\.where\([^)]+\)/.test(fhirPath);
};

export default ScopeSelectorChip;
