/**
 * Smart Path Navigation Utility
 * 
 * Provides intelligent navigation to FHIRPath locations in a bundle,
 * with graceful fallback to parent nodes when exact paths don't exist.
 */

/**
 * Parse FHIRPath into path segments
 * Example: "Encounter.status" => ["Encounter", "status"]
 * Example: "Patient.name[0].family" => ["Patient", "name", 0, "family"]
 */
export function parseFhirPath(fhirPath: string): (string | number)[] {
  if (!fhirPath) return [];
  
  const segments: (string | number)[] = [];
  const parts = fhirPath.split('.');
  
  for (const part of parts) {
    // Check for array notation: "name[0]"
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      segments.push(arrayMatch[1]); // property name
      segments.push(parseInt(arrayMatch[2], 10)); // array index
    } else {
      segments.push(part);
    }
  }
  
  return segments;
}

/**
 * Convert path segments to JSON Pointer
 * Example: ["entry", 0, "resource", "status"] => "/entry/0/resource/status"
 */
export function pathToJsonPointer(pathSegments: (string | number)[]): string {
  if (pathSegments.length === 0) return '';
  return '/' + pathSegments.map(s => String(s).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

/**
 * Convert path segments back to FHIRPath
 * Example: ["entry", 0, "resource", "status"] => "entry[0].resource.status"
 */
export function pathToFhirPath(pathSegments: (string | number)[]): string {
  if (pathSegments.length === 0) return '';
  
  return pathSegments.map((segment, index) => {
    if (typeof segment === 'number') {
      return `[${segment}]`;
    } else {
      const prefix = index === 0 ? '' : '.';
      return `${prefix}${segment}`;
    }
  }).join('').replace(/\.\[/g, '[');
}

/**
 * Check if a path exists in the bundle
 */
export function pathExistsInBundle(bundle: any, pathSegments: (string | number)[]): boolean {
  let current = bundle;
  
  for (const segment of pathSegments) {
    if (current === null || current === undefined) {
      return false;
    }
    
    if (typeof segment === 'number') {
      // Array index
      if (!Array.isArray(current) || segment >= current.length) {
        return false;
      }
      current = current[segment];
    } else {
      // Object property
      if (typeof current !== 'object' || !current.hasOwnProperty(segment)) {
        return false;
      }
      current = current[segment];
    }
  }
  
  return true;
}

/**
 * Find the nearest existing parent path
 * Iteratively removes the last segment until a valid path is found
 * 
 * @returns Object with:
 *   - resolvedPath: Array of path segments that exist
 *   - resolvedFhirPath: FHIRPath string of resolved path
 *   - resolvedJsonPointer: JSON Pointer of resolved path
 *   - isExactMatch: true if original path exists, false if fallback
 *   - missingSegments: Array of segments that don't exist
 */
export function findNearestPath(
  bundle: any,
  targetFhirPath: string
): {
  resolvedPath: (string | number)[];
  resolvedFhirPath: string;
  resolvedJsonPointer: string;
  isExactMatch: boolean;
  missingSegments: (string | number)[];
} {
  const targetSegments = parseFhirPath(targetFhirPath);
  
  // Try each progressively shorter path
  for (let i = targetSegments.length; i >= 0; i--) {
    const candidatePath = targetSegments.slice(0, i);
    
    if (candidatePath.length === 0) {
      // Empty path = root
      return {
        resolvedPath: [],
        resolvedFhirPath: '',
        resolvedJsonPointer: '',
        isExactMatch: false,
        missingSegments: targetSegments,
      };
    }
    
    if (pathExistsInBundle(bundle, candidatePath)) {
      const missingSegments = targetSegments.slice(i);
      return {
        resolvedPath: candidatePath,
        resolvedFhirPath: pathToFhirPath(candidatePath),
        resolvedJsonPointer: pathToJsonPointer(candidatePath),
        isExactMatch: missingSegments.length === 0,
        missingSegments,
      };
    }
  }
  
  // No path found (shouldn't happen if bundle is valid)
  return {
    resolvedPath: [],
    resolvedFhirPath: '',
    resolvedJsonPointer: '',
    isExactMatch: false,
    missingSegments: targetSegments,
  };
}

/**
 * Navigation result type
 */
export interface NavigationResult {
  success: boolean;
  targetPath: string;
  resolvedPath: string;
  isExactMatch: boolean;
  message: string;
  jsonPointer: string;
}

/**
 * Find resource in bundle by resource type
 * Returns the entry index and full path prefix
 */
function findResourceInBundle(bundle: any, resourceType: string): { entryIndex: number; pathPrefix: string } | null {
  if (!bundle.entry || !Array.isArray(bundle.entry)) {
    return null;
  }
  
  for (let i = 0; i < bundle.entry.length; i++) {
    const entry = bundle.entry[i];
    if (entry.resource && entry.resource.resourceType === resourceType) {
      return {
        entryIndex: i,
        pathPrefix: `entry[${i}].resource`
      };
    }
  }
  
  return null;
}

/**
 * Prepare navigation to a FHIRPath with smart fallback
 * 
 * @param bundle - The parsed bundle object
 * @param fhirPath - Target FHIRPath (e.g., "Patient.extension.valueCodeableConcept" or "entry[0].resource.status")
 * @returns Navigation result with resolved path and user message
 */
export function prepareNavigation(bundle: any, fhirPath: string): NavigationResult {
  if (!bundle || !fhirPath) {
    return {
      success: false,
      targetPath: fhirPath,
      resolvedPath: '',
      isExactMatch: false,
      message: 'Invalid bundle or path',
      jsonPointer: '',
    };
  }
  
  let fullPath = fhirPath;
  
  // If path doesn't start with "entry", it's a resource-relative path
  // We need to find the resource in the bundle and prepend the entry path
  if (!fhirPath.startsWith('entry')) {
    // Extract resource type (first segment before dot or bracket)
    const resourceTypeMatch = fhirPath.match(/^([A-Z][a-zA-Z]+)/);
    if (resourceTypeMatch) {
      const resourceType = resourceTypeMatch[1];
      const resourceLocation = findResourceInBundle(bundle, resourceType);
      
      if (resourceLocation) {
        // Remove the resource type from the path and prepend the entry path
        const relativePath = fhirPath.substring(resourceType.length);
        fullPath = resourceLocation.pathPrefix + (relativePath.startsWith('.') ? relativePath : '.' + relativePath);
      } else {
        // Resource type not found in bundle
        return {
          success: false,
          targetPath: fhirPath,
          resolvedPath: '',
          isExactMatch: false,
          message: `Resource type "${resourceType}" not found in bundle.`,
          jsonPointer: '',
        };
      }
    }
  }
  
  const result = findNearestPath(bundle, fullPath);
  
  if (result.isExactMatch) {
    return {
      success: true,
      targetPath: fhirPath,
      resolvedPath: result.resolvedFhirPath,
      isExactMatch: true,
      message: 'Field located in bundle',
      jsonPointer: result.resolvedJsonPointer,
    };
  }
  
  if (result.resolvedPath.length > 0) {
    return {
      success: true,
      targetPath: fhirPath,
      resolvedPath: result.resolvedFhirPath,
      isExactMatch: false,
      message: 'Exact field not found. Navigated to nearest available parent.',
      jsonPointer: result.resolvedJsonPointer,
    };
  }
  
  return {
    success: false,
    targetPath: fhirPath,
    resolvedPath: '',
    isExactMatch: false,
    message: 'This field does not exist in the current bundle.',
    jsonPointer: '',
  };
}
