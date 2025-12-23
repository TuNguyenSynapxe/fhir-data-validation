/**
 * InstanceScope Utilities
 * 
 * Helpers for composing FHIRPath expressions from instance scope specifications.
 * Used by rule builders to generate final validation paths.
 */

import type { InstanceScope, FilterSpec, InstanceScopeSummary } from './InstanceScope.types';

/**
 * Compose instance-scoped FHIRPath from resourceType and scope
 * 
 * Examples:
 * - first → Patient[0]
 * - all → Patient[*]
 * - filter(code) → Patient.where(code.coding.code='HS')
 */
export function composeInstanceScopedPath(
  resourceType: string,
  instanceScope: InstanceScope
): string {
  switch (instanceScope.kind) {
    case 'first':
      return `${resourceType}[0]`;
    
    case 'all':
      return `${resourceType}[*]`;
    
    case 'filter':
      return `${resourceType}.${composeFilterExpression(instanceScope.filter)}`;
    
    default:
      return `${resourceType}[*]`;
  }
}

/**
 * Compose where() filter expression from FilterSpec
 */
function composeFilterExpression(filter: FilterSpec): string {
  switch (filter.type) {
    case 'code':
      return `where(code.coding.code='${escapeString(filter.code)}')`;
    
    case 'systemCode':
      return `where(code.coding.where(system='${escapeString(filter.system)}' and code='${escapeString(filter.code)}').exists())`;
    
    case 'identifier':
      return `where(identifier.where(system='${escapeString(filter.system)}' and value='${escapeString(filter.value)}').exists())`;
    
    case 'custom':
      return filter.fhirPath;
    
    default:
      return 'where(true)';
  }
}

/**
 * Generate human-readable summary for instance scope
 */
export function getInstanceScopeSummary(
  resourceType: string,
  instanceScope: InstanceScope
): InstanceScopeSummary {
  const fhirPath = composeInstanceScopedPath(resourceType, instanceScope);
  
  let text: string;
  
  switch (instanceScope.kind) {
    case 'first':
      text = `First ${resourceType} only`;
      break;
    
    case 'all':
      text = `All ${resourceType} resources`;
      break;
    
    case 'filter':
      text = getFilterSummaryText(resourceType, instanceScope.filter);
      break;
    
    default:
      text = `All ${resourceType} resources`;
  }
  
  return { text, fhirPath };
}

/**
 * Generate human-readable text for filter
 */
function getFilterSummaryText(resourceType: string, filter: FilterSpec): string {
  switch (filter.type) {
    case 'code':
      return `${resourceType} filtered by code = ${filter.code}`;
    
    case 'systemCode':
      return `${resourceType} filtered by ${filter.system}#${filter.code}`;
    
    case 'identifier':
      return `${resourceType} filtered by identifier ${filter.system}|${filter.value}`;
    
    case 'custom':
      return `${resourceType} with custom filter`;
    
    default:
      return `All ${resourceType} resources`;
  }
}

/**
 * Escape string for FHIRPath expression
 */
function escapeString(value: string): string {
  return value.replace(/'/g, "\\'");
}

/**
 * Validate filter spec against resource type
 */
export function validateFilterSpec(
  _resourceType: string,
  filter: FilterSpec
): { valid: boolean; error?: string } {
  switch (filter.type) {
    case 'code':
      if (!filter.code) {
        return { valid: false, error: 'Code value is required' };
      }
      break;
    
    case 'systemCode':
      if (!filter.system || !filter.code) {
        return { valid: false, error: 'System and code are required' };
      }
      break;
    
    case 'identifier':
      if (!filter.system || !filter.value) {
        return { valid: false, error: 'System and value are required' };
      }
      break;
    
    case 'custom':
      if (!filter.fhirPath) {
        return { valid: false, error: 'FHIRPath expression is required' };
      }
      // Basic validation: must start with "where("
      if (!filter.fhirPath.startsWith('where(')) {
        return { valid: false, error: 'Filter must start with where(...)' };
      }
      break;
  }
  
  return { valid: true };
}
