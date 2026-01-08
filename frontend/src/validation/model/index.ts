/**
 * Validation models
 * 
 * Type-safe interfaces for validation results from the backend.
 * These types define the contract between backend and frontend.
 */

export type { ValidationSource } from './ValidationSource';
export type { ValidationSeverity } from './ValidationSeverity';
export type { 
  ValidationIssue, 
  ValidationIssueDetails 
} from './ValidationIssue';
export type { 
  ValidationResult, 
  ValidationResultSummary 
} from './ValidationResult';
