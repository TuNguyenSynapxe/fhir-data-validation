/**
 * Phase 1 CodeSystem API Client
 * 
 * Communicates with backend Terminology endpoints
 * All DTOs use Phase 1 lean model (code + display only)
 */

import type { CodeSet } from '../types/codeSystem';

const API_BASE = '/api/projects';

/**
 * List all CodeSystems for a project
 */
export async function listCodeSystems(projectId: string): Promise<CodeSet[]> {
  const response = await fetch(`${API_BASE}/${projectId}/terminology/codesystems`);
  if (!response.ok) {
    throw new Error(`Failed to list CodeSystems: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get a single CodeSystem by URL
 */
export async function getCodeSystemByUrl(projectId: string, url: string): Promise<CodeSet> {
  const encodedUrl = encodeURIComponent(url);
  const response = await fetch(`${API_BASE}/${projectId}/terminology/codesystems/by-url?url=${encodedUrl}`);
  if (!response.ok) {
    throw new Error(`Failed to get CodeSystem: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Save (create or update) a CodeSystem
 */
export async function saveCodeSystem(projectId: string, codeSet: CodeSet): Promise<void> {
  const response = await fetch(`${API_BASE}/${projectId}/terminology/codesystems`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(codeSet),
  });
  if (!response.ok) {
    throw new Error(`Failed to save CodeSystem: ${response.statusText}`);
  }
}

/**
 * Delete a CodeSystem by URL
 */
export async function deleteCodeSystem(projectId: string, url: string): Promise<void> {
  const encodedUrl = encodeURIComponent(url);
  const response = await fetch(`${API_BASE}/${projectId}/terminology/codesystems?url=${encodedUrl}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete CodeSystem: ${response.statusText}`);
  }
}
