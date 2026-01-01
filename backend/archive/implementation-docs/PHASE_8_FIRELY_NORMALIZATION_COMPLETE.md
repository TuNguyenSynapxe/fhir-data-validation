# Phase 8: Firely Structural Validation Normalization - COMPLETE

## 🎯 Objective
Map Firely SDK structural validation errors to canonical errorCodes with well-defined schemas, enabling consistent error handling across backend validation and frontend UI.

## ✅ Implementation Summary

### Backend Changes

#### 1. New Error Codes Added
**File**: `ErrorCodes.cs`
- Added new section: **FHIR STRUCTURAL VALIDATION (Firely SDK errors)**
- `FHIR_INVALID_PRIMITIVE` - FHIR primitive type value cannot be parsed
- `FHIR_ARRAY_EXPECTED` - Expected array but received non-array value

#### 2. Firely Exception Mapper Enhanced
**File**: `FirelyExceptionMapper.cs`

**Pattern 5: Invalid Primitive**
```csharp
// Example: "Literal '1960-05-15x' cannot be parsed as a date"
var invalidPrimitiveMatch = Regex.Match(exceptionMessage,
    @"Literal '([^']+)' cannot be parsed as an? (\w+)",
    RegexOptions.IgnoreCase);
```
**Canonical Schema**: `{ actual: string, expectedType: string, reason: string }`

**Pattern 6: Array Expected**
```csharp
// Example: "Expected array for property 'identifier' but received object"
var arrayExpectedMatch = Regex.Match(exceptionMessage,
    @"Expected array.*but received (\w+)",
    RegexOptions.IgnoreCase);
```
**Canonical Schema**: `{ expectedType: "array", actualType: string }`

#### 3. Backend Tests Added
**File**: `FirelyExceptionMapperTests.cs`
- ✅ `MapToValidationError_InvalidPrimitive_Date_ExtractsDetails` - Date parsing error
- ✅ `MapToValidationError_InvalidPrimitive_Boolean_ExtractsDetails` - Boolean parsing error
- ✅ `MapToValidationError_InvalidPrimitive_Decimal_ExtractsDetails` - Decimal parsing error
- ✅ `MapToValidationError_ArrayExpected_ExtractsDetails` - Array type mismatch

**Test Results**: 4/4 passing

### Frontend Changes

#### 1. Error Explanation Registry Extended
**File**: `errorExplanationRegistry.ts`

**FHIR_INVALID_PRIMITIVE Handler**:
```typescript
const explainFhirInvalidPrimitive: ExplanationFn = (details) => {
  const actual = safeString(details.actual);
  const expectedType = safeString(details.expectedType);
  const reason = isRecord(details) && details.reason ? safeString(details.reason) : null;

  return {
    title: `Invalid ${expectedType} value`,
    description: reason || `The value '${actual}' cannot be parsed as ${expectedType}.`,
  };
};
```

**FHIR_ARRAY_EXPECTED Handler**:
```typescript
const explainFhirArrayExpected: ExplanationFn = (details) => {
  const actualType = safeString(details.actualType);

  return {
    title: "Expected array",
    description: `This field expects an array of values, but received ${actualType}.`,
  };
};
```

#### 2. Frontend Tests Added
**File**: `errorExplanationRegistry.test.ts`
- ✅ FHIR_INVALID_PRIMITIVE with canonical schema
- ✅ FHIR_INVALID_PRIMITIVE without reason
- ✅ FHIR_INVALID_PRIMITIVE fallback handling
- ✅ FHIR_ARRAY_EXPECTED with canonical schema
- ✅ FHIR_ARRAY_EXPECTED different actualType values
- ✅ FHIR_ARRAY_EXPECTED fallback handling

**Test Results**: 36/36 passing (including 6 new tests for Phase 8)

## 📊 Impact

### Before Phase 8
Firely invalid primitive and array errors were caught by generic `FHIR_DESERIALIZATION_ERROR` with unstructured details:
```json
{
  "errorCode": "FHIR_DESERIALIZATION_ERROR",
  "details": {
    "exceptionType": "FormatException",
    "fullMessage": "Literal '1960-05-15x' cannot be parsed as a date"
  }
}
```

