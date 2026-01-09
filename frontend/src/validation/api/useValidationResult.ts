import { useState, useEffect } from 'react';
import type { ValidationResult } from '../model/ValidationResult';
import { ValidationApiClient } from './ValidationApiClient';
import { mapValidationResult } from './mapValidationResult';

/**
 * useValidationResult Hook
 * 
 * Manages async state for fetching validation results.
 * 
 * Rules:
 * - No retries
 * - No fallback data
 * - No auto-refresh
 * - No mutation
 */

export interface UseValidationResultState {
  result: ValidationResult | null;
  loading: boolean;
  error: Error | null;
}

export function useValidationResult(projectId: string | null): UseValidationResultState {
  const [state, setState] = useState<UseValidationResultState>({
    result: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    // No projectId = no fetch
    if (!projectId) {
      setState({
        result: null,
        loading: false,
        error: null,
      });
      return;
    }

    // Start loading
    setState({
      result: null,
      loading: true,
      error: null,
    });

    // Fetch validation result
    let cancelled = false;

    ValidationApiClient.fetchValidationResult(projectId)
      .then((dto) => {
        if (cancelled) return;

        // Map DTO to model
        try {
          const mappedResult = mapValidationResult(dto);
          setState({
            result: mappedResult,
            loading: false,
            error: null,
          });
        } catch (mappingError) {
          // Mapping failed - malformed response
          setState({
            result: null,
            loading: false,
            error: mappingError instanceof Error ? mappingError : new Error('Failed to map validation result'),
          });
        }
      })
      .catch((apiError) => {
        if (cancelled) return;

        // API request failed
        setState({
          result: null,
          loading: false,
          error: apiError instanceof Error ? apiError : new Error('Unknown API error'),
        });
      });

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return state;
}
