/**
 * useRuleReview Hook - React integration for Rule Review module
 * 
 * ⚠️ ADVISORY ONLY: This hook provides non-blocking feedback
 * - Never blocks rendering
 * - Never throws errors
 * - Returns empty issues if rules list is empty
 */

import { useMemo } from 'react';
import { reviewRules } from '../ruleReviewEngine';
import type { RuleReviewResult } from '../ruleReviewTypes';
import type { Rule } from '../../../types/rightPanelProps';

export interface UseRuleReviewParams {
  /** Rules to review */
  rules: Rule[];
  
  /** Optional FHIR Bundle for context-aware checks */
  bundle?: any; // FhirBundle type - using any to avoid import dependencies
}

/**
 * React hook for reviewing rules with memoization
 * 
 * Returns advisory issues detected in the ruleset.
 * All issues are non-blocking (info or warning level only).
 * 
 * @example
 * const result = useRuleReview({ rules, bundle });
 * 
 * if (result.issues.length > 0) {
 *   // Display advisory feedback (never block actions)
 * }
 */
export function useRuleReview(params: UseRuleReviewParams): RuleReviewResult {
  const { rules, bundle } = params;
  
  // Memoize review to avoid re-running on every render
  const result = useMemo(() => {
    // Return empty result if no rules
    if (!rules || rules.length === 0) {
      return {
        issues: [],
        metadata: {
          reviewedAt: new Date().toISOString(),
          rulesAnalyzed: 0,
          hadBundle: false,
        },
      };
    }
    
    try {
      // Convert bundle to JSON string if it's an object
      const bundleJson = bundle
        ? typeof bundle === 'string'
          ? bundle
          : JSON.stringify(bundle)
        : undefined;
      
      // Run review (never throws due to defensive implementation)
      return reviewRules(rules, bundleJson);
      
    } catch (error) {
      // Defensive: should never reach here due to reviewRules implementation
      // but handle gracefully just in case
      console.error('[useRuleReview] Unexpected error:', error);
      return {
        issues: [],
        metadata: {
          reviewedAt: new Date().toISOString(),
          rulesAnalyzed: rules.length,
          hadBundle: !!bundle,
        },
      };
    }
  }, [rules, bundle]);
  
  return result;
}
