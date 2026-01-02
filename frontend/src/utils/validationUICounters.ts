/**
 * Validation UI Counters - Authoritative & Safe
 * 
 * Ensures UI counters match exactly what the user sees, not raw backend totals.
 * 
 * Categories:
 * - Must-Fix: Issues that must be resolved for HL7 compliance (STRUCTURE, FHIR, PROJECT, CodeMaster, Reference)
 * - Recommendations: Best-practice improvements (LINT, SPEC_HINT)
 * 
 * Contract:
 * - Header counters MUST equal visible list items
 * - Overview and Validation tab use same derived logic
 * - Filters and visibility affect counts
 */

import type { ValidationError } from '../contexts/project-validation/useProjectValidation';

/**
 * Derived validation counter model for UI display
 */
export interface ValidationUICounters {
  /** Issues that must be fixed for HL7 compliance (STRUCTURE + FHIR + PROJECT + CodeMaster + Reference) */
  mustFix: number;
  
  /** Best-practice recommendations (LINT + SPEC_HINT) */
  recommendations: number;
  
  /** Total visible issues */
  total: number;
}

/**
 * Source filter state (matches ValidationSourceFilter component)
 */
export interface SourceFilterState {
  structure: boolean;
  lint: boolean;
  reference: boolean;
  firely: boolean;
  business: boolean;
  codeMaster: boolean;
  specHint: boolean;
}

/**
 * Sources that require fixing for HL7 compliance (correctness + policy)
 */
const MUST_FIX_SOURCES = ['STRUCTURE', 'FHIR', 'Business', 'PROJECT', 'CodeMaster', 'Reference'] as const;

/**
 * Sources that provide recommendations (quality + advisory)
 */
const RECOMMENDATION_SOURCES = ['LINT', 'SPECHINT'] as const;

/**
 * Determine if an error must be fixed for HL7 compliance
 */
export const isMustFixError = (error: ValidationError): boolean => {
  const source = error.source.toUpperCase();
  return MUST_FIX_SOURCES.some(s => s.toUpperCase() === source);
};

/**
 * Determine if an error is a recommendation
 */
export const isRecommendation = (error: ValidationError): boolean => {
  const source = error.source.toUpperCase();
  return RECOMMENDATION_SOURCES.some(s => s.toUpperCase() === source);
};

// Legacy aliases for backward compatibility
export const isBlockingError = isMustFixError;
export const isQualityFinding = isRecommendation;
export const isGuidanceFinding = isRecommendation;

/**
 * Check if an error should be visible based on active filters
 */
const isErrorVisible = (error: ValidationError, filters: SourceFilterState): boolean => {
  const sourceMap: Record<string, keyof SourceFilterState> = {
    'STRUCTURE': 'structure',
    'LINT': 'lint',
    'Reference': 'reference',
    'FHIR': 'firely',
    'Business': 'business',
    'CodeMaster': 'codeMaster',
    'SPECHINT': 'specHint',
  };
  
  const filterKey = sourceMap[error.source];
  return filterKey ? filters[filterKey] : true;
};

/**
 * Build validation UI counters from errors and filters
 * 
 * These counters represent ONLY what the user can currently see in the UI.
 * Hidden, filtered, or collapsed issues are NOT counted.
 * 
 * @param errors - All validation errors from backend
 * @param filters - Active source filters (determines visibility)
 * @returns UI counters matching visible items
 */
export const buildValidationUICounters = (
  errors: ValidationError[],
  filters: SourceFilterState
): ValidationUICounters => {
  // Filter to only visible errors
  const visibleErrors = errors.filter(error => isErrorVisible(error, filters));
  
  // Categorize visible errors
  const mustFix = visibleErrors.filter(isMustFixError).length;
  const recommendations = visibleErrors.filter(isRecommendation).length;
  
  return {
    mustFix,
    recommendations,
    total: visibleErrors.length,
  };
};

/**
 * Get validation status text based on counters
 */
export const getValidationStatusText = (counters: ValidationUICounters): {
  label: string;
  message: string;
  subtitle?: string;
  variant: 'failed' | 'warning' | 'success';
} => {
  if (counters.mustFix > 0) {
    return {
      label: '❌ Not HL7-Compliant',
      subtitle: 'Correctness or policy issues must be resolved',
      message: `${counters.mustFix} must-fix issue${counters.mustFix !== 1 ? 's' : ''} detected. These must be resolved to produce valid HL7 FHIR.`,
      variant: 'failed',
    };
  }
  
  if (counters.recommendations > 0) {
    return {
      label: '⚠️ HL7-Compliant with Recommendations',
      subtitle: 'Advisory recommendations detected',
      message: `${counters.recommendations} recommendation${counters.recommendations !== 1 ? 's' : ''} detected. The resource is valid FHIR, but addressing these may improve interoperability.`,
      variant: 'warning',
    };
  }
  
  return {
    label: '✅ HL7-Compliant',
    subtitle: 'No issues detected',
    message: 'No issues detected.',
    variant: 'success',
  };
};

/**
 * Filter errors to only must-fix ones
 */
export const filterMustFixErrors = (errors: ValidationError[]): ValidationError[] => {
  return errors.filter(isMustFixError);
};

/**
 * Filter errors to only recommendations
 */
export const filterRecommendations = (errors: ValidationError[]): ValidationError[] => {
  return errors.filter(isRecommendation);
};

// Legacy aliases
export const filterBlockingErrors = filterMustFixErrors;
export const filterQualityFindings = filterRecommendations;
export const filterGuidanceFindings = filterRecommendations;
