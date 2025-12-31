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
 * ARRAY_LENGTH_OUT_OF_RANGE
 * Schema: { min: number | null, max: number | null, actual: number }
 */
const explainArrayLengthOutOfRange: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return fallbackExplanation();
  }

  const min = details.min;
  const max = details.max;
  const actual = details.actual;

  if (typeof actual !== "number") {
    return fallbackExplanation();
  }

  if (min !== null && max !== null) {
    return {
      title: "Array length out of range",
      description: `This field contains ${actual} item${actual !== 1 ? 's' : ''}, but must contain between ${min} and ${max} items.`,
    };
  }

  if (min !== null) {
    return {
      title: "Array too short",
      description: `This field contains ${actual} item${actual !== 1 ? 's' : ''}, but must contain at least ${min} item${min !== 1 ? 's' : ''}.`,
    };
  }

  if (max !== null) {
    return {
      title: "Array too long",
      description: `This field contains ${actual} item${actual !== 1 ? 's' : ''}, but must contain at most ${max} item${max !== 1 ? 's' : ''}.`,
    };
  }

  return fallbackExplanation();
};

/**
 * CODE_NOT_IN_VALUESET
 * Schema: { system: string, code: string, valueSet: string }
 */
const explainCodeNotInValueSet: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return fallbackExplanation();
  }

  const code = details.code;
  const system = details.system;
  const valueSet = details.valueSet;

  if (typeof code !== "string") {
    return fallbackExplanation();
  }

  const codeDisplay = system ? `${safeString(system)}|${code}` : code;

  return {
    title: "Code not in value set",
    description: `The code "${codeDisplay}" is not valid for this field. ${
      valueSet ? `Expected a code from value set: ${valueSet}` : "Expected a code from the specified value set."
    }`,
  };
};

/**
 * CODESYSTEM_MISMATCH
 * Schema: { expectedSystem: string, actualSystem: string | null }
 */
const explainCodeSystemMismatch: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return fallbackExplanation();
  }

  const expectedSystem = details.expectedSystem;
  const actualSystem = details.actualSystem;

  if (typeof expectedSystem !== "string") {
    return fallbackExplanation();
  }

  if (actualSystem === null || actualSystem === undefined) {
    return {
      title: "Code system missing",
      description: `Expected code system "${expectedSystem}" but no system was provided.`,
    };
  }

  return {
    title: "Code system mismatch",
    description: `Expected code system "${expectedSystem}" but found "${safeString(actualSystem)}".`,
  };
};

/**
 * REFERENCE_NOT_FOUND
 * Schema: { reference: string, expectedType?: string | null }
 */
const explainReferenceNotFound: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return fallbackExplanation();
  }

  const reference = details.reference;
  const expectedType = details.expectedType;

  if (typeof reference !== "string") {
    return fallbackExplanation();
  }

  if (expectedType && typeof expectedType === "string") {
    return {
      title: "Reference not found",
      description: `The referenced ${expectedType} resource "${reference}" could not be found in the bundle.`,
    };
  }

  return {
    title: "Reference not found",
    description: `The referenced resource "${reference}" could not be found in the bundle.`,
  };
};

/**
 * REFERENCE_TYPE_MISMATCH
 * Schema: { reference: string, expectedTypes: string[], actualType: string }
 */
const explainReferenceTypeMismatch: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return fallbackExplanation();
  }

  const reference = details.reference;
  const expectedTypes = details.expectedTypes;
  const actualType = details.actualType;

  if (!Array.isArray(expectedTypes) || expectedTypes.length === 0) {
    return fallbackExplanation();
  }

  const expectedList = expectedTypes.join(", ");

  return {
    title: "Reference type mismatch",
    description: `The reference "${safeString(reference)}" points to a ${safeString(actualType)} resource, but expected: ${expectedList}.`,
  };
};

/**
 * FHIR_DESERIALIZATION_ERROR
 * Schema: { exceptionType: string, fullMessage: string }
 */
const explainFhirDeserializationError: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return {
      title: "Invalid FHIR data",
      description: "The FHIR data could not be parsed. Please check that the data is valid JSON and follows the FHIR R4 specification.",
    };
  }

  const fullMessage = details.fullMessage;

  if (typeof fullMessage === "string" && fullMessage) {
    // Extract just the core error message, not the path
    const cleanMessage = fullMessage.split("(at ")[0].trim();
    return {
      title: "Invalid FHIR data",
      description: cleanMessage,
    };
  }

  return {
    title: "Invalid FHIR data",
    description: "The FHIR data could not be parsed. Please check that the data is valid JSON and follows the FHIR R4 specification.",
  };
};

