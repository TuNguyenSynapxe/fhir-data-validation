/**
 * Validation Severity Override Logic
 * 
 * Handles detection of blocking validation errors and determines
 * when non-blocking errors should indicate they are overridden.
 */

import { getLayerMetadata } from './validationLayers';

interface ValidationError {
  source: string;
  severity: string;
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

/**
 * Extract normalized path from a validation error for matching purposes
 * @param error - Validation error
 * @returns Normalized path string (e.g., "Patient.birthDate")
 */
const extractNormalizedPath = (error: ValidationError): string | null => {
  if (!error.resourceType) return null;
  
  // Try to get path from various sources
  let path = error.path || error.details?.fhirPath;
  
  if (!path) return null;
  
  // Remove array indices for matching (e.g., "extension[2]" -> "extension")
  // This makes matching more conservative - we consider errors on any instance of an array element as related
  path = path.replace(/\[\d+\]/g, '');
  
  // Remove resource type prefix if present (e.g., "Patient.birthDate" -> "birthDate")
  if (path.startsWith(`${error.resourceType}.`)) {
    path = path.substring(error.resourceType.length + 1);
  }
  
  // Return combination of resource type and path for matching
  return `${error.resourceType}.${path}`;
};

/**
 * Check if a validation error is blocking
 * @param error - Validation error
 * @returns True if the error blocks validation
 */
export const isBlockingError = (error: ValidationError): boolean => {
  // CRITICAL: Check actual severity first
  // Backend may downgrade errors to warnings based on validation settings
  // (e.g., AllowExternal policy downgrades reference errors to warnings)
  if (error.severity === 'warning') {
    return false;
  }
  
  // For errors, use source metadata to determine blocking status
  const metadata = getLayerMetadata(error.source);
  return metadata.isBlocking;
};

/**
 * Detect if there are blocking errors for the same field/path
 * @param allErrors - All validation errors from all sources
 * @param currentError - The error to check
 * @returns True if a blocking error exists for the same field
 */
export const hasBlockingErrorForSameField = (
  allErrors: ValidationError[],
  currentError: ValidationError
): boolean => {
  // If current error is already blocking, no override needed
  if (isBlockingError(currentError)) {
    return false;
  }
  
  // Get normalized path for current error
  const currentPath = extractNormalizedPath(currentError);
  if (!currentPath) {
    // Can't match without a path
    return false;
  }
  
  // Check if any blocking error exists for the same resource + path
  return allErrors.some(error => {
    // Skip if not blocking
    if (!isBlockingError(error)) {
      return false;
    }
    
    // Skip self
    if (error === currentError) {
      return false;
    }
    
    // Check if paths match
    const errorPath = extractNormalizedPath(error);
    if (!errorPath) {
      return false;
    }
    
    return currentPath === errorPath;
  });
};

/**
 * Get the appropriate blocking status text based on override context
 * @param error - The validation error
 * @param allErrors - All validation errors for context
 * @returns Object with display text and whether it's overridden
 */
export const getBlockingStatusDisplay = (
  error: ValidationError,
  allErrors: ValidationError[]
): { text: string; isOverridden: boolean } => {
  // CRITICAL: Use isBlockingError() which checks actual severity first
  // This respects backend validation settings (e.g., AllowExternal policy)
  const blocking = isBlockingError(error);
  
  if (blocking) {
    return {
      text: 'Blocking: YES',
      isOverridden: false
    };
  }
  
  // Check if overridden by a blocking error
  const isOverridden = hasBlockingErrorForSameField(allErrors, error);
  
  if (isOverridden) {
    return {
      text: 'Overridden by blocking error',
      isOverridden: true
    };
  }
  
  return {
    text: 'Does NOT block validation',
    isOverridden: false
  };
};
