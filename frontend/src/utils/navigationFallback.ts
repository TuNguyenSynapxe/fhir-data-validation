/**
 * Phase 8: Navigation Fallback Resolver
 * 
 * Handles navigation when jsonPointer is null or path doesn't exist.
 * Returns nearest resolvable parent + missing segments for ghost node rendering.
 * 
 * RULES:
 * - If jsonPointer is valid → use it directly
 * - If jsonPointer is null → compute nearest parent from FHIRPath
 * - Never return null - always find something navigable
 */

export interface NavigationTarget {
  /** JSON Pointer to navigate to (always exists in bundle) */
  targetPointer: string;
  /** Segments that are missing after targetPointer */
  missingSegments: string[];
  /** Whether this is the exact target (true) or a fallback parent (false) */
  isExact: boolean;
  /** Human-readable reason for fallback */
  fallbackReason?: string;
}

/**
 * Resolve navigation target for validation error.
 * 
 * @param bundleJson - Raw FHIR Bundle JSON string
 * @param fhirPath - FHIRPath expression (e.g., "Observation.where(code.coding.code='HS').performer.display")
 * @param jsonPointer - JSON Pointer if available (e.g., "/entry/0/resource/performer/display")
 * @returns NavigationTarget with pointer to navigate to + missing segments
 */
export function resolveNavigationTarget(
  bundleJson: string,
  fhirPath: string,
  jsonPointer: string | null | undefined
): NavigationTarget {
  // Case 1: jsonPointer exists and is valid → use it directly
  if (jsonPointer && isJsonPointerValid(bundleJson, jsonPointer)) {
    return {
      targetPointer: jsonPointer,
      missingSegments: [],
      isExact: true,
    };
  }

  // Case 2: jsonPointer is null OR invalid → find nearest parent
  if (jsonPointer) {
    // jsonPointer exists but path doesn't exist in bundle
    const parentResult = findNearestParent(bundleJson, jsonPointer);
    return {
      targetPointer: parentResult.parentPointer,
      missingSegments: parentResult.missingSegments,
      isExact: false,
      fallbackReason: 'Field does not exist in bundle',
    };
  }

  // Case 3: No jsonPointer at all → try to derive from FHIRPath
  // For now, navigate to root of first matching resource
  const resourceMatch = extractResourceFromFhirPath(fhirPath);
  if (resourceMatch) {
    const resourcePointer = findFirstResourceOfType(bundleJson, resourceMatch.resourceType);
    if (resourcePointer) {
      return {
        targetPointer: resourcePointer,
        missingSegments: resourceMatch.remainingPath,
        isExact: false,
        fallbackReason: 'Path could not be resolved - navigating to resource root',
      };
    }
  }

  // Case 4: Fallback to bundle root
  return {
    targetPointer: '',
    missingSegments: fhirPath ? [fhirPath] : [],
    isExact: false,
    fallbackReason: 'Could not resolve any path - showing bundle root',
  };
}

/**
 * Check if JSON Pointer exists in bundle
 */
function isJsonPointerValid(bundleJson: string, jsonPointer: string): boolean {
  try {
    const bundle = JSON.parse(bundleJson);
    const segments = jsonPointer.split('/').filter(s => s !== '');
    
    let current: any = bundle;
    for (const segment of segments) {
      const decoded = decodeJsonPointerSegment(segment);
      if (current === null || current === undefined) return false;
      if (Array.isArray(current)) {
        const index = parseInt(decoded, 10);
        if (isNaN(index) || index < 0 || index >= current.length) return false;
        current = current[index];
      } else if (typeof current === 'object') {
        if (!(decoded in current)) return false;
        current = current[decoded];
      } else {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Find nearest existing parent in bundle by walking up JSON Pointer
 */
function findNearestParent(
  bundleJson: string,
  jsonPointer: string
): { parentPointer: string; missingSegments: string[] } {
  const segments = jsonPointer.split('/').filter(s => s !== '');
  
  // Walk up from full path until we find something that exists
  for (let i = segments.length; i >= 0; i--) {
    const parentSegments = segments.slice(0, i);
    const parentPointer = parentSegments.length > 0 ? '/' + parentSegments.join('/') : '';
    
    if (isJsonPointerValid(bundleJson, parentPointer)) {
      const missingSegments = segments.slice(i).map(s => decodeJsonPointerSegment(s));
      return { parentPointer, missingSegments };
    }
  }
  
  // If even root doesn't exist, something is very wrong
  return { parentPointer: '', missingSegments: segments.map(s => decodeJsonPointerSegment(s)) };
}

/**
 * Extract resource type and remaining path from FHIRPath
 * Example: "Observation.where(code.coding.code='HS').performer.display"
 *   → { resourceType: "Observation", remainingPath: ["performer", "display"] }
 */
function extractResourceFromFhirPath(fhirPath: string): {
  resourceType: string;
  remainingPath: string[];
} | null {
  if (!fhirPath) return null;
  
  // Match resource type at start (before any '.' or '(')
  const match = fhirPath.match(/^([A-Z][a-zA-Z]+)(?:\.|\(|$)/);
  if (!match) return null;
  
  const resourceType = match[1];
  
  // Extract path after resource type (skip where() filters)
  let remaining = fhirPath.substring(resourceType.length);
  
  // Remove where() clauses
  remaining = remaining.replace(/\.where\([^)]+\)/g, '');
  
  // Split into segments
  const segments = remaining
    .split('.')
    .filter(s => s && !s.startsWith('where('))
    .map(s => s.trim());
  
  return { resourceType, remainingPath: segments };
}

/**
 * Find JSON Pointer to first resource of given type in bundle
 */
function findFirstResourceOfType(bundleJson: string, resourceType: string): string | null {
  try {
    const bundle = JSON.parse(bundleJson);
    if (!bundle.entry || !Array.isArray(bundle.entry)) return null;
    
    for (let i = 0; i < bundle.entry.length; i++) {
      const resource = bundle.entry[i]?.resource;
      if (resource?.resourceType === resourceType) {
        return `/entry/${i}/resource`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decode JSON Pointer segment (handles ~0 and ~1 escaping)
 */
function decodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * Encode JSON Pointer segment
 */
export function encodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Convert path array to JSON Pointer
 * Example: ["entry", 0, "resource", "name"] → "/entry/0/resource/name"
 */
export function pathArrayToJsonPointer(pathArray: (string | number)[]): string {
  if (pathArray.length === 0) return '';
  return '/' + pathArray.map(seg => encodeJsonPointerSegment(String(seg))).join('/');
}

/**
 * Convert JSON Pointer to path array
 * Example: "/entry/0/resource/name" → ["entry", "0", "resource", "name"]
 */
export function jsonPointerToPathArray(jsonPointer: string): string[] {
  if (!jsonPointer || jsonPointer === '') return [];
  return jsonPointer.split('/').filter(s => s !== '').map(decodeJsonPointerSegment);
}
