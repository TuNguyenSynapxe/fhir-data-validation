/**
 * FHIRPath Value Extractor - Pure frontend value suggestion logic
 * 
 * CONSTRAINTS:
 * - No validation
 * - No backend calls
 * - No mutation
 * - No caching (Phase 1)
 * - Returns strings only (Phase 1)
 */

export interface SuggestedValueGroup {
  source: 'project' | 'sample';
  label: string;
  values: string[];
}

/**
 * Extract suggested values for a filter property from source JSON
 * 
 * PURE FUNCTION:
 * - No side effects
 * - No validation
 * - No API calls
 * 
 * @param sourceJson - Bundle or sample resource JSON
 * @param basePath - Base FHIRPath (e.g., "identifier", "name")
 * @param property - Property to extract values from (e.g., "system", "use")
 * @returns Array of unique string values (max 10)
 */
export function extractSuggestedValues(
  sourceJson: any,
  basePath: string,
  property: string
): string[] {
  if (!sourceJson || !basePath || !property) {
    return [];
  }

  const values = new Set<string>();

  try {
    // Parse JSON if string
    const data = typeof sourceJson === 'string' ? JSON.parse(sourceJson) : sourceJson;

    // Extract base path segment (before any brackets)
    const baseSegment = basePath.split('.')[0].replace(/\[.*?\]/g, '');

    // Navigate to base path and collect property values
    collectPropertyValues(data, baseSegment, property, values);

    // Return unique values, max 10
    return Array.from(values)
      .filter(v => v && typeof v === 'string')
      .slice(0, 10);
  } catch (error) {
    // Silent failure - suggestions are optional
    return [];
  }
}

/**
 * Recursively collect property values from nested structures
 */
function collectPropertyValues(
  obj: any,
  targetPath: string,
  property: string,
  values: Set<string>,
  currentDepth: number = 0
): void {
  // Safety: prevent infinite recursion
  if (currentDepth > 10 || values.size >= 10) {
    return;
  }

  if (!obj || typeof obj !== 'object') {
    return;
  }

  // If we're at an array, recurse into each element
  if (Array.isArray(obj)) {
    for (const item of obj) {
      collectPropertyValues(item, targetPath, property, values, currentDepth + 1);
      if (values.size >= 10) break;
    }
    return;
  }

  // If this object has the target path as a property
  if (obj[targetPath]) {
    const targetValue = obj[targetPath];
    
    // If target is an array, look for property in each element
    if (Array.isArray(targetValue)) {
      for (const item of targetValue) {
        if (item && typeof item === 'object' && item[property]) {
          const value = item[property];
          if (typeof value === 'string') {
            values.add(value);
          }
        }
        if (values.size >= 10) break;
      }
    }
    // If target is an object, check for property directly
    else if (typeof targetValue === 'object' && targetValue[property]) {
      const value = targetValue[property];
      if (typeof value === 'string') {
        values.add(value);
      }
    }
  }

  // Also check nested Bundle.entry structure
  if (obj.entry && Array.isArray(obj.entry)) {
    for (const entry of obj.entry) {
      if (entry.resource) {
        collectPropertyValues(entry.resource, targetPath, property, values, currentDepth + 1);
        if (values.size >= 10) break;
      }
    }
  }

  // Recurse into other object properties
  for (const key in obj) {
    if (key !== 'entry' && typeof obj[key] === 'object') {
      collectPropertyValues(obj[key], targetPath, property, values, currentDepth + 1);
      if (values.size >= 10) break;
    }
  }
}

/**
 * Build suggested value groups from available sources
 * 
 * Priority order:
 * 1. Project Bundle (highest confidence)
 * 2. Selected HL7 Sample (secondary)
 * 
 * @param projectBundle - Optional project bundle JSON
 * @param hlSample - Optional selected HL7 sample JSON
 * @param basePath - Base FHIRPath
 * @param property - Property to extract
 * @returns Grouped suggestions by source
 */
export function buildSuggestedValueGroups(
  projectBundle: any | undefined,
  hlSample: any | undefined,
  basePath: string,
  property: string
): SuggestedValueGroup[] {
  const groups: SuggestedValueGroup[] = [];

  // Priority 1: Project Bundle
  if (projectBundle) {
    const projectValues = extractSuggestedValues(projectBundle, basePath, property);
    if (projectValues.length > 0) {
      groups.push({
        source: 'project',
        label: 'From Project Bundle',
        values: projectValues,
      });
    }
  }

  // Priority 2: Selected HL7 Sample
  if (hlSample) {
    const sampleValues = extractSuggestedValues(hlSample, basePath, property);
    if (sampleValues.length > 0) {
      groups.push({
        source: 'sample',
        label: 'From HL7 Sample',
        values: sampleValues,
      });
    }
  }

  return groups;
}
