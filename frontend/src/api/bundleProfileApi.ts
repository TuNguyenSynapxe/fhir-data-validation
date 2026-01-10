import httpClient from './httpClient';
import type {
  BundleProfileStateDto,
  SetBundleProfileRequest,
} from '../types/bundleProfile';

/**
 * Phase 8.3 Bundle Profile Resolution API Client
 * 
 * Endpoints:
 * - GET /api/v2/projects/{projectId}/bundles/{bundleId}/profile
 * - POST /api/v2/projects/{projectId}/bundles/{bundleId}/profile
 */

/**
 * Get Bundle profile resolution state.
 * Returns RESOLVED, UNRESOLVED, or UNPROFILED.
 * 
 * GET /api/v2/projects/{projectId}/bundles/{bundleId}/profile
 */
export async function getBundleProfileState(
  projectId: string,
  bundleId: string
): Promise<BundleProfileStateDto> {
  const response = await httpClient.get<BundleProfileStateDto>(
    `/api/v2/projects/${projectId}/bundles/${bundleId}/profile`
  );
  return response.data;
}

/**
 * Set Bundle profile (manual override).
 * Pass null structureDefinitionId to mark as UNPROFILED.
 * 
 * POST /api/v2/projects/{projectId}/bundles/{bundleId}/profile
 */
export async function setBundleProfile(
  projectId: string,
  bundleId: string,
  request: SetBundleProfileRequest
): Promise<BundleProfileStateDto> {
  const response = await httpClient.post<BundleProfileStateDto>(
    `/api/v2/projects/${projectId}/bundles/${bundleId}/profile`,
    request
  );
  return response.data;
}
