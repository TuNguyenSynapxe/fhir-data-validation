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
 * 
 * RULE: System-generated filters MUST use flat boolean expressions.
 * NO .exists() patterns allowed. Rely on FHIRPath implicit collection evaluation.
 * Manual filters (custom type) are treated as opaque and not rewritten.
 */
function composeFilterExpression(filter: FilterSpec): string {
  switch (filter.type) {
    case 'code':
      // Simple code filter: code.coding.code = 'X'
      return `where(code.coding.code='${escapeString(filter.code)}')`;
    
    case 'systemCode':
      // System + Code filter: flat boolean expression
      // Relies on FHIRPath implicit collection semantics
      return `where(code.coding.system='${escapeString(filter.system)}' and code.coding.code='${escapeString(filter.code)}')`;
    
    case 'identifier':
      // Identifier filter: flat boolean expression
      return `where(identifier.system='${escapeString(filter.system)}' and identifier.value='${escapeString(filter.value)}')`;
    
    case 'custom':
      // Manual filter: treated as opaque, no rewriting
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
      // Manual filters may include .exists() - this is allowed
      break;
  }
  
  return { valid: true };
}

/**
 * Format FHIRPath expression for display (UX only)
 * 
 * Adds line breaks and indentation for readability.
 * Does NOT modify the semantic meaning of the expression.
 * 
 * Example:
 * Input:  "Observation.where(code.coding.system='X' and code.coding.code='Y')"
 * Output: "Observation.where(\n  code.coding.system='X'\n  and\n  code.coding.code='Y'\n)"
 */
export function formatFhirPathForDisplay(fhirPath: string): string {
  // Check if this is a where() expression with multiple conditions
  const whereMatch = fhirPath.match(/^(.+)\.where\((.+)\)$/);
  
  if (!whereMatch) {
    return fhirPath;
  }
  
  const [, basePath, condition] = whereMatch;
  
  // Check if condition contains 'and' or 'or'
  if (!condition.includes(' and ') && !condition.includes(' or ')) {
    return fhirPath;
  }
  
  // Format multi-line
  const formattedCondition = condition
    .replace(/ and /g, '\n  and\n  ')
    .replace(/ or /g, '\n  or\n  ');
  
  return `${basePath}.where(\n  ${formattedCondition}\n)`;
}

/**
 * Convert frontend InstanceScope to backend format
 * 
 * Backend expects:
 * - { kind: 'all' }
 * - { kind: 'first' }
 * - { kind: 'filter', condition: string }
 * 
 * Frontend has:
 * - { kind: 'all' }
 * - { kind: 'first' }
 * - { kind: 'filter', filter: FilterSpec }
 * 
 * This function extracts the FHIRPath condition string from FilterSpec
 * for backend consumption.
 */
export function convertToBackendInstanceScope(instanceScope: InstanceScope): any {
  if (instanceScope.kind === 'all' || instanceScope.kind === 'first') {
    return { kind: instanceScope.kind };
  }
  
  if (instanceScope.kind === 'filter') {
    // Extract the where() condition from the filter
    const filter = instanceScope.filter;
    let condition: string;
    
    switch (filter.type) {
      case 'code':
        condition = `code.coding.code='${escapeString(filter.code)}'`;
        break;
      
      case 'systemCode':
        condition = `code.coding.system='${escapeString(filter.system)}' and code.coding.code='${escapeString(filter.code)}'`;
        break;
      
      case 'identifier':
        condition = `identifier.system='${escapeString(filter.system)}' and identifier.value='${escapeString(filter.value)}'`;
        break;
      
      case 'custom':
        // Custom filter already contains the full where(...) expression
        // Extract just the condition inside where(...)
        const match = filter.fhirPath.match(/^where\((.+)\)$/);
        condition = match ? match[1] : filter.fhirPath;
        break;
      
      default:
        condition = 'true';
    }
    
    return {
      kind: 'filter',
      condition,
    };
  }
  
  return { kind: 'all' };
}
