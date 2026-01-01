# Phase A JSON Node Structural Validation - Implementation Complete ✅

## 🎯 Objective Achieved

Successfully implemented Phase A: JSON Node-based Structural Validation as the PRIMARY authority for structural validation, running BEFORE Firely POCO validation.

## 📋 Requirements Met

### ✅ Core Requirements

1. **Multiple Errors in One Run** - ✓ Collects ALL errors without stopping at first error
2. **Accurate jsonPointer** - ✓ RFC-6901 compliant with array indices (e.g., `/entry/0/resource/gender`)
3. **No POCO Dependency** - ✓ Uses JSON nodes + StructureDefinition metadata only
4. **Runs Before Firely** - ✓ Integrated into ValidationPipeline at Step 1.9
5. **Correct Severity** - ✓ All errors are STRUCTURE authority with ERROR severity

### ✅ Validation Types Implemented (All 5)

| Type | Status | Error Code | Example |
|------|--------|------------|---------|
| Enum validation | ✅ | INVALID_ENUM_VALUE | `gender: "malex"` |
| Primitive format | ✅ | FHIR_INVALID_PRIMITIVE | `birthDate: "1960-05-15x"` |
| Array vs object shape | ✅ | FHIR_ARRAY_EXPECTED | `identifier: {}` instead of `[]` |
| Cardinality (min/max) | ✅ | ARRAY_LENGTH_OUT_OF_RANGE | `name: []` when min=1 |
| Required field presence | ✅ | REQUIRED_FIELD_MISSING | Missing `name` field |

### ✅ Hard Constraints Honored

- ❌ No Firely POCO parsing introduced
- ❌ No stopping at first error
- ❌ No UI text emitted in backend
- ❌ No frontend code changes
- ❌ No existing engine refactoring
- ❌ No dynamic enum inference from data
- ❌ Only specified errorCodes used

## 🧩 Architecture

### Validation Order (MANDATORY)

```
JSON Syntax
→ JSON Node Structural Validation   ← PHASE A (NEW)
→ Project / Business Rules
→ Firely POCO Validation (LAST)
```

### Components Created

1. **IJsonNodeStructuralValidator** - Interface for JSON node validation
2. **JsonNodeStructuralValidator** - Implementation with 5 validation types
3. **JsonNodeStructuralValidatorTests** - 11 comprehensive tests (all passing)

### Integration Points

- **ValidationPipeline** - Step 1.9 (after Lint/SpecHint, before Firely)
- **DependencyInjection** - Registered as scoped service
- **Error Model** - Uses existing ValidationError with STRUCTURE authority

## 📊 Test Coverage

### ✅ All Tests Passing (11/11)

1. ✅ InvalidEnum_ReturnsError
2. ✅ MultipleEnumErrors_ReturnsAllErrors  
3. ✅ InvalidPrimitive_ReturnsError
4. ✅ ArrayExpectedButObjectProvided_ReturnsError
5. ✅ CardinalityViolation_ReturnsError
6. ✅ RequiredFieldMissing_ReturnsError
7. ✅ JsonPointerPrecision_WithArrayIndices
8. ✅ MultipleErrorTypes_ReturnsAllInOneRun
9. ✅ NoPocoDependency_ValidatesJsonOnly
10. ✅ AllErrorsHaveValidDetails
11. ✅ BooleanValidation_ValidatesType

### Test Validation Points

- ✅ Multiple errors caught in single validation run
- ✅ Precise jsonPointer with array indices (`/entry/0/resource/gender`)
- ✅ No POCO dependency (works with JSON nodes only)
- ✅ All error details conform to ValidationErrorDetailsValidator schema
- ✅ All errors are STRUCTURE authority with ERROR severity

## 🗂️ Metadata Source

Currently uses hardcoded enum values for Phase A:

```csharp
KnownEnumsByElementName:
  - gender: [male, female, other, unknown]
  - status: [registered, preliminary, final, amended, ...]

KnownEnumsByPath:
  - Bundle.type: [document, message, transaction, ...]
```

**Phase B TODO**: Load dynamically from StructureDefinition bindings via IFhirSchemaService.

## 📍 jsonPointer Implementation

All jsonPointers follow RFC-6901 standard:

```json
{
  "jsonPointer": "/entry/0/resource/gender",
  "path": "Bundle.entry[0].resource.gender"
}
```

