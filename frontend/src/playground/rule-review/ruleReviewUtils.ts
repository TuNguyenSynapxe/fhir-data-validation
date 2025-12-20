/**
 * Rule Review Utilities - Helper functions for static rule analysis
 * 
 * These utilities support best-effort analysis only.
 * All functions are defensive and tolerate invalid input.
 */

import type { Rule } from '../../types/rightPanelProps';

/**
 * Normalize a FHIR path for comparison
 * Handles common variations in path notation
 */
export function normalizePath(path: string): string {
  if (!path) return '';
  
  return path
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\[(\d+)\]/g, '[$1]'); // normalize array indices
}

/**
 * Extract resource type from a FHIR path
 * Returns null if cannot be determined
 */
export function extractResourceType(path: string): string | null {
  if (!path) return null;
  
  const normalized = normalizePath(path);
  const firstSegment = normalized.split('.')[0]?.split('[')[0];
  
  // Must start with capital letter (FHIR resource naming convention)
  if (!firstSegment || !/^[A-Z]/.test(firstSegment)) {
    return null;
  }
  
  return firstSegment;
}

/**
 * Check if a path targets an array (best-effort detection)
 * Returns true if path contains array notation or known array properties
 */
export function isArrayPath(path: string): boolean {
  if (!path) return false;
  
  const normalized = normalizePath(path);
  
  // Has explicit array indexing
  if (/\[\d*\]/.test(normalized)) {
    return true;
  }
  
  // Known FHIR array properties (common ones only)
  const knownArrayProps = [
    'identifier',
    'name',
    'telecom',
    'address',
    'contact',
    'contained',
    'extension',
    'modifierExtension',
    'entry',
    'resource',
  ];
  
  const lastSegment = normalized.split('.').pop()?.split('[')[0];
  
  return knownArrayProps.includes(lastSegment || '');
}

/**
 * Extract all paths from a bundle (best-effort)
 * Returns empty set if bundle is invalid or unparseable
 */
export function extractBundlePaths(bundleJson?: string): Set<string> {
  const paths = new Set<string>();
  
  if (!bundleJson) return paths;
  
  // Recursive path extraction helper
  function extractFromObject(obj: any, prefix: string, pathsSet: Set<string>) {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      pathsSet.add(currentPath);
      
      const value = obj[key];
      
      if (Array.isArray(value)) {
        // Add array path
        pathsSet.add(currentPath);
        // Recurse into first element as representative
        if (value.length > 0) {
          extractFromObject(value[0], currentPath, pathsSet);
        }
      } else if (value && typeof value === 'object') {
        extractFromObject(value, currentPath, pathsSet);
      }
    }
  }
  
  try {
    const bundle = JSON.parse(bundleJson);
    
    if (!bundle || typeof bundle !== 'object') {
      return paths;
    }
    
    // Extract paths using helper
    extractFromObject(bundle, '', paths);
    
  } catch (error) {
    // Best-effort: return empty set on parse failure
    console.debug('[RuleReview] Failed to parse bundle for path extraction:', error);
  }
  
  return paths;
}

/**
 * Extract resource types present in a bundle
 * Returns empty set if bundle is invalid
 */
export function extractBundleResourceTypes(bundleJson?: string): Set<string> {
  const resourceTypes = new Set<string>();
  
  if (!bundleJson) return resourceTypes;
  
  try {
    const bundle = JSON.parse(bundleJson);
    
    if (!bundle || typeof bundle !== 'object') {
      return resourceTypes;
    }
    
    // Add bundle's own resource type
    if (bundle.resourceType) {
      resourceTypes.add(bundle.resourceType);
    }
    
    // Extract from bundle entries
    if (Array.isArray(bundle.entry)) {
      for (const entry of bundle.entry) {
        if (entry?.resource?.resourceType) {
          resourceTypes.add(entry.resource.resourceType);
        }
      }
    }
    
  } catch (error) {
    // Best-effort: return empty set on parse failure
    console.debug('[RuleReview] Failed to parse bundle for resource types:', error);
  }
  
  return resourceTypes;
}

/**
 * Create a rule signature for duplicate detection
 * Returns normalized string combining path, expression, and severity
 */
export function getRuleSignature(rule: Rule): string {
  const path = normalizePath(rule.path || '');
  const type = (rule.type || '').trim();
  const message = (rule.message || '').trim();
  const severity = (rule.severity || '').toLowerCase();
  
  // Include type and message to identify duplicates
  return `${path}|${type}|${message}|${severity}`;
}

/**
 * Detect if a path is an internal FHIR schema artifact
 * These are valid schema elements but rarely present in instances
 */
export function isInternalSchemaPath(path: string): boolean {
  if (!path) return false;
  
  const normalized = normalizePath(path);
  
  // Pattern 1: Repeated .id.id (e.g., Patient.id.id, Observation.id.id.extension)
  if (/\.id\.id/.test(normalized)) {
    return true;
  }
  
  // Pattern 2: .extension.url (schema-level extension URLs)
  if (/\.extension\.url$/.test(normalized)) {
    return true;
  }
  
  // Pattern 3: Backbone element artifacts (rare in instances)
  if (/\._/.test(normalized)) {
    return true;
  }
  
  return false;
}

