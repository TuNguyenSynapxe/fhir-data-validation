import httpClient from './httpClient';

/**
 * Phase 9.4: Bundle Rule Management API Client
 * CRUD operations for bundle-scoped manual rules.
 */

export type RuleType = 'ProfileDerived' | 'FhirPathCustom' | 'Other';
export type RuleProvenance = 'ImportedGenerated' | 'ManualCustom';

export interface BundleRule {
  ruleId: string;
  ruleType: RuleType;
  provenance: RuleProvenance;
  title: string;
  description?: string;
  fhirPathExpression: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBundleRuleRequest {
  title: string;
  description?: string;
  fhirPathExpression: string;
  isEnabled?: boolean;
}

export interface UpdateBundleRuleRequest {
  title: string;
  description?: string;
  fhirPathExpression: string;
  isEnabled: boolean;
}

export interface CreateRuleResponse {
  ruleId: string;
  message: string;
}

/**
 * Get all rules for a specific bundle (imported + manual).
 * GET /api/v2/projects/{projectId}/bundles/{bundleId}/rules
 */
export async function getBundleRules(
  projectId: string,
  bundleId: string
): Promise<BundleRule[]> {
  const response = await httpClient.get<BundleRule[]>(
    `/api/v2/projects/${projectId}/bundles/${bundleId}/rules`
  );
  return response.data;
}

/**
 * Create a new bundle-scoped manual rule.
 * POST /api/v2/projects/{projectId}/bundles/{bundleId}/rules
 */
export async function createBundleRule(
  projectId: string,
  bundleId: string,
  request: CreateBundleRuleRequest
): Promise<CreateRuleResponse> {
  const response = await httpClient.post<CreateRuleResponse>(
    `/api/v2/projects/${projectId}/bundles/${bundleId}/rules`,
    request
  );
  return response.data;
}

/**
 * Update an existing bundle-scoped manual rule.
 * PUT /api/v2/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}
 * 
 * @throws 403 if attempting to edit an ImportedGenerated rule
 */
export async function updateBundleRule(
  projectId: string,
  bundleId: string,
  ruleId: string,
  request: UpdateBundleRuleRequest
): Promise<void> {
  await httpClient.put(
    `/api/v2/projects/${projectId}/bundles/${bundleId}/rules/${ruleId}`,
    request
  );
}

/**
 * Delete a bundle-scoped manual rule.
 * DELETE /api/v2/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}
 * 
 * @throws 403 if attempting to delete an ImportedGenerated rule
 */
export async function deleteBundleRule(
  projectId: string,
  bundleId: string,
  ruleId: string
): Promise<void> {
  await httpClient.delete(
    `/api/v2/projects/${projectId}/bundles/${bundleId}/rules/${ruleId}`
  );
}
