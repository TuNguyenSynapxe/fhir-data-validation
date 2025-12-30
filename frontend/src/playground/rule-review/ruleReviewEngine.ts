/**
 * Rule Review Engine - Static Analysis for Rule Authoring Quality
 * 
 * ⚠️ CRITICAL CONSTRAINTS:
 * - Advisory-only: issues are 'info' or 'warning' level
 * - Non-blocking: does NOT prevent validation or editing
 * - Best-effort: tolerates invalid input
 * - Deterministic: same input → same output
 * - Zero dependencies on validation logic or Firely
 * 
 * This engine performs STATIC analysis only and does NOT:
 * - Execute FHIRPath expressions
 * - Validate against FHIR schemas
 * - Replace or duplicate Firely validation
 * - Block any user actions
 */

import type { Rule } from '../../types/rightPanelProps';
import type {
  RuleReviewResult,
  RuleReviewIssue,
  RuleReviewSeverity,
} from './ruleReviewTypes';
import {
  extractResourceType,
  isArrayPath,
  extractBundlePaths,
  extractBundleResourceTypes,
  getRuleSignature,
  isPathObservedInBundle,
  isInternalSchemaPath,
  isConditionalPath,
} from './ruleReviewUtils';

/**
 * Review a ruleset for authoring quality issues
 * 
 * This function is pure, deterministic, and never throws.
 * It performs best-effort analysis and returns advisory feedback only.
 * 
 * @param rules - Array of rules to review
 * @param bundleJson - Optional JSON string of FHIR Bundle for context
 * @returns RuleReviewResult with advisory issues detected
 */