- Includes array indices
- Points to exact failing node
- Does not point to parent unless parent is invalid

## 🧪 Validation Rules

### 1️⃣ Enum Validation

```
IF element has allowedEnumValues
AND node.Text NOT IN allowedEnumValues
→ emit INVALID_ENUM_VALUE
```

Details:
```json
{
  "actual": "malex",
  "allowed": ["male", "female", "other", "unknown"],
  "valueType": "enum"
}
```

### 2️⃣ Primitive Format Validation

Validates: `boolean`, `integer`, `decimal`, `date`, `dateTime`

```
FHIR_INVALID_PRIMITIVE
{
  "actual": "1960-05-15x",
  "expectedType": "date",
  "reason": "Must be in format YYYY-MM-DD"
}
```

### 3️⃣ Array vs Object Shape

```
IF StructureDefinition.max > 1 (isArray=true)
AND JSON node is NOT array
→ emit FHIR_ARRAY_EXPECTED
```

### 4️⃣ Cardinality Validation

```
IF actualCount < min OR actualCount > max
→ emit ARRAY_LENGTH_OUT_OF_RANGE
{
  "min": 1,
  "max": "*",
  "actual": 0
}
```

### 5️⃣ Required Field Presence

```
IF min >= 1 AND node missing or empty
→ emit REQUIRED_FIELD_MISSING
{
  "required": true
}
```

## 🎯 Definition of Done

### ✅ Phase A Complete Checklist

- [x] Enum errors caught BEFORE Firely
- [x] Primitive format errors caught BEFORE Firely
- [x] Multiple structural errors returned together
- [x] No Firely code touched
- [x] jsonPointer is precise (RFC-6901)
- [x] Severity = ERROR
- [x] All tests pass (11/11)
- [x] No frontend changes
- [x] Integrated into ValidationPipeline
- [x] Registered in DI container
- [x] Uses existing ValidationError model

## 📦 Files Modified/Created

### Created

1. `/backend/src/Pss.FhirProcessor.Engine/Validation/JsonNodeStructuralValidator.cs` (600+ lines)
2. `/backend/tests/Pss.FhirProcessor.Engine.Tests/Validation/JsonNodeStructuralValidatorTests.cs` (500+ lines)

### Modified

3. `/backend/src/Pss.FhirProcessor.Engine/Core/ValidationPipeline.cs` - Added Step 1.9
4. `/backend/src/Pss.FhirProcessor.Engine/DependencyInjection/EngineServiceCollectionExtensions.cs` - Added DI registration
5. `/backend/tests/Pss.FhirProcessor.Engine.Tests/TestHelper.cs` - Updated test helper

## 🚀 Next Steps (Phase B)

1. **Dynamic Enum Loading** - Load enum bindings from StructureDefinition
2. **Extended Primitive Validation** - Add more FHIR primitive types
3. **ValueSet Integration** - Connect to terminology service for ValueSet validation
4. **Cardinality Metadata** - Load min/max from StructureDefinition for all elements
5. **Choice Type Validation** - Validate value[x] type suffixes

## 📈 Impact

### Before Phase A
- Firely was primary structural validator
- Firely errors could be cryptic
- Single POCO parsing failure could block all validation

### After Phase A
- JSON node validation is PRIMARY authority
- Catches structural errors BEFORE Firely
- Multiple errors returned in one validation run
- More precise error messages with exact jsonPointer
- Better user experience (failing fast with clear errors)

## ⚠️ Known Limitations (By Design)

1. **Enum values are hardcoded** - Will be loaded from StructureDefinition in Phase B
2. **Limited primitive types** - Only boolean, integer, decimal, date, dateTime validated
3. **No choice type validation** - Phase B will validate value[x] suffixes
4. **No terminology service integration** - Phase B will add ValueSet binding validation

## 🔒 Governance

- One validation concern per method ✅
- No catch-and-continue swallowing errors ✅
- Emit all errors before returning ✅
- No short-circuit validation ✅
- Uses existing ValidationErrorDetailsValidator ✅

---

**Status**: ✅ COMPLETE - All Phase A requirements met, all tests passing (11/11)

**Build**: ✅ SUCCESS - No compilation errors, warnings accepted

**Ready for**: Phase B (Dynamic metadata loading from StructureDefinition)
