/**
 * Error handling utilities for terminology authoring
 * 
 * Design principles:
 * - Non-blocking: errors are informational, not preventative
 * - User-friendly: provide actionable error messages
 * - Graceful degradation: allow partial success
 */

/**
 * Base error type for terminology operations
 */
export interface TerminologyError {
  /** Error code for programmatic handling */
  code: string;
  
  /** User-friendly error message */
  message: string;
  
  /** Original error details (for debugging) */
  details?: unknown;
  
  /** Suggested actions to resolve the error */
  suggestedActions?: string[];
}

/**
 * Result type for operations that may fail
 * Allows returning both success and error information
 */
export type TerminologyResult<T> = 
  | { success: true; data: T }
  | { success: false; error: TerminologyError };

/**
 * Wraps an async operation with error handling
 * Converts thrown errors into TerminologyError objects
 */
export async function wrapTerminologyOperation<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<TerminologyResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: parseTerminologyError(error, errorContext),
    };
  }
}

/**
 * Parses various error types into TerminologyError
 */
export function parseTerminologyError(
  error: unknown,
  context: string
): TerminologyError {
  // Axios error with response
  if (isAxiosError(error) && error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 404:
        return {
          code: 'NOT_FOUND',
          message: `${context}: Resource not found`,
          details: data,
          suggestedActions: [
            'Verify the resource exists',
            'Check the URL or ID',
            'Create the resource if needed',
          ],
        };

      case 400:
        return {
          code: 'INVALID_REQUEST',
          message: `${context}: Invalid request`,
          details: data,
          suggestedActions: [
            'Check the request data format',
            'Verify required fields are provided',
            'Review validation errors in details',
          ],
        };

      case 500:
        return {
          code: 'SERVER_ERROR',
          message: `${context}: Server error occurred`,
          details: data,
          suggestedActions: [
            'Retry the operation',
            'Check server logs',
            'Contact support if issue persists',
          ],
        };

      default:
        return {
          code: 'HTTP_ERROR',
          message: `${context}: HTTP ${status} error`,
          details: data,
        };
    }
  }

  // Network error (no response)
  if (isAxiosError(error) && error.request) {
    return {
      code: 'NETWORK_ERROR',
      message: `${context}: Network error - unable to reach server`,
      details: error.message,
      suggestedActions: [
        'Check your internet connection',
        'Verify the API server is running',
        'Check for firewall or proxy issues',
      ],
    };
  }

  // Generic error
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: `${context}: ${error.message}`,
      details: error,
    };
  }

  // Completely unknown error
  return {
    code: 'UNKNOWN_ERROR',
    message: `${context}: An unknown error occurred`,
    details: error,
  };
}

/**
 * Type guard for Axios errors
 */
function isAxiosError(error: unknown): error is {
  response?: { status: number; data: unknown };
  request?: unknown;
  message: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    ('response' in error || 'request' in error)
  );
}

/**
 * Formats a TerminologyError for display
 */
export function formatErrorMessage(error: TerminologyError): string {
  let message = error.message;

  if (error.suggestedActions && error.suggestedActions.length > 0) {
    message += '\n\nSuggested actions:';
    error.suggestedActions.forEach((action, index) => {
      message += `\n${index + 1}. ${action}`;
    });
  }

  return message;
}

/**
 * Creates a user-friendly error message from a TerminologyResult
 */
export function getErrorMessage<T>(
  result: TerminologyResult<T>
): string | null {
  if (result.success) {
    return null;
  }
  return formatErrorMessage(result.error);
}

/**
 * Extracts data from a TerminologyResult, returning undefined on error
 */
export function getResultData<T>(
  result: TerminologyResult<T>
): T | undefined {
  if (result.success) {
    return result.data;
  }
  return undefined;
}

/**
 * Logs an error to console with context
 */
export function logTerminologyError(
  error: TerminologyError,
  context?: string
): void {
  const prefix = context ? `[${context}]` : '[TerminologyError]';
  console.error(`${prefix} ${error.code}:`, error.message);
  if (error.details) {
    console.error('Details:', error.details);
  }
}
