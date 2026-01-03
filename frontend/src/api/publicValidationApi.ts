/**
 * Public Validation API
 * Fetch-based client for anonymous validation and public project endpoints
 */

import type {
  ValidateRequest,
  ValidateResponse,
  ProjectSummaryDto,
  ProjectDetailDto,
} from '../types/public-validation';

const API_BASE = '/api';

/**
 * Anonymous validation (no project context)
 * POST /api/validate
 */
export async function validateBundle(
  request: ValidateRequest
): Promise<ValidateResponse> {
  const response = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Validation failed: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  return response.json();
}

/**
 * List all published projects
 * GET /api/public/projects
 */
export async function getPublishedProjects(): Promise<ProjectSummaryDto[]> {
  const response = await fetch(`${API_BASE}/public/projects`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch projects: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  return response.json();
}

/**
 * Get published project details by slug
 * GET /api/public/projects/{slug}
 */
export async function getPublishedProject(
  slug: string
): Promise<ProjectDetailDto> {
  const response = await fetch(`${API_BASE}/public/projects/${slug}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Project not found: ${slug}`);
    }
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch project: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  return response.json();
}

/**
 * Validate bundle against published project rules
 * POST /api/public/projects/{slug}/validate
 */
export async function validateWithProject(
  slug: string,
  request: ValidateRequest
): Promise<ValidateResponse> {
  const response = await fetch(`${API_BASE}/public/projects/${slug}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Project not found: ${slug}`);
    }
    const errorText = await response.text();
    throw new Error(
      `Validation failed: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  return response.json();
}
