import httpClient from './httpClient';
import type {
  ProjectDetailsDto,
  ProjectBundleDto,
  ProjectRuleDto,
} from '../types/projectImport';

/**
 * Phase 7.4 Backend APIs - Read-only project query endpoints
 */

/**
 * Get project details with summary counts.
 * GET /api/v2/projects/{id}
 */
export async function getProjectDetails(projectId: string): Promise<ProjectDetailsDto> {
  const response = await httpClient.get<ProjectDetailsDto>(`/api/v2/projects/${projectId}`);
  return response.data;
}

/**
 * Get all bundles in a project.
 * GET /api/v2/projects/{id}/bundles
 */
export async function getProjectBundles(projectId: string): Promise<ProjectBundleDto[]> {
  const response = await httpClient.get<ProjectBundleDto[]>(`/api/v2/projects/${projectId}/bundles`);
  return response.data;
}

/**
 * Get all rules in a project.
 * GET /api/v2/projects/{id}/rules
 */
export async function getProjectRules(projectId: string): Promise<ProjectRuleDto[]> {
  const response = await httpClient.get<ProjectRuleDto[]>(`/api/v2/projects/${projectId}/rules`);
  return response.data;
}
