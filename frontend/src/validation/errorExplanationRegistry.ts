/**
 * Phase 6 - Validation Error Explanation Registry
 * 
 * CONTRACT-BOUND: This registry switches ONLY on errorCode + details.
 * DO NOT parse paths, jsonPointer, bundle data, ruleType, or severity.
 * 
 * All human-readable validation messages originate here.
 */

export type ErrorExplanation = {
  title: string;
  description: string;
};

export type ExplanationFn = (details?: unknown) => ErrorExplanation;

/**
 * Fallback explanation for unknown or malformed errors
 */
const fallbackExplanation = (errorCode?: string): ErrorExplanation => {
  if (errorCode) {
    console.warn(`[ErrorExplanationRegistry] Unknown errorCode: "${errorCode}"`);
  }
  return {
    title: "Validation issue",
    description: "This field does not meet validation requirements.",
  };
};

/**
 * Safe type guard for checking if value is a record
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

/**
 * Safe string coercion with null handling
 */
const safeString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "null";
  }
  return String(value);
};

/**
 * VALUE_NOT_ALLOWED
 * Schema: { actual: string | null, allowed: string[], valueType: string }
 */
const explainValueNotAllowed: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return fallbackExplanation();
  }

  const actual = details.actual;
  const allowed = details.allowed;

  if (!Array.isArray(allowed) || allowed.length === 0) {
    return fallbackExplanation();
  }

  const allowedList = allowed.map(safeString).join(", ");

  if (actual === null || actual === undefined) {
    return {
      title: "Value not allowed",
      description: `A value is required. Allowed values: ${allowedList}.`,
    };
  }

  return {
    title: "Value not allowed",
    description: `The value "${safeString(actual)}" is not permitted. Allowed values: ${allowedList}.`,
  };
};

/**
 * PATTERN_MISMATCH
 * Schema: { actual: string | null, pattern: string, description?: string }
 */
const explainPatternMismatch: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return fallbackExplanation();
  }

  const actual = details.actual;
  const description = details.description;

  // If a description is provided, use it directly
  if (typeof description === "string" && description.trim()) {
    return {
      title: "Invalid format",
      description: description.trim(),
    };
  }

  // Otherwise, use generic message with actual value
  return {
    title: "Invalid format",
    description: `The value "${safeString(actual)}" does not match the required format.`,
  };
};

/**
 * FIXED_VALUE_MISMATCH
 * Schema: { actual: string | null, expected: string }
 */
const explainFixedValueMismatch: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return fallbackExplanation();
  }

  const actual = details.actual;
  const expected = details.expected;

  if (typeof expected !== "string") {
    return fallbackExplanation();
  }

  return {
    title: "Incorrect value",
    description: `Expected "${expected}" but found "${safeString(actual)}".`,
  };
};

/**
 * REQUIRED_FIELD_MISSING
 * Schema: { required: true }
 */
const explainRequiredFieldMissing: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return fallbackExplanation();
  }

  if (details.required !== true) {
    return fallbackExplanation();
  }

  return {
    title: "Missing required field",
    description: "This field is required but was not provided.",
  };
};

/**
 * Error Explanation Registry
 * 
 * Maps errorCode → explanation function
 * Add new error codes here as they are normalized in the backend
 */
export const errorExplanationRegistry: Record<string, ExplanationFn> = {
  VALUE_NOT_ALLOWED: explainValueNotAllowed,
  PATTERN_MISMATCH: explainPatternMismatch,
  FIXED_VALUE_MISMATCH: explainFixedValueMismatch,
  REQUIRED_FIELD_MISSING: explainRequiredFieldMissing,
};

/**
 * Get fallback explanation (exported for testing)
 */
export const getFallbackExplanation = fallbackExplanation;
