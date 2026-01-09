import httpClient from './httpClient';

/**
 * Phase 7.3 Backend API Response
 */
export interface ImportProjectResponse {
  projectId: string;
  projectName: string;
  summary: {
    totalArtifacts: number;
    totalBundles: number;
    totalRules: number;
    structureDefinitionCount: number;
    generatedRuleCount: number;
  };
}

/**
 * Phase 7.3 Backend API Error Response
 */
export interface ImportProjectError {
  error: string;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Import a Simplifier R5 package ZIP file.
 * POST /api/admin/projects/import
 * Content-Type: multipart/form-data
 */
export async function importProject(file: File): Promise<ImportProjectResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await httpClient.post<ImportProjectResponse>(
    '/api/admin/projects/import',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}
