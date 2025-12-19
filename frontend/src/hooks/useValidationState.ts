import { useMemo } from 'react';
import { ValidationState, type ValidationStateMetadata } from '../types/validationState';

/**
 * Validation result structure (matches backend response)
 */
interface ValidationError {
  source: string;
  severity: string;
  message: string;
  jsonPointer?: string;
  path?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  timestamp: string;
  executionTimeMs: number;
  summary?: {
    total: number;
    errors: number;
    warnings: number;
    information: number;
    bySource: {
      firely: number;
      businessRules: number;
      codeMaster: number;
      reference: number;
      lint: number;
      specHint: number;
    };
  };
}

/**
 * Derive ValidationState from current conditions
 * 
 * State Logic:
 * 1. NoBundle: bundleJson is empty or contains only whitespace/empty object
 * 2. NotValidated: bundle exists but no validation has run, or bundle/rules changed
 * 3. Validated: validation ran and passed (no blocking errors)
 * 4. Failed: validation ran and found blocking errors
 * 
 * @param bundleJson - Current bundle JSON content
 * @param validationResult - Most recent validation result (if any)
 * @param bundleChanged - Whether bundle has changed since last validation
 * @param rulesChanged - Whether rules have changed since last validation
 * @returns ValidationStateMetadata with derived state
 */
export function deriveValidationState(
  bundleJson: string,
  validationResult: ValidationResult | null,
  bundleChanged: boolean,
  rulesChanged: boolean
): ValidationStateMetadata {
  // Step 1: Check if bundle exists
  const hasBundle = hasValidBundle(bundleJson);
  
  if (!hasBundle) {
    return {
      state: ValidationState.NoBundle,
      bundleChanged: false,
      rulesChanged: false,
    };
  }
  
  // Step 2: Check if validation has run
  if (!validationResult) {
    return {
      state: ValidationState.NotValidated,
      bundleChanged,
      rulesChanged,
    };
  }
  
  // Step 3: Check if bundle or rules changed since validation
  if (bundleChanged || rulesChanged) {
    return {
      state: ValidationState.NotValidated,
      lastValidatedAt: validationResult.timestamp,
      errorCount: countBlockingErrors(validationResult),
      warningCount: countWarnings(validationResult),
      bundleChanged,
      rulesChanged,
      breakdown: buildBreakdown(validationResult),
    };
  }
  
  // Step 4: Determine if validation passed or failed
  const blockingErrors = countBlockingErrors(validationResult);
  const hasBlockingErrors = blockingErrors > 0;
  
  return {
    state: hasBlockingErrors ? ValidationState.Failed : ValidationState.Validated,
    lastValidatedAt: validationResult.timestamp,
    errorCount: blockingErrors,
    warningCount: countWarnings(validationResult),
    bundleChanged: false,
    rulesChanged: false,
    breakdown: buildBreakdown(validationResult),
  };
}

/**
 * Check if bundle JSON contains actual content
 * Returns false for empty string, whitespace, "{}", or "[]"
 */
function hasValidBundle(bundleJson: string): boolean {
  if (!bundleJson || bundleJson.trim() === '') {
    return false;
  }
  
  try {
    const parsed = JSON.parse(bundleJson);
    
    // Empty object or array
    if (!parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
      return false;
    }
    
    // Check for FHIR Bundle structure
    if (parsed.resourceType !== 'Bundle') {
      return false;
    }
    
    return true;
  } catch {
    // Invalid JSON is still considered "has bundle" (will fail validation)
    return bundleJson.trim().length > 0;
  }
}

/**
 * Count blocking errors (severity: error)
 * Excludes warnings, info, and advisory sources like SPEC_HINT
 */
function countBlockingErrors(result: ValidationResult): number {
  if (!result || !result.errors) return 0;
  
  return result.errors.filter(error => {
    // Only count errors (not warnings or info)
    if (error.severity?.toLowerCase() !== 'error') {
      return false;
    }
    
    // Exclude advisory sources (SPEC_HINT is non-blocking)
    if (error.source?.toUpperCase() === 'SPEC_HINT') {
      return false;
    }
    
    return true;
  }).length;
}

