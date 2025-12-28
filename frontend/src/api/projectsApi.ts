import httpClient from './httpClient';
import type { ProjectMetadata, ProjectDetail } from '../types/project';
import type { ValidationResult } from '../types/validation';
import type { RuleReviewResponse } from '../types/governance';

export async function getProjects(): Promise<ProjectMetadata[]> {
  const response = await httpClient.get<ProjectMetadata[]>('/api/projects');
  return response.data;
}

export async function createProject(
  name: string,
  description?: string
): Promise<ProjectMetadata> {
  const response = await httpClient.post<ProjectMetadata>('/api/projects', {
    name,
    description,
  });
  return response.data;
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const response = await httpClient.get<ProjectDetail>(`/api/projects/${id}`);
  return response.data;
}

export async function deleteProject(id: string): Promise<void> {
  await httpClient.delete(`/api/projects/${id}`);
}

/**
 * Phase 8: Save rules with governance enforcement
 * Returns governance review results
 * BLOCKED rules will return 400 error with findings
 * WARNING/OK rules will save successfully with findings
 */
export async function saveRules(
  id: string,
  json: string
): Promise<RuleReviewResponse> {
  const response = await httpClient.post<RuleReviewResponse>(
    `/api/projects/${id}/rules`,
    {
      rulesJson: json,
    }
  );
  return response.data;
}

export async function saveCodeMaster(id: string, json: string): Promise<void> {
  await httpClient.post(`/api/projects/${id}/codemaster`, {
    codeMasterJson: json,
  });
}

export async function saveValidationSettings(id: string, json: string): Promise<void> {
  await httpClient.post(`/api/projects/${id}/validation-settings`, {
    validationSettingsJson: json,
  });
}

export async function saveBundle(id: string, json: string): Promise<void> {
  await httpClient.post(`/api/projects/${id}/bundle`, {
    bundleJson: json,
  });
}

export async function exportProject(
  id: string
): Promise<{ rulesJson: string; codeMasterJson: string; bundleJson: string }> {
  const response = await httpClient.get<{
    rulesJson: string;
    codeMasterJson: string;
    bundleJson: string;
  }>(`/api/projects/${id}/export`);
  return response.data;
}

export async function validateProject(id: string): Promise<ValidationResult> {
  const response = await httpClient.post<ValidationResult>(
    `/api/projects/${id}/validate`
  );
  return response.data;
}

export async function updateProjectFeatures(
  id: string,
  features: { treeRuleAuthoring?: boolean }
): Promise<ProjectDetail> {
  const response = await httpClient.patch<ProjectDetail>(
    `/api/projects/${id}/features`,
    features
  );
  return response.data;
}
