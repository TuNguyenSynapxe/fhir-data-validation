/**
 * Array Path Detection Utilities
 * 
 * Detects and analyzes array layers in FHIRPath expressions.
 * Used for nested array refinement UX.
 */

export interface ArrayLayer {
  /** Array segment name (e.g., "address", "line") */
  segment: string;
  /** Position in path (0-indexed) */
  position: number;
  /** Path up to this point (e.g., "Patient.address") */
  pathToArray: string;
  /** Remaining path after this array (e.g., "line.extension") */
  remainingPath: string;
}

/**
 * Detect array layers in a FHIRPath
 * 
 * Example: "Patient.address.line.extension"
 * Returns: [
 *   { segment: "address", position: 0, pathToArray: "address", remainingPath: "line.extension" },
 *   { segment: "line", position: 1, pathToArray: "address.line", remainingPath: "extension" }
 * ]
 * 
 * Note: This is a heuristic approach - assumes plurals are arrays
 * More accurate detection would require schema knowledge
 */
export function detectArrayLayers(basePath: string): ArrayLayer[] {
  if (!basePath || !basePath.trim()) {
    return [];
  }

  // Remove any existing array indices or filters from the path
  const cleanPath = basePath
    .replace(/\[\d+\]/g, '') // Remove [0], [1], etc.
    .replace(/\[\*\]/g, '') // Remove [*]
    .replace(/\.where\([^)]+\)/g, ''); // Remove .where(...) clauses

  const segments = cleanPath.split('.');
  const arrayLayers: ArrayLayer[] = [];

  // Heuristic: Segments that are likely arrays
  // - Plural words (ends with 's' but not 'status', 'address' is special case)
  // - Known FHIR array fields
  const knownArrayFields = new Set([
    'identifier', 'name', 'telecom', 'address', 'contact',
    'communication', 'link', 'line', 'extension', 'modifierExtension',
    'contained', 'entry', 'coding', 'note', 'performer', 'item',
    'given', 'prefix', 'suffix', 'part', 'interpretation'
  ]);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isArray = knownArrayFields.has(segment) || 
                    (segment.endsWith('s') && segment !== 'status' && segment !== 'class');

    if (isArray) {
      const pathToArray = segments.slice(0, i + 1).join('.');
      const remainingPath = segments.slice(i + 1).join('.');

      arrayLayers.push({
        segment,
        position: arrayLayers.length, // Logical position in array hierarchy
        pathToArray,
        remainingPath,
      });
    }
  }

  return arrayLayers;
}

/**
 * Check if a path has nested arrays (more than one array layer)
 */
export function hasNestedArrays(basePath: string): boolean {
  return detectArrayLayers(basePath).length > 1;
}

/**
 * Check if a path contains any array segments
 * Used to determine if refinement UI should be shown
 */
export function hasAnyArrayInPath(basePath: string): boolean {
  return detectArrayLayers(basePath).length > 0;
}

/**
 * Get the nesting depth (number of array layers)
 */
export function getArrayNestingDepth(basePath: string): number {
  return detectArrayLayers(basePath).length;
}

/**
 * Check if nesting depth exceeds the limit (2)
 */
export function exceedsMaxNestingDepth(basePath: string): boolean {
  return getArrayNestingDepth(basePath) > 2;
}

/**
 * Build path up to a specific array layer
 * 
 * Example: 
 * basePath = "address.line.extension"
 * layerIndex = 0 → "address"
 * layerIndex = 1 → "address.line"
 */
export function buildPathToLayer(basePath: string, layerIndex: number): string {
  const layers = detectArrayLayers(basePath);
  if (layerIndex < 0 || layerIndex >= layers.length) {
    return basePath;
  }
  return layers[layerIndex].pathToArray;
}