/**
 * UNKNOWN_ELEMENT
 * Schema: varies, may have propertyName
 */
const explainUnknownElement: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return {
      title: "Unknown field",
      description: "This field is not defined in the FHIR R4 specification.",
    };
  }

  const propertyName = details.propertyName || details.property;

  if (propertyName) {
    return {
      title: "Unknown field",
      description: `The field "${safeString(propertyName)}" is not defined in the FHIR R4 specification.`,
    };
  }

  return {
    title: "Unknown field",
    description: "This field is not defined in the FHIR R4 specification.",
  };
};

/**
 * TYPE_MISMATCH
 * Schema: varies
 */
const explainTypeMismatch: ExplanationFn = (details) => {
  return {
    title: "Incorrect data type",
    description: "The value provided does not match the expected data type for this field.",
  };
};

/**
 * MANDATORY_MISSING
 * Schema: varies
 */
const explainMandatoryMissing: ExplanationFn = (details) => {
  return {
    title: "Required field missing",
    description: "This field is mandatory in the FHIR specification and must be provided.",
  };
};

/**
 * INVALID_ENUM_VALUE
 * Schema: varies
 */
const explainInvalidEnumValue: ExplanationFn = (details) => {
  return {
    title: "Invalid value",
    description: "The value provided is not valid for this field. Please use one of the allowed values.",
  };
};

/**
 * FHIR_INVALID_PRIMITIVE
 * Schema: { actual: string, expectedType: string, reason: string }
 */
const explainFhirInvalidPrimitive: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return {
      title: "Invalid primitive value",
      description: "The value cannot be parsed as the expected FHIR primitive type.",
    };
  }

  const actual = safeString(details.actual);
  const expectedType = safeString(details.expectedType);
  const reason = isRecord(details) && details.reason ? safeString(details.reason) : null;

  return {
    title: `Invalid ${expectedType} value`,
    description: reason || `The value '${actual}' cannot be parsed as ${expectedType}.`,
  };
};

/**
 * FHIR_ARRAY_EXPECTED
 * Schema: { expectedType: "array", actualType: string }
 */
const explainFhirArrayExpected: ExplanationFn = (details) => {
  if (!isRecord(details)) {
    return {
      title: "Expected array",
      description: "This field expects an array of values, but received a different type.",
    };
  }

  const actualType = safeString(details.actualType);

  return {
    title: "Expected array",
    description: `This field expects an array of values, but received ${actualType}.`,
  };
};

/**
 * Error Explanation Registry
 * 
 * Maps errorCode → explanation function
 * Add new error codes here as they are normalized in the backend
 */
export const errorExplanationRegistry: Record<string, ExplanationFn> = {
  // Phase 6 initial implementations (normalized business rules)
  VALUE_NOT_ALLOWED: explainValueNotAllowed,
  PATTERN_MISMATCH: explainPatternMismatch,
  FIXED_VALUE_MISMATCH: explainFixedValueMismatch,
  REQUIRED_FIELD_MISSING: explainRequiredFieldMissing,
  
  // Phase 7 extensions (normalized backend errorCodes)
  ARRAY_LENGTH_OUT_OF_RANGE: explainArrayLengthOutOfRange,
  CODE_NOT_IN_VALUESET: explainCodeNotInValueSet,
  CODESYSTEM_MISMATCH: explainCodeSystemMismatch,
  REFERENCE_NOT_FOUND: explainReferenceNotFound,
  REFERENCE_TYPE_MISMATCH: explainReferenceTypeMismatch,
  
  // Firely/FHIR structural validation errors
  FHIR_DESERIALIZATION_ERROR: explainFhirDeserializationError,
  UNKNOWN_ELEMENT: explainUnknownElement,
  TYPE_MISMATCH: explainTypeMismatch,
  MANDATORY_MISSING: explainMandatoryMissing,
  INVALID_ENUM_VALUE: explainInvalidEnumValue,
  
  // Phase 8: Firely structural validation normalization
  FHIR_INVALID_PRIMITIVE: explainFhirInvalidPrimitive,
  FHIR_ARRAY_EXPECTED: explainFhirArrayExpected,
};

/**
 * Get fallback explanation (exported for testing)
 */
export const getFallbackExplanation = fallbackExplanation;
