import httpClient from './httpClient';
import type {
  ProjectDetailsDto,
  ProjectBundleDto,
  ProjectRuleDto,
  ProjectArtifactDto,
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

/**
 * Get all artifacts (StructureDefinitions, ValueSets, etc.) in a project.
 * Phase 9.6: Used for SD-centric UI.
 * GET /api/v2/projects/{id}/artifacts
 */
export async function getProjectArtifacts(projectId: string): Promise<ProjectArtifactDto[]> {
  const response = await httpClient.get<ProjectArtifactDto[]>(`/api/v2/projects/${projectId}/artifacts`);
  return response.data;
}

/**
 * Get promoted StructureDefinitions in a project.
 * Phase 10.1: Returns only ValidationProfile and BundleProfile (excludes SupportingArtifacts).
 * GET /api/v2/projects/{id}/structure-definitions
 */
export async function getProjectStructureDefinitions(projectId: string): Promise<ProjectArtifactDto[]> {
  const response = await httpClient.get<ProjectArtifactDto[]>(`/api/v2/projects/${projectId}/structure-definitions`);
  return response.data;
}

/**
 * Phase 3.1: DTO for artifact JSON content.
 * Used for runtime SD constraint extraction.
 */
export interface ArtifactContentDto {
  artifactId: string;
  artifactType: string;
  canonicalUrl: string;
  content: any; // Raw FHIR JSON
}

/**
 * Phase 3.1: Get raw JSON content of an artifact (read-only, admin-only).
 * Used for runtime SD constraint extraction (Imported Rules).
 * GET /api/v2/projects/{projectId}/artifacts/{artifactId}/content
 */
export async function getArtifactContent(projectId: string, artifactId: string): Promise<ArtifactContentDto> {
  const response = await httpClient.get<ArtifactContentDto>(`/api/v2/projects/${projectId}/artifacts/${artifactId}/content`);
  return response.data;
}
