/**
 * Phase 6 - Error Explanation Registry - Usage Example
 * 
 * This file demonstrates how to use the error explanation registry
 * DO NOT import this in production code - it's documentation only
 */

import { explainError, type ExplainableError } from "../index";

// ============================================================================
// EXAMPLE 1: VALUE_NOT_ALLOWED with actual value
// ============================================================================

const error1: ExplainableError = {
  errorCode: "VALUE_NOT_ALLOWED",
  details: {
    actual: "invalid-status",
    allowed: ["active", "inactive", "pending"],
    valueType: "string",
  },
};

const explanation1 = explainError(error1);
console.log(explanation1.title); // "Value not allowed"
console.log(explanation1.description);
// "The value "invalid-status" is not permitted. Allowed values: active, inactive, pending."

// ============================================================================
// EXAMPLE 2: VALUE_NOT_ALLOWED with null value
// ============================================================================

const error2: ExplainableError = {
  errorCode: "VALUE_NOT_ALLOWED",
  details: {
    actual: null,
    allowed: ["M", "F", "U"],
    valueType: "string",
  },
};

const explanation2 = explainError(error2);
console.log(explanation2.title); // "Value not allowed"
console.log(explanation2.description);
// "A value is required. Allowed values: M, F, U."

// ============================================================================
// EXAMPLE 3: PATTERN_MISMATCH with custom description
// ============================================================================

const error3: ExplainableError = {
  errorCode: "PATTERN_MISMATCH",
  details: {
    actual: "abc123",
    pattern: "^[0-9]{3}-[0-9]{4}$",
    description: "Must be in format XXX-XXXX (e.g., 555-1234)",
  },
};

const explanation3 = explainError(error3);
console.log(explanation3.title); // "Invalid format"
console.log(explanation3.description);
// "Must be in format XXX-XXXX (e.g., 555-1234)"

// ============================================================================
// EXAMPLE 4: PATTERN_MISMATCH without custom description
// ============================================================================

const error4: ExplainableError = {
  errorCode: "PATTERN_MISMATCH",
  details: {
    actual: "abc",
    pattern: "^[0-9]+$",
  },
};

const explanation4 = explainError(error4);
console.log(explanation4.title); // "Invalid format"
console.log(explanation4.description);
// "The value "abc" does not match the required format."

// ============================================================================
// EXAMPLE 5: FIXED_VALUE_MISMATCH
// ============================================================================

const error5: ExplainableError = {
  errorCode: "FIXED_VALUE_MISMATCH",
  details: {
    actual: "wrong-value",
    expected: "required-value",
  },
};

const explanation5 = explainError(error5);
console.log(explanation5.title); // "Incorrect value"
console.log(explanation5.description);
// "Expected "required-value" but found "wrong-value"."

// ============================================================================
// EXAMPLE 6: REQUIRED_FIELD_MISSING
// ============================================================================

const error6: ExplainableError = {
  errorCode: "REQUIRED_FIELD_MISSING",
  details: {
    required: true,
  },
};

const explanation6 = explainError(error6);
console.log(explanation6.title); // "Missing required field"
console.log(explanation6.description);
// "This field is required but was not provided."

// ============================================================================
// EXAMPLE 7: Unknown error code (fallback)
// ============================================================================

const error7: ExplainableError = {
  errorCode: "SOME_NEW_ERROR_CODE",
  details: { foo: "bar" },
};

const explanation7 = explainError(error7);
// Console warning: [ErrorExplanationRegistry] Unknown errorCode: "SOME_NEW_ERROR_CODE"
console.log(explanation7.title); // "Validation issue"
console.log(explanation7.description);
// "This field does not meet validation requirements."

// ============================================================================
// EXAMPLE 8: Malformed details (fallback)
// ============================================================================

const error8: ExplainableError = {
  errorCode: "VALUE_NOT_ALLOWED",
  details: { invalid: "format" }, // Invalid format triggers fallback
};

const explanation8 = explainError(error8);
console.log(explanation8.title); // "Validation issue"
console.log(explanation8.description);
// "This field does not meet validation requirements."

// ============================================================================
// EXAMPLE 9: Missing details (fallback)
// ============================================================================

const error9: ExplainableError = {
  errorCode: "VALUE_NOT_ALLOWED",
  // No details provided
};

const explanation9 = explainError(error9);
console.log(explanation9.title); // "Validation issue"
console.log(explanation9.description);
// "This field does not meet validation requirements."

// ============================================================================
// KEY POINTS
// ============================================================================

/**
 * 1. The registry switches ONLY on errorCode
 * 2. The registry reads ONLY details
 * 3. The registry NEVER accesses:
 *    - path
 *    - jsonPointer
 *    - ruleType
 *    - severity
 *    - bundle data
 * 4. The registry NEVER throws
 * 5. Unknown errorCodes return fallback explanation
 * 6. Malformed/missing details return fallback explanation
 * 7. Console warnings are logged for unknown errorCodes
 */
