/* ============================================
 * Validation Error Explanation Registry
 * --------------------------------------------
 * Rules:
 * - Switch ONLY on errorCode
 * - Read ONLY from details
 * - Never parse path / jsonPointer / FHIRPath
 * - Never throw
 * - Always return a valid explanation
 * ============================================ */

export interface ErrorExplanation {
  title: string;
  description: string;
  expected?: string;
}

type ExplanationBuilder = (details?: Record<string, any>) => ErrorExplanation;

/* ---------- helpers ---------- */

const safeJoin = (values?: unknown[]): string | undefined => {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  return values.map(String).join(", ");
};

const safeValue = (value: unknown): string | undefined =>
  value === null || value === undefined ? undefined : String(value);

/* ---------- registry ---------- */

export const errorExplanationRegistry: Record<string, ExplanationBuilder> = {
  /* ============================
   * STRUCTURE
   * ============================ */

  INVALID_ENUM_VALUE: (details) => {
    const actual = safeValue(details?.actual);
    const allowed = safeJoin(details?.allowed);

    return {
      title: "Invalid value",
      description: actual
        ? `The value “${actual}” is not allowed for this field.`
        : "This value is not allowed for this field.",
      expected: allowed
        ? `Expected one of: ${allowed}`
        : "Choose a valid value for this field."
    };
  },

  FIXED_VALUE_MISMATCH: (details) => {
    const expected = safeValue(details?.expected);
    const actual = safeValue(details?.actual);

    return {
      title: "Incorrect value",
      description: "This field must have a specific value.",
      expected: expected
        ? actual
          ? `Expected value: ${expected}. Provided value: ${actual}`
          : `Expected value: ${expected}`
        : "Use the required fixed value for this field."
    };
  },

  FHIR_INVALID_PRIMITIVE: (details) => {
    const actual = safeValue(details?.actual);
    const expectedType = safeValue(details?.expectedType);
    const reason = safeValue(details?.reason);

    return {
      title: "Invalid format",
      description: actual
        ? `The value “${actual}” is not a valid ${expectedType ?? "value"}.`
        : "The value has an invalid format.",
      expected: reason
        ? reason
        : expectedType
          ? `Use a valid ${expectedType} value.`
          : "Use a valid value format."
    };
  },

  FHIR_ARRAY_EXPECTED: (details) => {
    const actualType = safeValue(details?.actualType);

    return {
      title: "Incorrect structure",
      description: actualType
        ? `This field must be a list, but a ${actualType} was provided.`
        : "This field must be a list.",
      expected: "Provide an array (list) of values."
    };
  },

  REQUIRED_FIELD_MISSING: () => ({
    title: "Missing required field",
    description: "This field is required but was not provided.",
    expected: "Provide a value for this field."
  }),

  ARRAY_LENGTH_OUT_OF_RANGE: (details) => {
    const min = safeValue(details?.min);
    const max = safeValue(details?.max);
    const actual = safeValue(details?.actual);

    return {
      title: "Incorrect number of items",
      description: "This field has an invalid number of entries.",
      expected:
        min && max
          ? `Expected between ${min} and ${max} items. Provided: ${actual ?? "unknown"}`
          : "Provide the correct number of items."
    };
  },

  /* ============================
   * BUSINESS / PROJECT
   * ============================ */

  VALUE_NOT_ALLOWED: (details) => {
    const actual = safeValue(details?.actual);
    const allowed = safeJoin(details?.allowed);

    return {
      title: "Value not permitted",
      description: actual
        ? `The value “${actual}” is not allowed by the project rules.`
        : "This value is not allowed by the project rules.",
      expected: allowed
        ? `Allowed values: ${allowed}`
        : "Use a value permitted by the project rules."
    };
  },

  CODE_NOT_IN_VALUESET: (details) => {
    const actual = safeValue(details?.actual);
    const examples = safeJoin(details?.examples);

    return {
      title: "Invalid code",
      description: actual
        ? `The code “${actual}” is not allowed for this field.`
        : "The provided code is not allowed for this field.",
      expected: examples
        ? `Examples of valid codes: ${examples}`
        : "Use a code from the approved value set."
    };
  },

  /* ============================
   * FALLBACK
   * ============================ */

  DEFAULT: () => getFallbackExplanation()
};

/* ---------- exported fallback ---------- */

export const getFallbackExplanation = (): ErrorExplanation => ({
  title: "Validation issue",
  description: "This field does not meet the validation requirements.",
  expected: "Update the value to match the expected format or allowed values."
});