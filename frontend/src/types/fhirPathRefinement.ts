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
      // Default mode - no modification
      return basePath;

    case 'all':
      // Apply [*] to the nearest array segment
      // Strategy: Insert [*] after the first segment before any dot
      return applyAllElements(basePath);

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
 * Apply [*] to the nearest array segment
 * Example: "identifier.value" → "identifier[*].value"
 * Example: "name[0].family" → "name[*].family"
 */
function applyAllElements(basePath: string): string {
  const segments = basePath.split('.');
  if (segments.length === 0) return basePath;

  // Apply [*] to the first segment (most common array location)
  let firstSegment = segments[0];
  const restSegments = segments.slice(1);

  // Remove existing [n] index if present and replace with [*]
  firstSegment = firstSegment.replace(/\[\d+\]/, '[*]');
  
  // If no index was present, add [*]
  if (!firstSegment.includes('[*]')) {
    firstSegment = `${firstSegment}[*]`;
  }

  if (restSegments.length === 0) {
    return firstSegment;
  }

  return `${firstSegment}.${restSegments.join('.')}`;
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
