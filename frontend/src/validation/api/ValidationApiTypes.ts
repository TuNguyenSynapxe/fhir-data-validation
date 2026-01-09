/**
 * Backend API Types
 * 
 * These types mirror the backend ValidationResult contract exactly.
 * DO NOT modify to match UI preferences - this is the source of truth.
 */

export interface ValidationIssueDto {
  source: 'StructureDefinition' | 'FHIRPath' | 'Reference' | 'Syntax';
  severity: 'error' | 'warning' | 'info';
  errorCode: string;
  path: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResultDto {
  issues: ValidationIssueDto[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalInfo: number;
    hasAmbiguity: boolean;
    policyMode: 'strict' | 'permissive';
  };
}

/**
 * API Request/Response types
 */

export interface ValidateProjectRequest {
  projectId: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  details?: unknown;
}
