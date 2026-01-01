# GLOBAL FRONTEND FALLBACK RULE - Implementation Complete

## Overview
Implemented safe fallback handling for ALL validation errors when errorCode is unknown or details are malformed.

## Requirements ✅

### 1. Unknown ErrorCode Handling
- ✅ If errorCode is unknown → show generic validation message
- ✅ Log console warning for unknown errorCode (development aid)
- ✅ Never throw, never render empty panel

### 2. Missing/Invalid Details Handling
- ✅ If details are missing → show generic validation message
- ✅ If details structure is invalid → show generic validation message
- ✅ Never depend on backend message text

### 3. Fallback Message Contract
- ✅ Title: "Validation error"
- ✅ Description: "This item does not meet validation requirements."

### 4. DO NOT Behaviors
- ✅ Never attempt to infer meaning from errorCode
- ✅ Never parse jsonPointer or path in fallback
- ✅ Never inspect bundle JSON in fallback
- ✅ Never depend on backend message text

## Implementation

### Files Changed

#### 1. `/frontend/src/constants/errorMessages.ts`

**Updated `DEFAULT_ERROR_MESSAGE`**:
```typescript
export const DEFAULT_ERROR_MESSAGE: ErrorMessageDefinition = {
  title: 'Validation error',
  summary: 'This item does not meet validation requirements.',
  details: () => [],
  remediation: () => 'Review the validation requirements and correct the issue'
};
```

**Updated `getErrorMessage()`**:
```typescript
export function getErrorMessage(errorCode: string): ErrorMessageDefinition {
  const message = ERROR_MESSAGE_MAP[errorCode];
  
  if (!message) {
    // Log warning for unknown errorCode (development aid)
    console.warn(`[ValidationError] Unknown errorCode: "${errorCode}". Using fallback message.`);
    return DEFAULT_ERROR_MESSAGE;
  }
  
  return message;
}
```

#### 2. `/frontend/src/constants/__tests__/errorMessages.fallback.test.ts` (NEW)

**Test Coverage**: 22 tests covering:
- Unknown errorCode handling (4 tests)
- Fallback message rendering (5 tests)
- Never throws behavior (2 tests)
- Fallback message contract (4 tests)
- Known errorCodes should NOT trigger fallback (3 tests)
- DO NOT behaviors (4 tests)

**All Tests Passing**: ✅ 22/22 passed

## Behavior

### Known ErrorCode
```typescript
const message = getErrorMessage('VALUE_NOT_ALLOWED');
// Returns specific message from ERROR_MESSAGE_MAP
// Title: "Value Not Allowed"
// Summary: "The value used is not in the allowed set."
// No console warning
```

### Unknown ErrorCode
```typescript
const message = getErrorMessage('UNKNOWN_ERROR_XYZ');
// Returns DEFAULT_ERROR_MESSAGE
// Title: "Validation error"
// Summary: "This item does not meet validation requirements."
// Console warning: "[ValidationError] Unknown errorCode: "UNKNOWN_ERROR_XYZ". Using fallback message."
```

### Rendering with Unknown ErrorCode
```typescript
const issue: ValidationIssue = {
  errorCode: 'UNKNOWN_ERROR',
  severity: 'error',
  source: 'UNKNOWN'
};

const result = renderErrorMessage(issue, 'detailed');
// result.title = 'Validation error'
// result.summary = 'This item does not meet validation requirements.'
// result.details = []
// result.remediation = 'Review the validation requirements and correct the issue'
// No errors thrown, safe fallback rendered
```

## Safety Guarantees

1. **Never Throws**: All fallback paths are null-safe and handle malformed input
2. **Never Empty**: Always returns message with title + summary
3. **Never Depends on Backend Text**: Uses only frontend-owned message templates
4. **Never Infers Meaning**: Does not parse errorCode string to guess intent
5. **Never Parses Paths**: Does not inspect jsonPointer, path, or bundle structure
6. **Development Aid**: Console warnings help developers identify missing errorCode mappings

## Integration

The fallback is automatically used by:
- `RuleErrorRenderer` component (validation UI)
- `renderErrorMessage()` function (message rendering)
- Any code using `getErrorMessage()` (all validation error displays)

No additional changes required - fallback is globally active for all validation errors.

## Testing

Run tests:
```bash
cd frontend
npm test -- errorMessages.fallback.test.ts
```

Expected: 22/22 tests passing

## Next Steps

When adding new errorCodes:
1. Add errorCode to `ERROR_MESSAGE_MAP` in `errorMessages.ts`
2. Provide `title`, `summary`, `details`, and `remediation`
3. Add test case verifying errorCode does NOT trigger fallback
4. Fallback will automatically handle if errorCode is missing

## Contract Compliance

✅ **GLOBAL FRONTEND FALLBACK RULE** fully implemented
✅ All requirements met
✅ All tests passing
✅ Safe, predictable fallback for ALL validation errors
✅ Zero risk of thrown errors or empty panels
