/**
 * Phase 7.1: Missing Node Assist - Detection Utilities
 * 
 * Provides functions to detect when a parent node exists but a required child is missing.
 * This enables visual assistance in the JSON tree without creating fake navigation.
 */

/**
 * Parse a JSON Pointer to extract the last segment (child key)
 * Example: "/entry/0/resource/performer/0/display" -> "display"
 */
export const getLastSegmentFromJsonPointer = (jsonPointer: string): string | null => {
  if (!jsonPointer || jsonPointer === '/') return null;
  
  const segments = jsonPointer.split('/').filter(s => s);
  return segments.length > 0 ? segments[segments.length - 1] : null;
};

/**
 * Get parent JSON Pointer by removing the last segment
 * Example: "/entry/0/resource/performer/0/display" -> "/entry/0/resource/performer/0"
 */
export const getParentJsonPointer = (jsonPointer: string): string | null => {
  if (!jsonPointer || jsonPointer === '/') return null;
  
  const lastSlashIndex = jsonPointer.lastIndexOf('/');
  if (lastSlashIndex <= 0) return '/';
  
  return jsonPointer.substring(0, lastSlashIndex);
};

/**
 * Check if a JSON Pointer path exists in the bundle
 */
export const pathExistsInBundle = (bundleJson: string, jsonPointer: string): boolean => {
  if (!bundleJson || !jsonPointer) return false;
  
  try {
    const bundle = JSON.parse(bundleJson);
    const segments = jsonPointer.split('/').filter(s => s);
    
    let current: any = bundle;
    for (const segment of segments) {
      // Decode JSON Pointer escape sequences
      const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
      
      // Try numeric index for arrays
      const numKey = parseInt(key, 10);
      if (!isNaN(numKey) && Array.isArray(current)) {
        if (numKey < 0 || numKey >= current.length) return false;
        current = current[numKey];
      } else {
        if (typeof current !== 'object' || current === null || !(key in current)) {
          return false;
        }
        current = current[key];
      }
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Detect if we have a "missing child" scenario:
 * - Parent jsonPointer exists in bundle
 * - Full path (parent + child) does NOT exist
 * 
 * Returns null if not a missing child scenario,
 * otherwise returns { parentPath, childKey }
 */
export interface MissingChildInfo {
  parentJsonPointer: string;
  childKey: string;
  fullPath: string;
}

export const detectMissingChild = (
  bundleJson: string,
  errorJsonPointer: string | null | undefined
): MissingChildInfo | null => {
  // Must have a jsonPointer to analyze
  if (!errorJsonPointer || !bundleJson) return null;
  
  // Check if the full path exists - if it does, no missing child
  if (pathExistsInBundle(bundleJson, errorJsonPointer)) return null;
  
  // Get parent path and child key
  const parentPath = getParentJsonPointer(errorJsonPointer);
  const childKey = getLastSegmentFromJsonPointer(errorJsonPointer);
  
  if (!parentPath || !childKey) return null;
  
  // Check if parent exists - if not, can't assist (parent is also missing)
  if (!pathExistsInBundle(bundleJson, parentPath)) return null;
  
  // Success: parent exists, child is missing
  return {
    parentJsonPointer: parentPath,
    childKey: childKey,
    fullPath: errorJsonPointer
  };
};

/**
 * Extract the field name from a FHIRPath
 * Example: "Observation.performer.display" -> "display"
 * Example: "Patient.name[0].given" -> "given"
 */
export const getFieldNameFromFhirPath = (fhirPath?: string): string | null => {
  if (!fhirPath) return null;
  
  // Remove where() clauses
  const cleaned = fhirPath.replace(/\.where\([^)]+\)/g, '');
  
  // Split by dots and get last segment
  const segments = cleaned.split('.').filter(s => s);
  if (segments.length === 0) return null;
  
  const lastSegment = segments[segments.length - 1];
  
  // Remove array indices
  return lastSegment.replace(/\[\d+\]/g, '');
};