/**
 * Detect if a path is likely conditional
 * These paths may exist only under certain conditions
 */
export function isConditionalPath(path: string): boolean {
  if (!path) return false;
  
  const normalized = normalizePath(path);
  
  // Known conditional elements in FHIR
  const conditionalPatterns = [
    /\.contained\./,      // Contained resources are conditional
    /\.extension\./,      // Extensions are always optional/conditional
    /\.modifierExtension\./, // Modifier extensions are conditional
  ];
  
  return conditionalPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Check if a path is likely observed in the bundle (best-effort)
 * Uses fuzzy matching to account for array indexing and variations
 * @deprecated Use isPathObservedInBundle for more accurate detection
 */
export function isPathObserved(rulePath: string, bundlePaths: Set<string>): boolean {
  if (!rulePath || bundlePaths.size === 0) return false;
  
  const normalized = normalizePath(rulePath);
  
  // Exact match
  if (bundlePaths.has(normalized)) {
    return true;
  }
  
  // Try without array indices
  const withoutIndices = normalized.replace(/\[\d+\]/g, '');
  if (bundlePaths.has(withoutIndices)) {
    return true;
  }
  
  // Fuzzy match: check if any bundle path starts with rule path
  const pathsArray = Array.from(bundlePaths);
  for (let i = 0; i < pathsArray.length; i++) {
    const bundlePath = pathsArray[i];
    if (bundlePath.startsWith(normalized) || bundlePath.startsWith(withoutIndices)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a path is observed in a FHIR Bundle using FHIRPath-like navigation
 * 
 * Supports:
 * - Implicit array traversal: "name.family" matches Patient.name[0].family
 * - Explicit indexing: "name[0].family"
 * - ResourceType prefix: "Patient.name.family" or "name.family"
 * - Best-effort only: never throws
 * 
 * @param opts.bundle - FHIR Bundle JSON object
 * @param opts.resourceType - Resource type to search (e.g., "Patient")
 * @param opts.path - Rule path to check
 * @returns true if path is observed in any matching resource
 */
export function isPathObservedInBundle(opts: {
  bundle: any;
  resourceType: string;
  path: string;
}): boolean {
  try {
    const { bundle, resourceType, path } = opts;
    
    if (!bundle || !resourceType || !path) {
      return false;
    }
    
    // Find all resources of matching type
    const resources: any[] = [];
    
    if (Array.isArray(bundle.entry)) {
      for (const entry of bundle.entry) {
        if (entry?.resource?.resourceType === resourceType) {
          resources.push(entry.resource);
        }
      }
    }
    
    if (resources.length === 0) {
      return false;
    }
    
    // Normalize path: remove resourceType prefix if present
    let segments = path.trim().split('.');
    if (segments[0] === resourceType) {
      segments = segments.slice(1);
    }
    
    if (segments.length === 0) {
      return true; // Checking for resource type itself
    }
    
    // Check each resource
    for (const resource of resources) {
      if (checkPathInValue(resource, segments)) {
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    // Best-effort: never throw
    console.debug('[RuleReview] Error in isPathObservedInBundle:', error);
    return false;
  }
}

/**
 * Recursively check if a path exists in a value
 * Supports implicit array traversal and explicit indexing
 */
function checkPathInValue(value: any, segments: string[]): boolean {
  if (!segments || segments.length === 0) {
    return true; // All segments resolved
  }
  
  if (value === null || value === undefined) {
    return false; // Dead end
  }
  
  const [currentSegment, ...remainingSegments] = segments;
  
  // Parse segment for array indexing: "name[0]" → {key: "name", index: 0}
  const arrayMatch = currentSegment.match(/^([^\[]+)(?:\[(\d+)\])?$/);
  if (!arrayMatch) {
    return false; // Invalid segment format
  }
  
  const key = arrayMatch[1];
  const explicitIndex = arrayMatch[2] ? parseInt(arrayMatch[2], 10) : null;
  
  // Get the value at this key
  const nextValue = value[key];
  
  if (nextValue === undefined || nextValue === null) {
    return false; // Key doesn't exist
  }
  
  // If next value is an array
  if (Array.isArray(nextValue)) {
    // Explicit index provided
    if (explicitIndex !== null) {
      if (explicitIndex < nextValue.length) {
        return checkPathInValue(nextValue[explicitIndex], remainingSegments);
      }
      return false; // Index out of bounds
    }
    
    // Implicit traversal: check if path exists in ANY array element
    for (const item of nextValue) {
      if (checkPathInValue(item, remainingSegments)) {
        return true;
      }
    }
    return false;
  }
  
  // Next value is object or primitive
  return checkPathInValue(nextValue, remainingSegments);
}
