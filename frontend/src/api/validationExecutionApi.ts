import httpClient from './httpClient';
import type { ValidationIssue } from '../validation/model/ValidationIssue';

/**
 * Phase 8.2 Validation Execution API - Admin validation execution endpoint
 */

export type PolicyMode = 'Strict' | 'Permissive';

export const PolicyMode = {
  Strict: 'Strict' as PolicyMode,
  Permissive: 'Permissive' as PolicyMode,
};

export interface ExecuteValidationRequest {
  policyMode?: PolicyMode;
}

export interface ValidationSummaryDto {
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  hasAmbiguity: boolean;
  policyMode: PolicyMode;
}

export interface ExecuteValidationResponse {
  projectId: string;
  bundleId: string;
  policyMode: PolicyMode;
  issues: ValidationIssue[];
  summary: ValidationSummaryDto;
}

/**
 * Execute validation for a project bundle.
 * POST /api/v2/projects/{projectId}/bundles/{bundleId}/validate
 */
export async function executeValidation(
  projectId: string,
  bundleId: string,
  request?: ExecuteValidationRequest
): Promise<ExecuteValidationResponse> {
  const response = await httpClient.post<ExecuteValidationResponse>(
    `/api/v2/projects/${projectId}/bundles/${bundleId}/validate`,
    request || {}
  );
  return response.data;
}
