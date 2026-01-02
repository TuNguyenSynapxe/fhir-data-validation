import { errorExplanationRegistry } from "./errorExplanationRegistry";
import type { ErrorExplanation } from "./errorExplanationRegistry";

/**
 * Minimal error shape for explanation registry
 * This is a subset - the full ValidationError is defined in useProjectValidation
 */
export interface ExplainableError {
  errorCode?: string;
  details?: Record<string, any>;
}

export function explainError(error: ExplainableError): ErrorExplanation {
  const code = error.errorCode ?? "DEFAULT";
  const handler =
    errorExplanationRegistry[code] ?? errorExplanationRegistry.DEFAULT;

  try {
    return handler(error.details);
  } catch (e) {
    console.warn("[explainError] Failed to explain error:", e);
    return errorExplanationRegistry.DEFAULT();
  }
}