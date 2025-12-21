/**
 * Validation UI Counters - Authoritative & Safe
 * 
 * Ensures UI counters match exactly what the user sees, not raw backend totals.
 * 
 * Categories:
 * - Blocking: Issues that prevent validation success (FHIR structural + Business rules)
 * - Quality: Non-blocking best-practice checks (LINT)
 * - Guidance: Informational HL7 advisory hints (SPECHINT)
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
  /** Issues that prevent validation success (FHIR + Business + CodeMaster + Reference) */
  blocking: number;
  
  /** Non-blocking best-practice checks (LINT) */
  quality: number;
  
  /** Informational HL7 advisory hints (SPECHINT) */
  guidance: number;
  
  /** Total visible issues */
  total: number;
}

/**
 * Source filter state (matches ValidationSourceFilter component)
 */
export interface SourceFilterState {
  lint: boolean;
  reference: boolean;
  firely: boolean;
  business: boolean;
  codeMaster: boolean;
  specHint: boolean;
}

/**
 * Sources that block validation (cause validation to fail)
 */
const BLOCKING_SOURCES = ['FHIR', 'Business', 'CodeMaster', 'Reference'] as const;

/**
 * Sources that provide quality guidance (non-blocking)
 */
const QUALITY_SOURCES = ['LINT'] as const;

/**
 * Sources that provide informational guidance (advisory only)
 */
const GUIDANCE_SOURCES = ['SPECHINT'] as const;

/**
 * Determine if an error is from a blocking source
 */
export const isBlockingError = (error: ValidationError): boolean => {
  return BLOCKING_SOURCES.includes(error.source as any);
};

/**
 * Determine if an error is from a quality check source
 */
export const isQualityFinding = (error: ValidationError): boolean => {
  return QUALITY_SOURCES.includes(error.source as any);
};

/**
 * Determine if an error is from a guidance source
 */
export const isGuidanceFinding = (error: ValidationError): boolean => {
  return GUIDANCE_SOURCES.includes(error.source as any);
};

/**
 * Check if an error should be visible based on active filters
 */
const isErrorVisible = (error: ValidationError, filters: SourceFilterState): boolean => {
  const sourceMap: Record<string, keyof SourceFilterState> = {
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
  const blocking = visibleErrors.filter(isBlockingError).length;
  const quality = visibleErrors.filter(isQualityFinding).length;
  const guidance = visibleErrors.filter(isGuidanceFinding).length;
  
  return {
    blocking,
    quality,
    guidance,
    total: visibleErrors.length,
  };
};

/**
 * Get validation status text based on counters
 */
export const getValidationStatusText = (counters: ValidationUICounters): {
  label: string;
  message: string;
  variant: 'failed' | 'warning' | 'success';
} => {
  if (counters.blocking > 0) {
    return {
      label: 'Validation Failed',
      message: `${counters.blocking} blocking issue${counters.blocking !== 1 ? 's' : ''} must be fixed before the bundle is valid.`,
      variant: 'failed',
    };
  }
  
  if (counters.quality > 0 || counters.guidance > 0) {
    const advisoryCount = counters.quality + counters.guidance;
    return {
      label: 'Validation Passed with Warnings',
      message: `${advisoryCount} advisory check${advisoryCount !== 1 ? 's' : ''} detected. These do not block validation.`,
      variant: 'warning',
    };
  }
  
  return {
    label: 'Validation Passed',
    message: 'No blocking or advisory issues detected.',
    variant: 'success',
  };
};

/**
 * Filter errors to only blocking ones
 */
export const filterBlockingErrors = (errors: ValidationError[]): ValidationError[] => {
  return errors.filter(isBlockingError);
};

/**
 * Filter errors to only quality findings
 */
export const filterQualityFindings = (errors: ValidationError[]): ValidationError[] => {
  return errors.filter(isQualityFinding);
};

/**
 * Filter errors to only guidance findings
 */
export const filterGuidanceFindings = (errors: ValidationError[]): ValidationError[] => {
  return errors.filter(isGuidanceFinding);
};
