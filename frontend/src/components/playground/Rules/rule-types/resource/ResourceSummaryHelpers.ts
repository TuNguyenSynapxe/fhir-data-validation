/**
 * Resource Requirement Summary Helpers
 * 
 * Generate human-readable summaries for Resource rule requirements.
 */

import type { ResourceRequirement, WhereFilter } from './ResourceConfigSection';

/**
 * Generate a filter summary for display
 */
export function getFilterSummary(filter: WhereFilter): string {
  const { path, op, value } = filter;
  
  switch (op) {
    case '=':
      return `${path} = ${value}`;
    case '!=':
      return `${path} ≠ ${value}`;
    case 'contains':
      return `${path} contains "${value}"`;
    case 'in':
      return `${path} in [${value}]`;
    default:
      return `${path} ${op} ${value}`;
  }
}

/**
 * Generate a complete requirement summary for display
 */
export function getRequirementSummary(req: ResourceRequirement): string {
  const quantityText = req.mode === 'exact'
    ? `Exactly ${req.count}`
    : `At least ${req.count}`;
    
  const resourceText = `${req.resourceType}`;
  
  if (!req.where || req.where.length === 0) {
    return `${quantityText} ${resourceText}`;
  }
  
  const filterCount = req.where.length;
  const firstFilter = getFilterSummary(req.where[0]);
  
  if (filterCount === 1) {
    return `${quantityText} ${resourceText} · ${firstFilter}`;
  }
  
  return `${quantityText} ${resourceText} · ${filterCount} filters`;
}
