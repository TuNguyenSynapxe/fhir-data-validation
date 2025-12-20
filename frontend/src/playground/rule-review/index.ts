/**
 * Rule Review Module - Advisory Static Analysis for Rule Authoring
 * 
 * ⚠️ CRITICAL: This module is ADVISORY-ONLY
 * - Does NOT block validation
 * - Does NOT block rule editing
 * - Does NOT replace Firely validation
 * - Does NOT act as a gatekeeper
 * 
 * Usage:
 * 
 * import { reviewRules } from './rule-review';
 * 
 * const result = reviewRules(rules, bundleJson);
 * // Display result.issues as informational feedback only
 * 
 * Future Integration (TODO):
 * - Add useRuleReview hook for Rules UI
 * - Add optional inline issue display in rule editor
 * - Add optional summary badge in Rules tab
 * - All UI elements must be non-blocking and dismissible
 */

// Core engine
export { reviewRules, filterIssuesBySeverity, getIssueCounts } from './ruleReviewEngine';

// Types
export type {
  RuleReviewSeverity,
  RuleReviewIssueType,
  RuleReviewIssue,
  RuleReviewResult,
} from './ruleReviewTypes';

// Utilities (re-exported for advanced use cases)
export {
  normalizePath,
  extractResourceType,
  isArrayPath,
  extractBundlePaths,
  extractBundleResourceTypes,
  getRuleSignature,
  isPathObserved,
  isPathObservedInBundle,
  isInternalSchemaPath,
  isConditionalPath,
} from './ruleReviewUtils';

// Frontend formatting utilities
export {
  formatRuleReviewMessage,
  formatRuleReviewTitle,
  formatRuleReviewSuggestion,
  shouldCollapseByDefault,
} from './ruleReviewFormatting';

// TODO: Add React hook for UI integration
// export function useRuleReview(
//   rules: Rule[],
//   bundleJson?: string,
//   options?: { enabled?: boolean; debounceMs?: number }
// ): RuleReviewResult {
//   // Implementation pending
//   // Should debounce, respect enabled flag, and never block
// }