### After Phase 8
Errors are normalized with canonical schemas:
```json
{
  "errorCode": "FHIR_INVALID_PRIMITIVE",
  "details": {
    "actual": "1960-05-15x",
    "expectedType": "date",
    "reason": "Cannot parse '1960-05-15x' as date"
  }
}
```

**UI Rendering**:
- **Title**: "Invalid date value"
- **Description**: "Cannot parse '1960-05-15x' as date"

## 🎯 Canonical Schemas Enforced

### FHIR_INVALID_PRIMITIVE
```typescript
{
  actual: string,      // The invalid value provided
  expectedType: string, // FHIR primitive type (date, boolean, decimal, etc.)
  reason: string        // Human-readable explanation
}
```

### FHIR_ARRAY_EXPECTED
```typescript
{
  expectedType: "array", // Always "array"
  actualType: string     // The actual type received (object, string, etc.)
}
```

## 🔄 Error Flow

1. **Firely SDK** throws exception: `"Literal '1960-05-15x' cannot be parsed as a date"`
2. **FirelyExceptionMapper** detects pattern and creates ValidationError with canonical schema
3. **Backend** emits: `{ errorCode: "FHIR_INVALID_PRIMITIVE", details: { actual, expectedType, reason } }`
4. **Frontend** calls `explainError(error)`
5. **Registry** returns: `{ title: "Invalid date value", description: "..." }`
6. **UI** renders canonical explanation

## 📋 Files Modified

### Backend
- `src/Pss.FhirProcessor.Engine/Validation/ErrorCodes.cs` - Added 2 constants
- `src/Pss.FhirProcessor.Engine/Firely/FirelyExceptionMapper.cs` - Added 2 patterns + 2 methods
- `tests/Pss.FhirProcessor.Engine.Tests/FirelyExceptionMapperTests.cs` - Added 4 tests

### Frontend
- `src/validation/errorExplanationRegistry.ts` - Added 2 explanation handlers
- `src/validation/__tests__/errorExplanationRegistry.test.ts` - Added 6 tests

## ✅ Verification

### Backend Tests
```bash
cd backend
dotnet test --filter "FullyQualifiedName~MapToValidationError_InvalidPrimitive | FullyQualifiedName~MapToValidationError_ArrayExpected"
```
**Result**: 4/4 tests passed ✅

### Frontend Tests
```bash
cd frontend
npm test -- errorExplanationRegistry.test.ts
```
**Result**: 36/36 tests passed ✅ (including 6 new Phase 8 tests)

## 🎓 Design Principles Followed

1. ✅ **Contract-Bound**: Uses ONLY errorCode + details, no message parsing
2. ✅ **Canonical Schemas**: Well-defined, documented schemas for each error type
3. ✅ **Never-Throw**: Frontend handlers never throw, always return valid ErrorExplanation
4. ✅ **Fallback Mechanism**: Handles malformed/missing details gracefully
5. ✅ **Tested**: Comprehensive test coverage for both happy paths and edge cases
6. ✅ **Incremental**: No breaking changes to existing error handling

## 📝 Notes

- **Scope**: Phase 8 implements ONLY `FHIR_INVALID_PRIMITIVE` and `FHIR_ARRAY_EXPECTED` as requested
- **Fallback**: Errors that don't match these patterns fall back to existing `FHIR_DESERIALIZATION_ERROR`
- **UI Impact**: No UI component changes required - all components already use `explainError()`
- **Regex Patterns**: Uses exact literal matching for Firely SDK message patterns
- **Type Safety**: Frontend handlers use type guards and safe coercion

## 🚀 Next Steps (If Needed)

Additional Firely error patterns that could be normalized in future phases:
- FHIR reference resolution errors
- FHIR cardinality violations
- FHIR resource type mismatches
- FHIR extension validation errors

Each would follow the same pattern:
1. Add constant to ErrorCodes.cs
2. Add regex pattern in FirelyExceptionMapper
3. Define canonical schema
4. Add explanation handler to registry
5. Add tests for both backend and frontend

---

**Phase 8 Status**: ✅ COMPLETE  
**Date**: 2024  
**Test Results**: 10/10 passing (4 backend + 6 frontend)  
**ErrorCodes Registry**: Now contains 16 handlers  
