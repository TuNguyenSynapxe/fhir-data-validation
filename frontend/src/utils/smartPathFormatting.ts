/**
 * Smart Path Formatting Utilities
 * 
 * Formats FHIR validation paths as structured breadcrumbs for better readability.
 * Correctly handles FHIRPath semantics: where() clauses are FILTERS, not structure.
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

export interface ParsedFhirPath {
  resourceType: string;          // e.g., "Observation"
  scopeSelector?: string;        // e.g., "code.coding.code='HS'" (inside where())
  structuralPath: string;        // e.g., "performer.display" (actual JSON structure)
  fullPath: string;              // Original input path
}

/**
 * Extract scope selector (where clause) and structural path from FHIRPath
 * 
 * Examples:
 * - "Observation.where(code.coding.code='HS').performer.display"
 *   → { resourceType: "Observation", scopeSelector: "code.coding.code='HS'", structuralPath: "performer.display" }
 * 
 * - "Patient.name.given"
 *   → { resourceType: "Patient", scopeSelector: undefined, structuralPath: "name.given" }
 * 
 * @param fhirPath - Full FHIRPath expression
 * @returns Parsed components
 */
export function parseFhirPathComponents(fhirPath: string): ParsedFhirPath {
  if (!fhirPath || fhirPath === 'Unknown') {
    return {
      resourceType: 'Unknown',
      scopeSelector: undefined,
      structuralPath: '',
      fullPath: fhirPath
    };
  }

  // Pattern: ResourceType.where(...).structuralPath
  const whereMatch = fhirPath.match(/^([^.]+)\.where\(([^)]+)\)(?:\.(.+))?$/);
  
  if (whereMatch) {
    const [, resourceType, selector, structural] = whereMatch;
    return {
      resourceType,
      scopeSelector: selector,
      structuralPath: structural || '',
      fullPath: fhirPath
    };
  }

  // Pattern: ResourceType.structuralPath (no filter)
  const simpleMatch = fhirPath.match(/^([^.]+)(?:\.(.+))?$/);
  
  if (simpleMatch) {
    const [, resourceType, structural] = simpleMatch;
    return {
      resourceType,
      scopeSelector: undefined,
      structuralPath: structural || '',
      fullPath: fhirPath
    };
  }

  // Fallback: treat entire path as structural
  return {
    resourceType: fhirPath.split('.')[0],
    scopeSelector: undefined,
    structuralPath: fhirPath.includes('.') ? fhirPath.substring(fhirPath.indexOf('.') + 1) : '',
    fullPath: fhirPath
  };
}

/**
 * Format scope selector for display
 * Simplifies complex predicates for readability
 * 
 * @param selector - FHIRPath predicate (e.g., "code.coding.code='HS'")
 * @returns Human-readable filter description
 */
export function formatScopeSelector(selector: string): string {
  if (!selector) return '';

  // Try to extract simple equality checks for common patterns
  // Pattern: code.coding.code='value' → code = value
  const codeMatch = selector.match(/^code\.coding\.code\s*=\s*['"]([^'"]+)['"]$/);
  if (codeMatch) {
    return `code = ${codeMatch[1]}`;
  }

  // Pattern: status='value' → status = value
  const simpleMatch = selector.match(/^(\w+)\s*=\s*['"]([^'"]+)['"]$/);
  if (simpleMatch) {
    return `${simpleMatch[1]} = ${simpleMatch[2]}`;
  }

  // For complex expressions, show as-is
  return selector;
}

/**
 * Format a FHIR path as structured breadcrumbs
 * 
 * Phase 6: Structure-only breadcrumb formatting
 * - Strips ALL where() clauses (handles multiple, nested)
 * - Returns only structural JSON path segments
 * - Scope selectors should be rendered separately via ScopeSelectorChip
 * 
 * Handles special cases:
 * - Array indices: "address[0]" shown with index
 * - Nested paths: all where() clauses removed from any position
 * 
 * Example:
 * Input:  "Observation.where(code='HS').component.where(system='loinc').valueString"
 * Output: segments for "Observation.component.valueString"
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

  // Phase 6: Strip ALL where() clauses to get structural path only
  // This handles multiple where() at any position in the path
  let structuralPath = path.replace(/\.where\([^)]+\)/g, '');
  
  // Fix duplicate resource type prefix (e.g., "Patient.Patient[*].gender" → "Patient[*].gender")
  // This happens when backend constructs paths incorrectly
  if (resourceType) {
    const duplicatePattern = new RegExp(`^${resourceType}\\.${resourceType}(\\[|\\.|$)`);
    if (duplicatePattern.test(structuralPath)) {
      // Remove the first occurrence of "ResourceType."
      structuralPath = structuralPath.substring(resourceType.length + 1);
    }
  }
  
  // Split by dots and handle array indices
  const parts = structuralPath.split('.').filter(p => p);
  const segments: PathSegment[] = [];

  parts.forEach((part, index) => {
    // Check for array index notation (e.g., "extension[2]")
    const match = part.match(/^(.+?)\[(\d+|\*)\]$/);
    
    if (match) {
      segments.push({
        name: match[1],
        index: match[2] === '*' ? undefined : parseInt(match[2], 10),
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
  let scopedPath = structuralPath;
  if (resourceType && structuralPath.startsWith(`${resourceType}.`)) {
    scopedPath = structuralPath.substring(resourceType.length + 1);
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
