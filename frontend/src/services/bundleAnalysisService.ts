/**
 * Bundle Analysis Service
 * 
 * Pure business logic for analyzing FHIR bundles.
 * Extracts observed resource types and paths without UI concerns.
 * 
 * IMPORTANT: This is shared core logic. Must NOT import React or UI components.
 */

export interface BundleAnalysisResult {
  observedResourceTypes: Set<string>;
  observedPaths: Set<string>;
}

/**
 * Analyze a FHIR bundle and extract observed resource types and paths.
 * 
 * @param bundle - The parsed FHIR bundle object (or null/undefined)
 * @returns Analysis result with Sets of observed resource types and paths
 */
export function analyzeFhirBundle(bundle: any): BundleAnalysisResult {
  // Early return for invalid input
  if (!bundle || typeof bundle !== 'object') {
    return { 
      observedResourceTypes: new Set<string>(), 
      observedPaths: new Set<string>() 
    };
  }

  const observedResourceTypes = new Set<string>();
  const observedPaths = new Set<string>();

  // Process bundle entries
  if (bundle.entry && Array.isArray(bundle.entry)) {
    bundle.entry.forEach((entry: any) => {
      if (entry.resource && entry.resource.resourceType) {
        const resourceType = entry.resource.resourceType;
        observedResourceTypes.add(resourceType);

        // Recursively collect paths from the resource
        collectPathsFromResource(entry.resource, resourceType, observedPaths);
      }
    });
  }

  return { observedResourceTypes, observedPaths };
}

/**
 * Recursively traverse a FHIR resource and collect all observed paths.
 * Paths are in the format "ResourceType.field.subfield".
 * 
 * @param resource - The FHIR resource object
 * @param resourceType - The resource type prefix (e.g., "Patient")
 * @param observedPaths - Set to accumulate paths into
 */
function collectPathsFromResource(
  resource: any, 
  resourceType: string, 
  observedPaths: Set<string>
): void {
  const collectPaths = (obj: any, prefix: string) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const path = prefix ? `${prefix}.${key}` : key;
      const fullPath = `${resourceType}.${path}`;
      observedPaths.add(fullPath);
      
      // Handle arrays
      if (Array.isArray(obj[key])) {
        obj[key].forEach((item: any) => {
          if (item && typeof item === 'object') {
            collectPaths(item, path);
          }
        });
      } 
      // Handle nested objects
      else if (obj[key] && typeof obj[key] === 'object') {
        collectPaths(obj[key], path);
      }
    });
  };

  collectPaths(resource, '');
}

/**
 * Check if a rule's path is observed in the bundle analysis result.
 * Handles wildcards and partial path matching.
 * 
 * @param rulePath - The FHIRPath from the rule (e.g., "Patient.name.given")
 * @param analysisResult - The bundle analysis result
 * @returns true if the path is observed in the bundle
 */
export function isRulePathObserved(
  rulePath: string, 
  analysisResult: BundleAnalysisResult
): boolean {
  const { observedPaths } = analysisResult;
  
  // Empty path is always considered observed
  if (!rulePath) return true;
  
  // Direct match
  if (observedPaths.has(rulePath)) return true;
  
  // Check if any observed path starts with this rule path
  // (handles cases where rule targets a parent and bundle has children)
  for (const observedPath of observedPaths) {
    if (observedPath.startsWith(rulePath + '.')) {
      return true;
    }
  }
  
  return false;
}