export function reviewRules(
  rules: Rule[],
  bundleJson?: string
): RuleReviewResult {
  // Defensive: handle invalid input
  if (!Array.isArray(rules)) {
    console.debug('[RuleReview] Invalid rules input, returning empty result');
    return { issues: [] };
  }
  
  const issues: RuleReviewIssue[] = [];
  
  try {
    // Extract bundle context (best-effort)
    const bundlePaths = extractBundlePaths(bundleJson);
    const bundleResourceTypes = extractBundleResourceTypes(bundleJson);
    const hasBundleContext = bundlePaths.size > 0;
    
    // Parse bundle once for path observation
    let bundle: any = null;
    if (bundleJson) {
      try {
        bundle = JSON.parse(bundleJson);
      } catch (error) {
        console.debug('[RuleReview] Failed to parse bundle:', error);
      }
    }
    
    // Track rule signatures for duplicate detection
    const ruleSignatures = new Map<string, Rule[]>();
    
    // Analyze each rule
    for (const rule of rules) {
      if (!rule || !rule.id) {
        // Skip invalid rules silently
        continue;
      }
      
      // Check 1: PATH_NOT_OBSERVED (only if bundle available)
      if (bundle && rule.fieldPath && rule.resourceType) {
        const fieldPath = rule.fieldPath;
        const resourceType = rule.resourceType;
        
        // Skip observation check for internal schema paths
        const fullPath = `${resourceType}.${fieldPath}`;
        const isInternalPath = isInternalSchemaPath(fullPath);
        
        let observed = false;
        if (!isInternalPath) {
          observed = isPathObservedInBundle({
            bundle,
            resourceType,
            path: fieldPath,  // Pass fieldPath (no resource prefix)
          });
        }
        
        if (!observed) {
          // Determine the specific reason for non-observation
          let reason: 'NOT_PRESENT_IN_SAMPLE' | 'RESOURCE_NOT_PRESENT' | 'CONDITIONAL_PATH' | 'INTERNAL_SCHEMA_PATH' | 'AMBIGUOUS_ARRAY_PATH';
          let severity: 'info' | 'warning' = 'info';
          
          // Check if it's an internal schema path first
          if (isInternalSchemaPath(fullPath)) {
            reason = 'INTERNAL_SCHEMA_PATH';
            severity = 'info';
          }
          // Check if resource type is not present
          else if (resourceType && !bundleResourceTypes.has(resourceType)) {
            reason = 'RESOURCE_NOT_PRESENT';
            severity = 'info';
          }
          // Check if path is conditional
          else if (isConditionalPath(fullPath)) {
            reason = 'CONDITIONAL_PATH';
            severity = 'info';
          }
          // Check if it's an ambiguous array path
          else if (isArrayPath(fullPath) && !/\[\d+\]/.test(fullPath)) {
            reason = 'AMBIGUOUS_ARRAY_PATH';
            severity = 'warning';
          }
          // Default: not present in sample
          else {
            reason = 'NOT_PRESENT_IN_SAMPLE';
            severity = 'info';
          }
          
          issues.push({
            ruleId: rule.id,
            type: 'PATH_NOT_OBSERVED',
            severity,
            message: `Path "${fullPath}" not found in current bundle`,
            details: 'This may be expected if the path is conditional or optional. Rule will still execute at runtime.',
            reason,
            path: fullPath,
            resourceType: resourceType || undefined,
          });
        }
      }
      
      // Check 3: DUPLICATE_RULE
      const signature = getRuleSignature(rule);
      
      if (!ruleSignatures.has(signature)) {
        ruleSignatures.set(signature, []);
      }
      ruleSignatures.get(signature)!.push(rule);
      
      // Check 4: ARRAY_HANDLING_MISSING
      if (rule.fieldPath && isArrayPath(rule.fieldPath)) {
        // Check if path uses explicit array indexing or instanceScope
        const hasExplicitIndex = /\[\d+\]/.test(rule.fieldPath);
        const hasInstanceScope = rule.instanceScope && rule.instanceScope.kind !== 'all';
        
        if (!hasExplicitIndex && !hasInstanceScope) {
          issues.push({
            ruleId: rule.id,
            type: 'ARRAY_HANDLING_MISSING',
            severity: 'warning',
            message: `Field "${rule.fieldPath}" targets an array without explicit indexing or instanceScope`,
            details: 'Rule will apply to all array elements. This may be intentional, but consider using instanceScope (first/filter) to target specific instances.',
            reason: 'ARRAY_WITHOUT_INDEX',
            path: rule.fieldPath,
          });
        }
      }
    }
    
    // Detect duplicates
    Array.from(ruleSignatures.entries()).forEach(([_signature, duplicateRules]) => {
      if (duplicateRules.length > 1) {
        // All duplicate rules get flagged
        for (const rule of duplicateRules) {
          const otherIds = duplicateRules
            .filter(r => r.id !== rule.id)
            .map(r => r.id)
            .join(', ');
          
          issues.push({
            ruleId: rule.id,
            type: 'DUPLICATE_RULE',
            severity: 'warning',
            message: `Rule appears to be duplicated`,
            details: `Similar rules found: ${otherIds}. Consider consolidating if they serve the same purpose.`,
            reason: 'DUPLICATE_DETECTED',
            path: rule.path,
          });
        }
      }
    });
    
    return {
      issues,
      metadata: {
        reviewedAt: new Date().toISOString(),
        rulesAnalyzed: rules.filter(r => r && r.id).length,
        hadBundle: hasBundleContext,
      },
    };
    
  } catch (error) {
    // Defensive: never throw, log and return empty result
    console.error('[RuleReview] Unexpected error during review:', error);
    return {
      issues: [],
      metadata: {
        reviewedAt: new Date().toISOString(),
        rulesAnalyzed: 0,
        hadBundle: false,
      },
    };
  }
}

/**
 * Filter review issues by severity
 * Utility for consumers who want to handle different severities separately
 */
export function filterIssuesBySeverity(
  result: RuleReviewResult,
  severity: RuleReviewSeverity
): RuleReviewIssue[] {
  return result.issues.filter(issue => issue.severity === severity);
}

/**
 * Get issue count grouped by severity
 * Utility for displaying summary statistics
 */
export function getIssueCounts(result: RuleReviewResult): {
  info: number;
  warning: number;
  total: number;
} {
  const info = result.issues.filter(i => i.severity === 'info').length;
  const warning = result.issues.filter(i => i.severity === 'warning').length;
  
  return {
    info,
    warning,
    total: info + warning,
  };
}
