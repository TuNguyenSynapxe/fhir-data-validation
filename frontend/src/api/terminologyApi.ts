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

// ============================================================================
// ValueSet Lookup API (Phase 4A)
// ============================================================================

/**
 * ValueSet summary (search results)
 */
export interface ValueSetSummaryDto {
  url: string; // Canonical URL (authoritative)
  name: string;
  description?: string;
  publisher?: string;
  layer: 'Hl7' | 'Pss' | 'Project';
}

/**
 * ValueSet code entry (preview)
 */
export interface ValueSetCodeDto {
  code: string;
  display?: string;
}

/**
 * ValueSet preview response
 */
export interface ValueSetPreviewDto {
  url: string;
  name: string;
  codes: ValueSetCodeDto[];
  totalCodes: number;
}

/**
 * Search layer filter
 */
export type TerminologyLayer = 'Hl7' | 'Pss' | 'Project';

/**
 * API Error
 */
export class TerminologyApiError extends Error {
  status: number;
  statusText: string;

  constructor(
    status: number,
    statusText: string,
    message: string
  ) {
    super(message);
    this.status = status;
    this.statusText = statusText;
    this.name = 'TerminologyApiError';
  }
}

/**
 * Search ValueSets by query
 * 
 * @param query - Search query (case-insensitive, partial match)
 * @param layer - Optional layer filter (default: all layers)
 * @param limit - Max results (default: 20, max: 50)
 * @returns Array of ValueSet summaries
 * @throws TerminologyApiError on non-200 response
 */
export async function searchValueSets(
  query: string,
  layer?: TerminologyLayer,
  limit = 20
): Promise<ValueSetSummaryDto[]> {
  const params = new URLSearchParams();
  params.set('query', query);
  if (layer) {
    params.set('layer', layer);
  }
  params.set('limit', Math.min(limit, 50).toString());

  const response = await fetch(`/api/sd-builder/valuesets/search?${params.toString()}`);
  
  if (!response.ok) {
    throw new TerminologyApiError(
      response.status,
      response.statusText,
      `Failed to search ValueSets: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get ValueSet details by canonical URL
 * 
 * @param canonicalUrl - Canonical URL (exact match)
 * @returns ValueSet details or null if not found
 * @throws TerminologyApiError on non-200 response (except 404)
 */
export async function getValueSetDetails(
  canonicalUrl: string
): Promise<ValueSetSummaryDto | null> {
  const params = new URLSearchParams();
  params.set('query', canonicalUrl);
  params.set('limit', '50');

  const response = await fetch(`/api/sd-builder/valuesets/search?${params.toString()}`);
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    throw new TerminologyApiError(
      response.status,
      response.statusText,
      `Failed to get ValueSet details: ${response.statusText}`
    );
  }

  const results: ValueSetSummaryDto[] = await response.json();
  // Find exact match by URL
  return results.find(vs => vs.url === canonicalUrl) ?? null;
}

/**
 * Preview ValueSet codes
 * 
 * @param canonicalUrl - Canonical URL (exact match)
 * @param maxItems - Max codes to return (default: 100, max: 200)
 * @returns ValueSet preview with codes
 * @throws TerminologyApiError on non-200 response
 */
export async function previewValueSetCodes(
  canonicalUrl: string,
  maxItems = 100
): Promise<ValueSetPreviewDto> {
  const params = new URLSearchParams();
  params.set('url', canonicalUrl);
  params.set('maxItems', Math.min(maxItems, 200).toString());

  const response = await fetch(`/api/sd-builder/valuesets/preview?${params.toString()}`);
  
  if (!response.ok) {
    throw new TerminologyApiError(
      response.status,
      response.statusText,
      `Failed to preview ValueSet codes: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Check if ValueSet exists
 * 
 * @param canonicalUrl - Canonical URL (exact match)
 * @returns true if ValueSet exists
 * @throws TerminologyApiError on non-200 response
 */
export async function valueSetExists(
  canonicalUrl: string
): Promise<boolean> {
  const params = new URLSearchParams();
  params.set('url', canonicalUrl);

  const response = await fetch(`/api/sd-builder/valuesets/exists?${params.toString()}`);
  
  if (!response.ok) {
    throw new TerminologyApiError(
      response.status,
      response.statusText,
      `Failed to check ValueSet existence: ${response.statusText}`
    );
  }

  const result = await response.json();
  return result.exists === true;
}
