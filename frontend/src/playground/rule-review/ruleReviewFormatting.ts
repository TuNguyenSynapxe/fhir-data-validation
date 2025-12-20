/**
 * Frontend Message Formatter for Rule Review Issues
 * 
 * This module provides UI-friendly copy for backend-generated reason codes.
 * 
 * RESPONSIBILITY SPLIT:
 * - Backend (ruleReviewEngine): Determines FACTS via reason codes
 * - Frontend (this file): Determines WORDING for users
 * 
 * ⚠️ NEVER display raw backend messages directly in UI
 */

import type { RuleReviewIssue } from './ruleReviewTypes';

/**
 * Format a Rule Review issue for display in the UI
 * 
 * Maps backend reason codes to user-friendly copy.
 * Always use this function instead of displaying raw backend messages.
 * 
 * @param issue - Rule review issue with reason code
 * @returns User-friendly message with context
 */
export function formatRuleReviewMessage(issue: RuleReviewIssue): string {
  const { reason, type, resourceType } = issue;
  const path = issue.path;
  
  // PATH_NOT_OBSERVED check
  if (type === 'PATH_NOT_OBSERVED' && reason) {
    switch (reason) {
      case 'NOT_PRESENT_IN_SAMPLE':
        return `Path '${path || 'unknown'}' was not observed in the current bundle. This may be expected if the element is optional or conditionally present.`;
      
      case 'RESOURCE_NOT_PRESENT':
        return `The resource '${resourceType || 'unknown'}' is not present in the current bundle. This rule will apply when the resource exists at runtime.`;
      
      case 'CONDITIONAL_PATH':
        return `Path '${path || 'unknown'}' is conditionally present in FHIR. The rule will apply when this element exists at runtime.`;
      
      case 'INTERNAL_SCHEMA_PATH':
        return `This rule targets an internal FHIR element that is rarely present in instances. The rule will still execute when the element exists at runtime.`;
      
      case 'AMBIGUOUS_ARRAY_PATH':
        return `This rule targets an array element without explicit indexing. Consider specifying how the array should be evaluated (e.g., using [0] for first element or omit index to apply to all).`;
      
      default:
        return `Path '${path || 'unknown'}' was not found in the current bundle. This may be expected for optional elements.`;
    }
  }
  
  // ARRAY_HANDLING_MISSING
  if (type === 'ARRAY_HANDLING_MISSING' && reason === 'ARRAY_WITHOUT_INDEX') {
    return `This rule targets an array element without explicit indexing. Consider specifying how the array should be evaluated (e.g., '${path}[0]' for first element).`;
  }
  
  // DUPLICATE_RULE
  if (type === 'DUPLICATE_RULE' && reason === 'DUPLICATE_DETECTED') {
    return `This rule appears to be duplicated with similar rules. Consider consolidating them if they serve the same purpose.`;
  }
  
  // RESOURCE_NOT_PRESENT (standalone type)
  if (type === 'RESOURCE_NOT_PRESENT') {
    return `The resource '${resourceType || 'unknown'}' is not present in the current bundle. This rule will apply when the resource exists.`;
  }
  
  // Fallback: use raw message (should rarely happen with proper reason codes)
  return issue.message;
}

/**
 * Get a short title for the issue (for collapsed views)
 */
export function formatRuleReviewTitle(issue: RuleReviewIssue): string {
  const { reason, type } = issue;
  
  if (type === 'PATH_NOT_OBSERVED' && reason) {
    switch (reason) {
      case 'NOT_PRESENT_IN_SAMPLE':
        return 'Path not in sample';
      case 'RESOURCE_NOT_PRESENT':
        return 'Resource not in bundle';
      case 'CONDITIONAL_PATH':
        return 'Conditional path';
      case 'INTERNAL_SCHEMA_PATH':
        return 'Internal schema element';
      case 'AMBIGUOUS_ARRAY_PATH':
        return 'Array without indexing';
      default:
        return 'Path not observed';
    }
  }
  
  if (type === 'ARRAY_HANDLING_MISSING') {
    return 'Array handling';
  }
  
  if (type === 'DUPLICATE_RULE') {
    return 'Duplicate rule';
  }
  
  return type.replace(/_/g, ' ').toLowerCase();
}

/**
 * Determine if an issue should be collapsed by default in long lists
 * 
 * Internal schema path issues are less actionable and can be collapsed.
 */
export function shouldCollapseByDefault(issue: RuleReviewIssue): boolean {
  return (
    issue.type === 'PATH_NOT_OBSERVED' &&
    issue.reason === 'INTERNAL_SCHEMA_PATH'
  );
}

/**
 * Get an actionable suggestion for the issue (if applicable)
 */
export function formatRuleReviewSuggestion(issue: RuleReviewIssue): string | null {
  const { reason, path } = issue;
  
  if (reason === 'AMBIGUOUS_ARRAY_PATH' && path) {
    // Try to suggest indexed version
    const indexed = `${path}[0]`;
    return `Try using '${indexed}' to target the first element, or keep as-is to apply to all elements.`;
  }
  
  if (reason === 'DUPLICATE_DETECTED') {
    return 'Review rules with similar paths and messages to identify if consolidation is needed.';
  }
  
  if (reason === 'INTERNAL_SCHEMA_PATH') {
    return 'This is informational only. Internal schema elements are valid but uncommon in production data.';
  }
  
  return null;
}
