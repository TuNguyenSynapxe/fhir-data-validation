/**
 * Unit Tests for useProjectValidation Hook
 * 
 * Tests validation lifecycle management including:
 * - Initial state
 * - Successful validation flow
 * - Error handling
 * - State management actions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectValidation } from '../useProjectValidation';
import type { ValidationResult } from '../useProjectValidation';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useProjectValidation', () => {
  const testProjectId = 'test-project-123';

  beforeEach(() => {
    // Reset fetch mock before each test
    mockFetch.mockReset();
  });

  describe('initial state', () => {
    it('should initialize with null result', () => {
      const { result } = renderHook(() => useProjectValidation(testProjectId));

      expect(result.current.result).toBeNull();
    });

    it('should initialize with isValidating false', () => {
      const { result } = renderHook(() => useProjectValidation(testProjectId));

      expect(result.current.isValidating).toBe(false);
    });

    it('should initialize with null error', () => {
      const { result } = renderHook(() => useProjectValidation(testProjectId));

      expect(result.current.error).toBeNull();
    });

    it('should initialize with trigger timestamp of 0', () => {
      const { result } = renderHook(() => useProjectValidation(testProjectId));

      expect(result.current.trigger).toBe(0);
    });
  });

  describe('successful validation', () => {
    const mockValidationResult: ValidationResult = {
      isValid: false,
      errors: [
        {
          source: 'FHIR',
          severity: 'error',
          message: 'Invalid identifier',
          path: 'Patient.identifier',
        },
      ],
      timestamp: '2025-12-19T10:00:00Z',
      executionTimeMs: 150,
      summary: {
        total: 1,
        errors: 1,
        warnings: 0,
        information: 0,
        bySource: {
          firely: 1,
          businessRules: 0,
          codeMaster: 0,
          reference: 0,
          lint: 0,
          specHint: 0,
        },
      },
    };

    it('should set isValidating to true during validation', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      act(() => {
        result.current.runValidation('fast');
      });

      expect(result.current.isValidating).toBe(true);
    });

    it('should update result on successful validation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: mockValidationResult.errors,
          metadata: {
            timestamp: mockValidationResult.timestamp,
            processingTimeMs: mockValidationResult.executionTimeMs,
          },
          summary: {
            totalErrors: 1,
            errorCount: 1,
            warningCount: 0,
            infoCount: 0,
            fhirErrorCount: 1,
            businessErrorCount: 0,
            codeMasterErrorCount: 0,
            referenceErrorCount: 0,
            lintErrorCount: 0,
          },
        }),
      });

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.result).not.toBeNull();
      expect(result.current.result?.isValid).toBe(false);
      expect(result.current.result?.errors).toHaveLength(1);
      expect(result.current.result?.errors[0].message).toBe('Invalid identifier');
    });

    it('should reset isValidating to false after successful validation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [],
          metadata: { timestamp: '2025-12-19T10:00:00Z', processingTimeMs: 100 },
          summary: {
            totalErrors: 0,
            errorCount: 0,
            warningCount: 0,
            infoCount: 0,
            fhirErrorCount: 0,
            businessErrorCount: 0,
            codeMasterErrorCount: 0,
            referenceErrorCount: 0,
            lintErrorCount: 0,
          },
        }),
      });

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.isValidating).toBe(false);
    });

    it('should call validation API with correct project ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [],
          metadata: { timestamp: '2025-12-19T10:00:00Z', processingTimeMs: 100 },
          summary: {
            totalErrors: 0,
            errorCount: 0,
            warningCount: 0,
            infoCount: 0,
            fhirErrorCount: 0,
            businessErrorCount: 0,
            codeMasterErrorCount: 0,
            referenceErrorCount: 0,
            lintErrorCount: 0,
          },
        }),
      });

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/projects/${testProjectId}/validate`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should support debug validation mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [],
          metadata: { timestamp: '2025-12-19T10:00:00Z', processingTimeMs: 100 },
          summary: {
            totalErrors: 0,
            errorCount: 0,
            warningCount: 0,
            infoCount: 0,
            fhirErrorCount: 0,
            businessErrorCount: 0,
            codeMasterErrorCount: 0,
            referenceErrorCount: 0,
            lintErrorCount: 0,
          },
        }),
      });

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('debug');
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.validationMode).toBe('debug');
    });

    it('should clear error state when starting new validation', async () => {
      // First validation fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.error).not.toBeNull();

      // Second validation succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [],
          metadata: { timestamp: '2025-12-19T10:00:00Z', processingTimeMs: 100 },
          summary: {
            totalErrors: 0,
            errorCount: 0,
            warningCount: 0,
            infoCount: 0,
            fhirErrorCount: 0,
            businessErrorCount: 0,
            codeMasterErrorCount: 0,
            referenceErrorCount: 0,
            lintErrorCount: 0,
          },
        }),
      });

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('failed validation', () => {
    it('should set error message on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should reset isValidating to false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Validation failed'));

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.isValidating).toBe(false);
    });

    it('should set result to null on error', async () => {
      // First set a successful result
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [],
          metadata: { timestamp: '2025-12-19T10:00:00Z', processingTimeMs: 100 },
          summary: {
            totalErrors: 0,
            errorCount: 0,
            warningCount: 0,
            infoCount: 0,
            fhirErrorCount: 0,
            businessErrorCount: 0,
            codeMasterErrorCount: 0,
            referenceErrorCount: 0,
            lintErrorCount: 0,
          },
        }),
      });

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.result).not.toBeNull();

      // Then validation fails
      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.result).toBeNull();
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      });

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.error).toBe('Internal server error');
    });

    it('should handle HTTP error without JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.error).toBe('Validation failed');
    });
  });

  describe('clearError action', () => {
    it('should clear error without affecting result', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useProjectValidation(testProjectId));

      await act(async () => {
        await result.current.runValidation('fast');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull(); // Result remains null
    });
  });

  describe('setResult action', () => {
    it('should manually set validation result', () => {
      const { result } = renderHook(() => useProjectValidation(testProjectId));

      const customResult: ValidationResult = {
        isValid: true,
        errors: [],
        timestamp: '2025-12-19T12:00:00Z',
        executionTimeMs: 50,
        summary: {
          total: 0,
          errors: 0,
          warnings: 0,
          information: 0,
          bySource: {
            firely: 0,
            businessRules: 0,
            codeMaster: 0,
            reference: 0,
            lint: 0,
            specHint: 0,
          },
        },
      };

      act(() => {
        result.current.setResult(customResult);
      });

      expect(result.current.result).toEqual(customResult);
    });

    it('should clear result when set to null', () => {
      const { result } = renderHook(() => useProjectValidation(testProjectId));

      const customResult: ValidationResult = {
        isValid: true,
        errors: [],
        timestamp: '2025-12-19T12:00:00Z',
        executionTimeMs: 50,
        summary: {
          total: 0,
          errors: 0,
          warnings: 0,
          information: 0,
          bySource: {
            firely: 0,
            businessRules: 0,
            codeMaster: 0,
            reference: 0,
            lint: 0,
            specHint: 0,
          },
        },
      };

      act(() => {
        result.current.setResult(customResult);
      });

      expect(result.current.result).toEqual(customResult);

      act(() => {
        result.current.setResult(null);
      });

      expect(result.current.result).toBeNull();
    });
  });

  describe('triggerValidation action', () => {
    it('should update trigger timestamp', () => {
      const { result } = renderHook(() => useProjectValidation(testProjectId));

      const initialTrigger = result.current.trigger;

      act(() => {
        result.current.triggerValidation();
      });

      expect(result.current.trigger).toBeGreaterThan(initialTrigger);
      expect(result.current.trigger).toBeGreaterThan(0);
    });

    it('should update trigger timestamp to current time', () => {
      const { result } = renderHook(() => useProjectValidation(testProjectId));

      const beforeTrigger = Date.now();

      act(() => {
        result.current.triggerValidation();
      });

      const afterTrigger = Date.now();

      expect(result.current.trigger).toBeGreaterThanOrEqual(beforeTrigger);
      expect(result.current.trigger).toBeLessThanOrEqual(afterTrigger);
    });
  });
});
