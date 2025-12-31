/**
 * GLOBAL FRONTEND FALLBACK RULE - Usage Examples
 * 
 * Demonstrates safe fallback behavior for unknown or malformed validation errors.
 */

import { getErrorMessage, renderErrorMessage } from '../constants/errorMessages';
import type { ValidationIssue } from '../constants/errorMessages';

// ============================================================================
// Example 1: Unknown ErrorCode
// ============================================================================

console.log('=== Example 1: Unknown ErrorCode ===');

const unknownIssue: ValidationIssue = {
  errorCode: 'COMPLETELY_UNKNOWN_ERROR',
  severity: 'error',
  source: 'UNKNOWN',
  path: 'Patient.identifier[0].system'
};

const unknownResult = renderErrorMessage(unknownIssue, 'detailed');

console.log('Title:', unknownResult.title);
// Output: "Validation error"

console.log('Summary:', unknownResult.summary);
// Output: "This item does not meet validation requirements."

console.log('Details:', unknownResult.details);
// Output: []

console.log('Remediation:', unknownResult.remediation);
// Output: "Review the validation requirements and correct the issue"

// Console warning also logged:
// [ValidationError] Unknown errorCode: "COMPLETELY_UNKNOWN_ERROR". Using fallback message.

// ============================================================================
// Example 2: Known ErrorCode (NOT using fallback)
// ============================================================================

console.log('\n=== Example 2: Known ErrorCode ===');

const knownIssue: ValidationIssue = {
  errorCode: 'VALUE_NOT_ALLOWED',
  severity: 'error',
  source: 'BUSINESS',
  path: 'Patient.gender',
  details: {
    actual: 'X',
    allowed: ['male', 'female', 'other', 'unknown'],
    valueType: 'string'
  }
};

const knownResult = renderErrorMessage(knownIssue, 'detailed');

console.log('Title:', knownResult.title);
// Output: "Value Not Allowed" (specific message from ERROR_MESSAGE_MAP)

console.log('Summary:', knownResult.summary);
// Output: "The value used is not in the allowed set." (specific message)

// No console warning - errorCode is recognized

// ============================================================================
// Example 3: Malformed Issue (Missing Details)
// ============================================================================

console.log('\n=== Example 3: Malformed Issue ===');

const malformedIssue: ValidationIssue = {
  errorCode: 'UNKNOWN_ERROR',
  severity: 'error',
  source: 'UNKNOWN',
  details: undefined // Missing details
};

const malformedResult = renderErrorMessage(malformedIssue, 'detailed');

console.log('Title:', malformedResult.title);
// Output: "Validation error"

console.log('Summary:', malformedResult.summary);
// Output: "This item does not meet validation requirements."

// No error thrown, safe fallback returned

// ============================================================================
// Example 4: UI Rendering (React Component)
// ============================================================================

/*
import { RuleErrorRenderer } from './components/validation/RuleErrorRenderer';

function ValidationPanel({ errors }: { errors: ValidationIssue[] }) {
  return (
    <div>
      {errors.map((error, idx) => (
        <RuleErrorRenderer 
          key={idx}
          issue={error}
          verbosity="detailed"
          showPath={true}
        />
      ))}
    </div>
  );
}

// If any error has unknown errorCode, RuleErrorRenderer will:
// 1. Display fallback title: "Validation error"
// 2. Display fallback summary: "This item does not meet validation requirements."
// 3. Never throw
// 4. Never render empty panel
// 5. Log console warning for developers

// Example: User uploads bundle with typo in errorCode from backend
const errorsFromBackend: ValidationIssue[] = [
  {
    errorCode: 'VALUE_NOT_ALLOWEDD', // Typo - extra 'D'
    severity: 'error',
    source: 'BUSINESS',
    path: 'Patient.gender'
  }
];

// UI will render:
// ┌─────────────────────────────────────────┐
// │ ⚠️ Validation error             BUSINESS│
// │                                         │
// │ This item does not meet validation      │
// │ requirements.                           │
// │                                         │
// │ Patient.gender                          │
// └─────────────────────────────────────────┘

// Console log:
// [ValidationError] Unknown errorCode: "VALUE_NOT_ALLOWEDD". Using fallback message.
*/

// ============================================================================
// Example 5: Multiple Unknown ErrorCodes
// ============================================================================

console.log('\n=== Example 5: Multiple Unknown ErrorCodes ===');

const multipleUnknown: ValidationIssue[] = [
  { errorCode: 'UNKNOWN_1', severity: 'error', source: 'TEST' },
  { errorCode: 'UNKNOWN_2', severity: 'error', source: 'TEST' },
  { errorCode: 'VALUE_NOT_ALLOWED', severity: 'error', source: 'BUSINESS' }, // Known
  { errorCode: 'UNKNOWN_3', severity: 'error', source: 'TEST' }
];

multipleUnknown.forEach((issue, idx) => {
  const message = getErrorMessage(issue.errorCode);
  console.log(`Issue ${idx + 1}: ${message.title}`);
});

// Output:
// Issue 1: Validation error (+ console warning)
// Issue 2: Validation error (+ console warning)
// Issue 3: Value Not Allowed (no warning)
// Issue 4: Validation error (+ console warning)

// Total console warnings: 3 (one per unknown errorCode)
// No errors thrown, all issues safely rendered

// ============================================================================
// Example 6: DO NOT Behaviors
// ============================================================================

console.log('\n=== Example 6: DO NOT Behaviors ===');

// Fallback does NOT attempt to infer meaning
const inferredIssue: ValidationIssue = {
  errorCode: 'SOME_REQUIRED_ERROR', // Contains "required" but unknown
  severity: 'error',
  source: 'UNKNOWN'
};

const inferredResult = renderErrorMessage(inferredIssue);
console.log('Inferred Title:', inferredResult.title);
// Output: "Validation error" (NOT "Required Field Missing")
// Fallback does NOT parse errorCode string to guess intent

// Fallback does NOT parse jsonPointer
const pointerIssue: ValidationIssue = {
  errorCode: 'UNKNOWN_ERROR',
  severity: 'error',
  source: 'UNKNOWN',
  navigation: {
    jsonPointer: '/entry/0/resource/identifier/1/system'
  }
};

const pointerResult = renderErrorMessage(pointerIssue, 'detailed');
console.log('Details with jsonPointer:', pointerResult.details);
// Output: [] (empty array)
// Fallback does NOT inspect or parse jsonPointer

// Fallback does NOT depend on backend message text
const backendMessageIssue: ValidationIssue = {
  errorCode: 'UNKNOWN_ERROR',
  severity: 'error',
  source: 'UNKNOWN',
  details: {
    message: 'Some backend error text',
    errorMessage: 'Another backend message'
  }
};

const backendResult = renderErrorMessage(backendMessageIssue);
console.log('Summary with backend text:', backendResult.summary);
// Output: "This item does not meet validation requirements."
// Fallback does NOT use backend message text
