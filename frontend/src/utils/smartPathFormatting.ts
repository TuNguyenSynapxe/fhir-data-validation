/**
 * Smart Path Formatting Utilities
 * 
 * Formats FHIR validation paths as structured breadcrumbs for better readability.
 */

export interface PathSegment {
  name: string;
  index?: number;
  isLast: boolean;
}

export interface FormattedPath {
  segments: PathSegment[];
  fullPath: string;
  scopedPath: string; // Path with resource name removed
}

/**
 * Format a FHIR path as structured breadcrumbs
 * 
 * @param path - FHIR path (e.g., "Patient.extension.valueCodeableConcept")
 * @param resourceType - Resource type to scope the path (e.g., "Patient")
 * @returns Formatted path with segments and scoped version
 */
export function formatSmartPath(path: string, resourceType?: string): FormattedPath {
  if (!path || path === 'Unknown') {
    return {
      segments: [{ name: 'Unknown', isLast: true }],
      fullPath: 'Unknown',
      scopedPath: 'Unknown'
    };
  }

  // Split by dots and handle array indices
  const parts = path.split('.');
  const segments: PathSegment[] = [];

  parts.forEach((part, index) => {
    // Check for array index notation (e.g., "extension[2]")
    const match = part.match(/^(.+?)\[(\d+)\]$/);
    
    if (match) {
      segments.push({
        name: match[1],
        index: parseInt(match[2], 10),
        isLast: index === parts.length - 1
      });
    } else {
      segments.push({
        name: part,
        isLast: index === parts.length - 1
      });
    }
  });

  // Create scoped path (remove resource name if it matches)
  let scopedPath = path;
  if (resourceType && path.startsWith(`${resourceType}.`)) {
    scopedPath = path.substring(resourceType.length + 1);
  }

  return {
    segments,
    fullPath: path,
    scopedPath
  };
}

/**
 * Render path segments as a breadcrumb string
 * 
 * @param segments - Path segments
 * @param separator - Separator between segments (default: "▸")
 * @returns Formatted breadcrumb string
 */
export function renderBreadcrumb(segments: PathSegment[], separator: string = '▸'): string {
  return segments
    .map(seg => {
      const base = seg.name;
      const indexPart = seg.index !== undefined ? `[${seg.index}]` : '';
      return `${base}${indexPart}`;
    })
    .join(` ${separator} `);
}

/**
 * Extract full JSON path with entry information
 * 
 * @param jsonPointer - JSON pointer (e.g., "/entry/0/resource/extension/2/valueCodeableConcept")
 * @returns Human-readable full path (e.g., "entry[0].resource.extension[2].valueCodeableConcept")
 */
export function extractFullJsonPath(jsonPointer?: string): string {
  if (!jsonPointer) {
    return '';
  }

  // Convert JSON pointer to dot notation with array indices
  // /entry/0/resource/extension/2 -> entry[0].resource.extension[2]
  const parts = jsonPointer.split('/').filter(p => p);
  const result: string[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isNumeric = /^\d+$/.test(part);
    
    if (isNumeric && result.length > 0) {
      // Append as array index to previous part
      result[result.length - 1] = `${result[result.length - 1]}[${part}]`;
    } else {
      result.push(part);
    }
  }
  
  return result.join('.');
}

/**
 * Convert JSON pointer to JSONPath syntax
 * 
 * @param jsonPointer - JSON pointer (e.g., "/entry/0/resource/extension/2/valueCodeableConcept")
 * @returns JSONPath string (e.g., "$.entry[0].resource.extension[2].valueCodeableConcept")
 */
export function convertToJsonPath(jsonPointer?: string): string {
  if (!jsonPointer) {
    return '$';
  }

  // Convert JSON pointer to JSONPath syntax
  // /entry/0/resource/extension/2 -> $.entry[0].resource.extension[2]
  const parts = jsonPointer.split('/').filter(p => p);
  const result: string[] = ['$'];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isNumeric = /^\d+$/.test(part);
    
    if (isNumeric && result.length > 1) {
      // Append as array index to previous part
      result[result.length - 1] = `${result[result.length - 1]}[${part}]`;
    } else {
      result.push(part);
    }
  }
  
  return result.join('.');
}

/**
 * Get scoped segments (with resource name removed)
 * 
 * @param segments - Full path segments
 * @param resourceType - Resource type to remove
 * @returns Scoped segments without the resource prefix
 */
export function getScopedSegments(segments: PathSegment[], resourceType?: string): PathSegment[] {
  if (!resourceType || segments.length === 0) {
    return segments;
  }

  // If first segment matches resource type, remove it
  if (segments[0].name === resourceType) {
    const scoped = segments.slice(1);
    // Update isLast flag for new segments
    if (scoped.length > 0) {
      scoped[scoped.length - 1].isLast = true;
    }
    return scoped;
  }

  return segments;
}
