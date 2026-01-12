import httpClient from './httpClient';

export interface SampleBundleDto {
  id: string;
  name: string;
  structureDefinitionCanonicalUrl?: string;
  bundleSource: string;
  createdAt: string;
}

export interface SampleBundleDetailDto {
  id: string;
  name: string;
  structureDefinitionCanonicalUrl?: string;
  bundleSource: string;
  bundleJson: string;
  createdAt: string;
}

export interface CreateSampleBundleRequest {
  name: string;
  structureDefinitionCanonicalUrl?: string;
  bundleJson: string;
}

export interface UpdateSampleBundleRequest {
  name: string;
  bundleJson: string;
}

/**
 * Get all sample bundles for a project, optionally filtered by SD canonical URL
 */
export async function getSampleBundles(
  projectId: string,
  sdCanonicalUrl?: string
): Promise<SampleBundleDto[]> {
  const params = sdCanonicalUrl ? `?sdCanonicalUrl=${encodeURIComponent(sdCanonicalUrl)}` : '';
  const response = await httpClient.get<SampleBundleDto[]>(
    `/api/v2/projects/${projectId}/sample-bundles${params}`
  );
  return response.data;
}

/**
 * Get a specific sample bundle with full JSON
 */
export async function getSampleBundle(
  projectId: string,
  bundleId: string
): Promise<SampleBundleDetailDto> {
  const response = await httpClient.get<SampleBundleDetailDto>(
    `/api/v2/projects/${projectId}/sample-bundles/${bundleId}`
  );
  return response.data;
}

/**
 * Create a new sample bundle
 */
export async function createSampleBundle(
  projectId: string,
  request: CreateSampleBundleRequest
): Promise<SampleBundleDetailDto> {
  const response = await httpClient.post<SampleBundleDetailDto>(
    `/api/v2/projects/${projectId}/sample-bundles`,
    request
  );
  return response.data;
}

/**
 * Update an existing sample bundle
 */
export async function updateSampleBundle(
  projectId: string,
  bundleId: string,
  request: UpdateSampleBundleRequest
): Promise<void> {
  await httpClient.put(
    `/api/v2/projects/${projectId}/sample-bundles/${bundleId}`,
    request
  );
}

/**
 * Delete a sample bundle
 */
export async function deleteSampleBundle(
  projectId: string,
  bundleId: string
): Promise<void> {
  await httpClient.delete(
    `/api/v2/projects/${projectId}/sample-bundles/${bundleId}`
  );
}
