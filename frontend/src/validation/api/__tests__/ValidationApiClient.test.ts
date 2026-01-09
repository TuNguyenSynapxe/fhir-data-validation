import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ValidationApiClient } from '../ValidationApiClient';
import type { ValidationResultDto } from '../ValidationApiTypes';

describe('ValidationApiClient', () => {
  const mockProjectId = 'test-project-123';
  const mockValidationResult: ValidationResultDto = {
    issues: [
      {
        source: 'StructureDefinition',
        severity: 'error',
        errorCode: 'TEST_ERROR',
        path: 'Bundle.entry[0]',
        message: 'Test error message',
      },
    ],
    summary: {
      totalErrors: 1,
      totalWarnings: 0,
      totalInfo: 0,
      hasAmbiguity: false,
      policyMode: 'strict',
    },
  };

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('successfully fetches validation result', async () => {
    // Mock successful response
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockValidationResult,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await ValidationApiClient.fetchValidationResult(mockProjectId);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/projects/${mockProjectId}/validate`),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    expect(result).toEqual(mockValidationResult);
  });

  it('throws error when projectId is empty', async () => {
    await expect(ValidationApiClient.fetchValidationResult('')).rejects.toThrow(
      'projectId is required'
    );
  });

  it('throws error on network failure', async () => {
    const networkError = new Error('Network connection failed');
    const mockFetch = vi.fn().mockRejectedValue(networkError);
    vi.stubGlobal('fetch', mockFetch);

    await expect(ValidationApiClient.fetchValidationResult(mockProjectId)).rejects.toMatchObject({
      message: 'Network connection failed',
    });
  });

  it('throws error on 404 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Project not found' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(ValidationApiClient.fetchValidationResult(mockProjectId)).rejects.toMatchObject({
      message: 'Project not found',
      statusCode: 404,
    });
  });

  it('throws error on 500 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Validation engine failure' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(ValidationApiClient.fetchValidationResult(mockProjectId)).rejects.toMatchObject({
      message: 'Validation engine failure',
      statusCode: 500,
    });
  });

  it('handles non-JSON error response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => {
        throw new Error('Not JSON');
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(ValidationApiClient.fetchValidationResult(mockProjectId)).rejects.toMatchObject({
      message: 'Service Unavailable',
      statusCode: 503,
    });
  });

  it('throws error when response body is not JSON', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(ValidationApiClient.fetchValidationResult(mockProjectId)).rejects.toMatchObject({
      message: 'Failed to parse API response as JSON',
    });
  });
});
