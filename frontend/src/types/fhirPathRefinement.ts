/**
 * FHIRPath Refinement Types
 * 
 * Pure string transformation for FHIRPath refinement.
 * NO validation, NO schema inference, NO backend calls.
 */

export type RefinementMode = 'first' | 'all' | 'index' | 'filter';

export type FilterOperator = 'equals' | 'contains';

export interface FilterCondition {
  property: string;
  operator: FilterOperator;
  value: string;
}

export interface RefinementConfig {
  mode: RefinementMode;
  indexValue?: number;
  filterCondition?: FilterCondition;
}

/**
 * Array Layer Refinement Config
 * Used for nested array refinement - one config per array layer
 */
export interface ArrayLayerRefinement {
  /** Array segment name (e.g., "address", "line") */
  segment: string;
  /** Refinement mode for this layer */
  mode: RefinementMode;
  /** Index value (if mode is 'index') */
  indexValue?: number;
  /** Filter condition (if mode is 'filter') */
  filterCondition?: FilterCondition;
}

/**
 * Nested Array Refinement Config
 * Contains refinement for each array layer
 */
export interface NestedArrayRefinementConfig {
  /** Array of layer refinements (parent to child order) */
  layers: ArrayLayerRefinement[];
}

/**
 * Build refined FHIRPath from base path and refinement config
 * 
 * PURE FUNCTION:
 * - No side effects
 * - No validation
 * - No API calls
 * - String transformation only
 * 
 * @param basePath - Base FHIRPath (e.g., "identifier.value")
 * @param refinement - Refinement configuration
 * @returns Refined FHIRPath string
 */
export function buildRefinedFhirPath(
  basePath: string,
  refinement: RefinementConfig
): string {
  if (!basePath.trim()) {
    return '';
  }

  const { mode, indexValue, filterCondition } = refinement;

  switch (mode) {
    case 'first':
    case 'all':
      // Default mode - implicit traversal
      // Remove any existing array indices for implicit traversal
      return removeArrayIndices(basePath);

    case 'index':
      // Apply [index] to the nearest array segment
      const idx = indexValue ?? 0;
      return applyIndex(basePath, idx);

    case 'filter':
      // Apply .where() condition
      if (!filterCondition) {
        return basePath;
      }
      return applyFilter(basePath, filterCondition);

    default:
      return basePath;
  }
}

/**
 * Remove array indices from path for implicit traversal
 * Example: "telecom[0].system" → "telecom.system"
 * Example: "name[1].given" → "name.given"
 */
function removeArrayIndices(path: string): string {
  return path.replace(/\[\d+\]/g, '');
}

/**
 * Apply [index] to the nearest array segment
 * Example: "identifier.value" → "identifier[0].value"
 * Example: "name[1].family" → "name[0].family"
 */
function applyIndex(basePath: string, index: number): string {
  const segments = basePath.split('.');
  if (segments.length === 0) return basePath;

  // Apply [index] to the first segment
  let firstSegment = segments[0];
  const restSegments = segments.slice(1);

  // Remove existing index if present and replace with new index
  firstSegment = firstSegment.replace(/\[\d+\]|\[\*\]/, `[${index}]`);
  
  // If no index was present, add new index
  if (!firstSegment.includes('[')) {
    firstSegment = `${firstSegment}[${index}]`;
  }

  if (restSegments.length === 0) {
    return firstSegment;
  }

  return `${firstSegment}.${restSegments.join('.')}`;
}

/**
 * Apply .where() filter condition
 * Example: "identifier.value" → "identifier.where(system='https://example').value"
 */
function applyFilter(basePath: string, condition: FilterCondition): string {
  const segments = basePath.split('.');
  if (segments.length === 0) return basePath;

  const { property, operator, value } = condition;

  // Build where clause
  let whereClause = '';
  if (operator === 'equals') {
    whereClause = `where(${property} = '${value}')`;
  } else if (operator === 'contains') {
    whereClause = `where(${property}.contains('${value}'))`;
  }

  // Apply where clause to the first segment
  const firstSegment = segments[0];
  const restSegments = segments.slice(1);

  if (restSegments.length === 0) {
    return `${firstSegment}.${whereClause}`;
  }

  return `${firstSegment}.${whereClause}.${restSegments.join('.')}`;
}