/**
 * Count all warnings (severity: warning)
 */
function countWarnings(result: ValidationResult): number {
  if (!result || !result.errors) return 0;
  
  return result.errors.filter(error => 
    error.severity?.toLowerCase() === 'warning'
  ).length;
}

/**
 * Build breakdown of errors/warnings by source
 */
function buildBreakdown(result: ValidationResult): ValidationStateMetadata['breakdown'] {
  if (!result || !result.errors) {
    return {
      firely: { errors: 0, warnings: 0 },
      lint: { errors: 0, warnings: 0 },
      business: { errors: 0, warnings: 0 },
      codeMaster: { errors: 0, warnings: 0 },
      reference: { errors: 0, warnings: 0 },
      specHint: { errors: 0, warnings: 0 },
    };
  }
  
  const breakdown = {
    firely: { errors: 0, warnings: 0 },
    lint: { errors: 0, warnings: 0 },
    business: { errors: 0, warnings: 0 },
    codeMaster: { errors: 0, warnings: 0 },
    reference: { errors: 0, warnings: 0 },
    specHint: { errors: 0, warnings: 0 },
  };
  
  result.errors.forEach(error => {
    const source = normalizeSource(error.source);
    const isError = error.severity?.toLowerCase() === 'error';
    const isWarning = error.severity?.toLowerCase() === 'warning';
    
    const sourceKey = getSourceKey(source);
    if (sourceKey && breakdown[sourceKey]) {
      const sourceBreakdown = breakdown[sourceKey];
      if (isError) {
        sourceBreakdown.errors++;
      } else if (isWarning) {
        sourceBreakdown.warnings++;
      }
    }
  });
  
  return breakdown;
}

/**
 * Normalize source names to standard values
 */
function normalizeSource(source: string): string {
  const upper = source?.toUpperCase() || '';
  
  if (upper === 'FHIR' || upper === 'FIRELY') return 'FHIR';
  if (upper === 'LINT') return 'LINT';
  if (upper === 'BUSINESS' || upper === 'BUSINESSRULES' || upper === 'PROJECT') return 'Business';
  if (upper === 'CODEMASTER') return 'CodeMaster';
  if (upper === 'REFERENCE') return 'Reference';
  if (upper === 'SPEC_HINT' || upper === 'SPECHINT') return 'SPEC_HINT';
  
  return source;
}

/**
 * Map source to breakdown key
 */
function getSourceKey(source: string): keyof NonNullable<ValidationStateMetadata['breakdown']> | null {
  const upper = source.toUpperCase();
  
  if (upper === 'FHIR' || upper === 'FIRELY') return 'firely';
  if (upper === 'LINT') return 'lint';
  if (upper === 'BUSINESS' || upper === 'BUSINESSRULES' || upper === 'PROJECT') return 'business';
  if (upper === 'CODEMASTER') return 'codeMaster';
  if (upper === 'REFERENCE') return 'reference';
  if (upper === 'SPEC_HINT' || upper === 'SPECHINT') return 'specHint';
  
  return null;
}

/**
 * Hook to access validation state
 * 
 * This hook computes the current ValidationState based on:
 * - Bundle existence and content
 * - Whether validation has been run
 * - Whether bundle or rules have changed
 * - Validation results (lint/Firely pass/fail)
 * 
 * Usage:
 * ```tsx
 * const { state, metadata } = useValidationState(
 *   bundleJson,
 *   validationResult,
 *   bundleChanged,
 *   rulesChanged
 * );
 * 
 * // Use state for conditional rendering
 * if (state === ValidationState.NoBundle) {
 *   return <EmptyState />;
 * }
 * ```
 */
export function useValidationState(
  bundleJson: string,
  validationResult: ValidationResult | null,
  bundleChanged: boolean,
  rulesChanged: boolean
): { state: ValidationState; metadata: ValidationStateMetadata } {
  const metadata = useMemo(() => {
    return deriveValidationState(bundleJson, validationResult, bundleChanged, rulesChanged);
  }, [bundleJson, validationResult, bundleChanged, rulesChanged]);
  
  return {
    state: metadata.state,
    metadata,
  };
}
