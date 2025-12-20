/**
 * Path Navigation Utilities
 * 
 * Handles JSON pointer validation and finding nearest valid parent paths.
 */

/**
 * Check if a JSON pointer exists in the bundle
 */
export const validateJsonPointer = (bundleJson: string, jsonPointer: string | undefined): boolean => {
  if (!bundleJson) return false;
  if (jsonPointer === undefined) return false;
  
  // Empty string represents root, which always exists if bundle is valid
  if (jsonPointer === '') {
    try {
      JSON.parse(bundleJson);
      return true;
    } catch {
      return false;
    }
  }
  
  try {
    const bundle = JSON.parse(bundleJson);
    const path = jsonPointerToPath(jsonPointer);
    
    let current: any = bundle;
    for (const segment of path) {
      if (current === null || current === undefined) return false;
      
      if (Array.isArray(current)) {
        const index = parseInt(segment, 10);
        if (isNaN(index) || index < 0 || index >= current.length) return false;
        current = current[index];
      } else if (typeof current === 'object') {
        if (!(segment in current)) return false;
        current = current[segment];
      } else {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Find the nearest valid parent path
 * Returns the closest ancestor path that exists in the bundle
 */
export const findNearestValidPath = (
  bundleJson: string,
  jsonPointer: string | undefined
): { path: string; isExact: boolean } | null => {
  if (!bundleJson) return null;
  if (jsonPointer === undefined) return null;
  
  // Empty string represents root, which always exists if bundle is valid
  if (jsonPointer === '') {
    try {
      JSON.parse(bundleJson);
      return { path: '', isExact: true };
    } catch {
      return null;
    }
  }
  
  // Check if exact path exists
  if (validateJsonPointer(bundleJson, jsonPointer)) {
    return { path: jsonPointer, isExact: true };
  }
  
  // Walk up the path tree to find nearest parent
  const segments = jsonPointerToPath(jsonPointer);
  
  for (let i = segments.length - 1; i > 0; i--) {
    const parentSegments = segments.slice(0, i);
    const parentPointer = pathToJsonPointer(parentSegments);
    
    if (validateJsonPointer(bundleJson, parentPointer)) {
      return { path: parentPointer, isExact: false };
    }
  }
  
  // Root always exists if bundle is valid
  return { path: '', isExact: false };
};

/**
 * Convert JSON pointer to path array
 * Example: '/entry/0/resource/name' => ['entry', '0', 'resource', 'name']
 */
const jsonPointerToPath = (jsonPointer: string): string[] => {
  if (!jsonPointer || jsonPointer === '') return [];
  
  return jsonPointer
    .split('/')
    .slice(1) // Remove leading empty string from leading '/'
    .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
};

/**
 * Convert path array to JSON pointer
 * Example: ['entry', '0', 'resource', 'name'] => '/entry/0/resource/name'
 */
const pathToJsonPointer = (path: string[]): string => {
  if (path.length === 0) return '';
  
  return '/' + path
    .map(segment => segment.replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/');
};

/**
 * Get path segments from JSON pointer for breadcrumb display
 */
export const getPathSegments = (jsonPointer: string): string[] => {
  return jsonPointerToPath(jsonPointer);
};

/**
 * Check if navigation is possible (exact or nearest parent)
 */
export const canNavigate = (bundleJson: string, jsonPointer: string | undefined): boolean => {
  return findNearestValidPath(bundleJson, jsonPointer) !== null;
};
