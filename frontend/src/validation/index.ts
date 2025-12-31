/**
 * Phase 6 - Validation Error Explanation Registry
 * 
 * Central export for validation error explanation functionality
 */

export { explainError, type ValidationError } from "./explainError";
export {
  errorExplanationRegistry,
  getFallbackExplanation,
  type ErrorExplanation,
  type ExplanationFn,
} from "./errorExplanationRegistry";