/**
 * Build FHIRPath for nested arrays with per-layer refinement
 * 
 * Example input:
 * basePath = "address.line"
 * layers = [
 *   { segment: "address", mode: "filter", filterCondition: { property: "use", operator: "equals", value: "home" } },
 *   { segment: "line", mode: "all" }
 * ]
 * 
 * Output: "address.where(use='home').line[*]"
 * 
 * @param basePath - Original path
 * @param config - Nested array refinement config
 * @returns Refined FHIRPath
 */
export function buildNestedArrayRefinedPath(
  basePath: string,
  config: NestedArrayRefinementConfig
): string {
  if (!basePath.trim() || config.layers.length === 0) {
    return basePath;
  }

  // Remove any existing refinements from base path
  let cleanPath = basePath
    .replace(/\[\d+\]/g, '') // Remove [0], [1], etc.
    .replace(/\[\*\]/g, '') // Remove [*]
    .replace(/\.where\([^)]+\)/g, ''); // Remove .where(...) clauses

  const segments = cleanPath.split('.');
  let result = '';

  // Track which segments we've processed
  let segmentIndex = 0;

  for (const layer of config.layers) {
    // Find the segment in the path
    const layerSegmentIndex = segments.indexOf(layer.segment, segmentIndex);
    
    if (layerSegmentIndex === -1) {
      // Segment not found, skip this layer
      continue;
    }

    // Add all segments up to and including this array segment
    const segmentsToAdd = segments.slice(segmentIndex, layerSegmentIndex + 1);
    
    if (result) {
      result += '.';
    }
    result += segmentsToAdd.join('.');

    // Apply refinement based on mode
    switch (layer.mode) {
      case 'first':
      case 'all':
        // Implicit traversal - no modification to path
        // FHIRPath automatically traverses collections
        break;
      
      case 'index':
        const idx = layer.indexValue ?? 0;
        result += `[${idx}]`;
        break;
      
      case 'filter':
        if (layer.filterCondition) {
          const { property, operator, value } = layer.filterCondition;
          if (operator === 'equals') {
            result += `.where(${property} = '${value}')`;
          } else if (operator === 'contains') {
            result += `.where(${property}.contains('${value}'))`;
          }
        }
        break;
    }

    segmentIndex = layerSegmentIndex + 1;
  }

  // Add any remaining segments
  if (segmentIndex < segments.length) {
    if (result) {
      result += '.';
    }
    result += segments.slice(segmentIndex).join('.');
  }

  return result;
}

/**
 * Generate human-readable intent description for nested array refinement
 * 
 * FHIRPath-correct intent examples:
 * - "Applies to line values across all address elements"
 * - "Applies to line values of address[0]"
 * - "Applies to line values of addresses matching filter"
 * 
 * @param config - Nested array refinement config
 * @returns Human-readable description
 */
export function generateNestedArrayIntent(config: NestedArrayRefinementConfig): string {
  if (config.layers.length === 0) {
    return 'No refinement applied';
  }

  const descriptions: string[] = [];

  for (let i = config.layers.length - 1; i >= 0; i--) {
    const layer = config.layers[i];
    const isChildLayer = i === config.layers.length - 1;

    let desc = '';

    switch (layer.mode) {
      case 'first':
      case 'all':
        // Implicit traversal - use language that reflects this
        desc = isChildLayer 
          ? `${layer.segment} values across all elements` 
          : `all ${layer.segment} elements`;
        break;
      
      case 'index':
        const idx = layer.indexValue ?? 0;
        desc = `${layer.segment}[${idx}]`;
        break;
      
      case 'filter':
        if (layer.filterCondition) {
          const { property, operator, value } = layer.filterCondition;
          if (operator === 'equals') {
            desc = `${layer.segment} where ${property}='${value}'`;
          } else if (operator === 'contains') {
            desc = `${layer.segment} where ${property} contains '${value}'`;
          }
        } else {
          desc = `${layer.segment} values across all elements`;
        }
        break;
    }

    descriptions.push(desc);
  }

  // Build final sentence
  if (descriptions.length === 1) {
    return `Applies to ${descriptions[0]}`;
  }

  // Reverse to get child-to-parent order for natural reading
  const childDesc = descriptions[0];
  const parentDescs = descriptions.slice(1);

  if (parentDescs.length === 0) {
    return `Applies to ${childDesc}`;
  }

  return `Applies to ${childDesc} of ${parentDescs.join(' of ')}`;
}

/**
 * Helper: Get ordinal string (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
