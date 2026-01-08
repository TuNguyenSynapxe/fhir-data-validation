/**
 * Validation transparency module
 * 
 * Phase 5: Frontend validation transparency
 * 
 * This module provides UI rendering and explanation for validation results.
 * It does NOT perform validation - that's the backend's job.
 * 
 * Exports:
 * - models: TypeScript interfaces for validation results
 * - explainers: Deterministic explanation functions
 * 
 * Future phases will add:
 * - components: UI components for rendering validation results
 * - views: Page-level views composing components
 * 
 * Legacy exports (Phase 6 - will be deprecated):
 */

// Phase 5.1 - Models and explainers
export * from './model';
export * from './explainers';

// Legacy Phase 6 exports (deprecated - use Phase 5.1 exports instead)
export { explainError as legacyExplainError, type ExplainableError } from "./explainError";
export {
  errorExplanationRegistry,
  getFallbackExplanation,
  type ErrorExplanation,
} from "./errorExplanationRegistry";
