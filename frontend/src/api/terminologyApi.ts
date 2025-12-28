/**
 * Terminology API Client - Phase 1
 * 
 * Calls TerminologyController endpoints for CodeSystem CRUD operations.
 * Uses file-based storage (not Project.codeMasterJson).
 */

import httpClient from './httpClient';
import type { CodeSystem, CodeSystemConcept } from '../types/terminology';

// Export types from terminology module for consistency
export type CodeSetDto = CodeSystem;
export type CodeSetConceptDto = CodeSystemConcept;

/**
 * List all CodeSystems for a project
 */
export async function listCodeSystems(projectId: string): Promise<CodeSetDto[]> {
  const response = await httpClient.get<CodeSetDto[]>(
    `/api/projects/${projectId}/terminology/codesystems`
  );
  return response.data;
}

/**
 * Get a single CodeSystem by canonical URL
 */
export async function getCodeSystemByUrl(
  projectId: string,
  url: string
): Promise<CodeSetDto> {
  const encodedUrl = encodeURIComponent(url);
  const response = await httpClient.get<CodeSetDto>(
    `/api/projects/${projectId}/terminology/codesystems/by-url?url=${encodedUrl}`
  );
  return response.data;
}

/**
 * Save (create or update) a CodeSystem
 */
export async function saveCodeSystem(
  projectId: string,
  codeSet: CodeSetDto
): Promise<CodeSetDto> {
  const response = await httpClient.put<CodeSetDto>(
    `/api/projects/${projectId}/terminology/codesystems`,
    codeSet
  );
  return response.data;
}

/**
 * Delete a CodeSystem by canonical URL
 */
export async function deleteCodeSystem(
  projectId: string,
  url: string
): Promise<void> {
  const encodedUrl = encodeURIComponent(url);
  await httpClient.delete(
    `/api/projects/${projectId}/terminology/codesystems?url=${encodedUrl}`
  );
}
