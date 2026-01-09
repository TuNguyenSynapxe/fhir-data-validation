import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useValidationResult } from '../useValidationResult';
import type { ValidationResultDto } from '../ValidationApiTypes';
import { ValidationApiClient } from '../ValidationApiClient';

// Mock the API client
vi.mock('../ValidationApiClient');

describe('useValidationResult', () => {
  const mockProjectId = 'test-project-123';
  const mockValidationResult: ValidationResultDto = {
    issues: [
      {
        source: 'StructureDefinition',
        severity: 'error',
        errorCode: 'TEST_ERROR',
        path: 'Bundle.entry[0]',
        message: 'Test error',
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
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial state when projectId is null', () => {
    const { result } = renderHook(() => useValidationResult(null));

    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets loading state immediately when projectId is provided', () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useValidationResult(mockProjectId));

    expect(result.current.loading).toBe(true);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('successfully fetches and maps validation result', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue(mockValidationResult);

    const { result } = renderHook(() => useValidationResult(mockProjectId));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.result).toEqual({
      issues: [
        {
          source: 'StructureDefinition',
          severity: 'error',
          errorCode: 'TEST_ERROR',
          path: 'Bundle.entry[0]',
          message: 'Test error',
          details: undefined,
        },
      ],
      summary: {
        totalErrors: 1,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    });
    expect(result.current.error).toBeNull();
  });

  it('sets error state when API request fails', async () => {
    const apiError = new Error('Network error');
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockRejectedValue(apiError);

    const { result } = renderHook(() => useValidationResult(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toMatchObject({ message: 'Network error' });
  });

  it('sets error state when mapping fails', async () => {
    // Return malformed data that will fail mapping
    const malformedDto = { issues: 'not-an-array' };
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue(malformedDto as any);

    const { result } = renderHook(() => useValidationResult(mockProjectId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('Invalid validation result');
  });

  it('refetches when projectId changes', async () => {
    const fetchSpy = vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue(mockValidationResult);

    const { result, rerender } = renderHook(({ id }) => useValidationResult(id), {
      initialProps: { id: 'project-1' },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchSpy).toHaveBeenCalledWith('project-1');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Change projectId
    rerender({ id: 'project-2' });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchSpy).toHaveBeenCalledWith('project-2');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('resets state when projectId changes to null', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue(mockValidationResult);

    const { result, rerender } = renderHook(({ id }) => useValidationResult(id), {
      initialProps: { id: mockProjectId },
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    // Change to null
    rerender({ id: null });

    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('cancels fetch when component unmounts', async () => {
    let resolveFetch: (value: ValidationResultDto) => void;
    const fetchPromise = new Promise<ValidationResultDto>((resolve) => {
      resolveFetch = resolve;
    });

    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockReturnValue(fetchPromise);

    const { result, unmount } = renderHook(() => useValidationResult(mockProjectId));

    expect(result.current.loading).toBe(true);

    // Unmount before fetch completes
    unmount();

    // Resolve fetch after unmount
    resolveFetch!(mockValidationResult);

    // State should not update after unmount
    await waitFor(() => {
      expect(result.current.loading).toBe(true); // Still in loading state from before unmount
    });
  });
});
