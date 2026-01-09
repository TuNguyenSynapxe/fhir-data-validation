import type { ValidationResultDto, ApiError } from './ValidationApiTypes';

/**
 * ValidationApiClient
 * 
 * Single responsibility: HTTP request to backend validation API.
 * 
 * Rules:
 * - Throw on non-200
 * - Do NOT swallow errors
 * - Do NOT normalize data
 * - Do NOT retry
 * - Do NOT cache
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export class ValidationApiClient {
  /**
   * Fetch validation result from backend
   * 
   * @throws {ApiError} When request fails or returns non-200
   */
  static async fetchValidationResult(projectId: string): Promise<ValidationResultDto> {
    if (!projectId) {
      throw new Error('projectId is required');
    }

    const url = `${API_BASE_URL}/api/projects/${projectId}/validate`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Network error
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'Network request failed',
        details: error,
      };
      throw apiError;
    }

    // Non-200 response
    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      let errorDetails: unknown;

      try {
        errorDetails = await response.json();
        if (typeof errorDetails === 'object' && errorDetails !== null && 'message' in errorDetails) {
          errorMessage = String((errorDetails as { message: unknown }).message);
        }
      } catch {
        // Could not parse error response, use status text
        errorMessage = response.statusText || errorMessage;
      }

      const apiError: ApiError = {
        message: errorMessage,
        statusCode: response.status,
        details: errorDetails,
      };
      throw apiError;
    }

    // Parse response
    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      const apiError: ApiError = {
        message: 'Failed to parse API response as JSON',
        statusCode: response.status,
        details: error,
      };
      throw apiError;
    }

    // Return raw data (validation happens in mapper)
    return data as ValidationResultDto;
  }
}
