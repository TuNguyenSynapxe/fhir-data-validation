/**
 * Helper utilities for Rules UI
 * Frontend-only heuristics for rule classification and display
 */

import type { Rule } from '../../../types/rightPanelProps';

export type AdvisoryIconType = 'info' | 'warning' | 'internal';

/**
 * Detect if a rule is "internal" (schema plumbing vs business logic)
 * Uses path-based heuristics to identify advanced/technical rules
 */
export function isInternalRule(rule: Rule): boolean {
  const path = (rule.path || '').toLowerCase();
  
  // Check for internal FHIR structural elements
  const hasInternalKeywords = 
    path.includes('extension') ||
    path.includes('modifierextension') ||
    path.includes('id.id') ||
    path.includes('.value') && path.includes('[') || // indexed value accessors
    path.includes('.extension[');
  
  if (hasInternalKeywords) {
    return true;
  }
  
  // Check path depth with internal terms
  const segments = path.split('.');
  const depth = segments.length;
  
  if (depth >= 5) {
    const hasDeepInternalTerms = segments.some(seg => 
      seg.includes('id') || 
      seg.includes('extension') || 
      seg.includes('value')
    );
    if (hasDeepInternalTerms) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate human-readable rule summary from rule type and params
 * Canonical short descriptions for collapsed view
 */
export function getRuleSummary(rule: Rule): string {
  const { type, params } = rule;
  
  switch (type) {
    case 'Required':
    case 'required':
      return 'Required';
      
    case 'FixedValue':
    case 'fixedValue':
      if (params?.value !== undefined) {
        const val = typeof params.value === 'string' 
          ? `"${params.value}"` 
          : String(params.value);
        return `Fixed value = ${val}`;
      }
      return 'Fixed value';
      
    case 'ArrayLength':
    case 'arrayLength':
      if (params?.min !== undefined && params?.max !== undefined) {
        return `Length ${params.min}–${params.max}`;
      }
      if (params?.min !== undefined) {
        return `Length ≥ ${params.min}`;
      }
      if (params?.max !== undefined) {
        return `Length ≤ ${params.max}`;
      }
      return 'Array length';
      
    case 'CodeSystem':
    case 'codeSystem':
      if (params?.system) {
        const systemName = params.system.split('/').pop() || params.system;
        return `System = ${systemName}`;
      }
      return 'Code system';
      
    case 'AllowedCodes':
    case 'allowedCodes':
      if (params?.codes && Array.isArray(params.codes)) {
        const codeList = params.codes.slice(0, 3).join(', ');
        const more = params.codes.length > 3 ? ', ...' : '';
        return `Allowed: ${codeList}${more}`;
      }
      return 'Allowed codes';
      
    case 'Pattern':
    case 'pattern':
      if (params?.pattern) {
        return `Pattern: ${params.pattern}`;
      }
      return 'Pattern match';
      
    case 'FhirPath':
    case 'fhirPath':
      return 'FHIRPath constraint';
      
    default:
      return type || 'Custom rule';
  }
}

/**
 * Get advisory icon type for rule using priority: warning > internal > info
 * Returns null if no advisory icon should be shown
 */
export function getAdvisoryIconType(rule: Rule, hasAdvisory: boolean, advisoryHasWarnings: boolean): AdvisoryIconType | null {
  // Priority 1: Warning (highest priority)
  if (hasAdvisory && advisoryHasWarnings) {
    return 'warning';
  }
  
  // Priority 2: Internal
  if (isInternalRule(rule)) {
    return 'internal';
  }
  
  // Priority 3: Info
  if (hasAdvisory) {
    return 'info';
  }
  
  return null;
}

/**
 * Get tooltip text for advisory icon
 */
export function getAdvisoryIconTooltip(iconType: AdvisoryIconType): string {
  switch (iconType) {
    case 'warning':
      return 'Potential rule risk';
    case 'internal':
      return 'Internal FHIR element (rarely present in instances)';
    case 'info':
      return 'Non-blocking advisory';
  }
}
