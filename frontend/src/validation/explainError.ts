/**
 * Phase 6 - Error Explanation Entry Point
 * 
 * Single function that converts ValidationError → human-readable explanation
 */

import {
  errorExplanationRegistry,
  getFallbackExplanation,
  type ErrorExplanation,
} from "./errorExplanationRegistry";

export interface ValidationError {
  errorCode: string;
  details?: unknown;
}

/**
 * Convert a ValidationError into a human-readable explanation
 * 
 * CONTRACT:
 * - Uses ONLY errorCode + details
 * - Does NOT parse paths, jsonPointer, bundle data, ruleType, severity
 * - Never throws
 * - Returns fallback for unknown errorCodes
 * 
 * @param error - The validation error from backend
 * @returns Human-readable title and description
 */
export function explainError(error: ValidationError): ErrorExplanation {
  if (!error || typeof error.errorCode !== "string") {
    return getFallbackExplanation();
  }

  const handler = errorExplanationRegistry[error.errorCode];

  if (!handler) {
    return getFallbackExplanation(error.errorCode);
  }

  try {
    return handler(error.details);
  } catch (err) {
    // Handler threw - this should never happen, but we must not crash
    console.error(
      `[explainError] Handler for "${error.errorCode}" threw an error:`,
      err
    );
    return getFallbackExplanation();
  }
}
