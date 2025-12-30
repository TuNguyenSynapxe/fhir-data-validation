# Severity Refactor Implementation Summary

## Overview
Successfully implemented ValidationClass-aware severity resolution to ensure QuestionAnswer system/code mismatches are treated as HARD ERRORS (never downgraded), while preserving existing SpecHint/heuristic downgrade behavior.

## Changes Implemented

### 1. ValidationClass Enum (NEW)
**File**: `backend/src/Pss.FhirProcessor.Engine/Models/ValidationClass.cs`

Introduced three validation classifications:
- **Contract**: Deterministic contract validations (e.g., QuestionAnswer system/code mapping) - NEVER downgraded
- **Structural**: FHIR specification compliance validations - NEVER downgraded  
- **Advisory**: Heuristic/SpecHint guidance validations - MAY be downgraded based on confidence

**Default**: `Advisory` (preserves backward compatibility)

### 2. RuleDefinition Enhancement
**File**: `backend/src/Pss.FhirProcessor.Engine/Models/RuleSet.cs`

Added `ValidationClass` property to `RuleDefinition`:
```csharp
[JsonPropertyName("validationClass")]
public ValidationClass ValidationClass { get; set; } = ValidationClass.Advisory;
```

**Backward Compatibility**: Existing rules without this field default to `Advisory`, preserving current behavior.

### 3. ValidationError Enhancement
**File**: `backend/src/Pss.FhirProcessor.Engine/Models/ValidationError.cs`

Added optional metadata fields (non-breaking):
- `ConfiguredSeverity`: Original severity before any downgrade
- `ValidationClass`: Classification of the validation  
- `DowngradeReason`: Explanation of why severity was downgraded (only for Advisory)

All new fields use `[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]` to avoid breaking existing consumers.

### 4. SeverityResolver Service (NEW)
**File**: `backend/src/Pss.FhirProcessor.Engine/Validation/SeverityResolver.cs`

Core severity resolution logic:
```csharp
public interface ISeverityResolver
{
    string ResolveSeverity(
        string configuredSeverity,
        ValidationClass validationClass,
        out string? downgradeReason,
        bool isHeuristic = false,
        bool isSpecHint = false);
}
```

**Logic**:
1. **Contract & Structural**: Always return configured severity (no downgrade)
2. **Advisory + SpecHint**: Downgrade ERROR → WARNING with reason "SpecHint advisory: HL7 required field guidance"
3. **Advisory + Heuristic**: Downgrade ERROR → WARNING with reason "Low confidence heuristic validation"
4. **All other cases**: Return configured severity unchanged

### 5. QuestionAnswerValidator Integration
**File**: `backend/src/Pss.FhirProcessor.Engine/Validation/QuestionAnswer/QuestionAnswerValidator.cs`

**Changes**:
- Added `ISeverityResolver` dependency injection
- Replaced hardcoded `"warning"` severity with SeverityResolver call
- Explicitly classified QuestionAnswer validations as `ValidationClass.Contract`
- Added documentation explaining why these are Contract-level validations

**Key Code**:
```csharp
// CRITICAL: QuestionAnswer validations are Contract-level validations.
// System/code mismatches are HARD ERRORS that enforce data mapping contracts.
// They are NEVER downgraded regardless of confidence or heuristics.
var effectiveSeverity = _severityResolver.ResolveSeverity(
    configuredSeverity: rule.Severity,
    validationClass: ValidationClass.Contract,
    downgradeReason: out var downgradeReason,
    isHeuristic: false,
    isSpecHint: false);
```

### 6. Dependency Injection Registration
**File**: `backend/src/Pss.FhirProcessor.Engine/DependencyInjection/EngineServiceCollectionExtensions.cs`

Added:
```csharp
services.AddScoped<Validation.ISeverityResolver, Validation.SeverityResolver>();
```

### 7. Comprehensive Test Suite (NEW)
**File**: `backend/tests/Pss.FhirProcessor.Engine.Tests/Validation/SeverityResolverTests.cs`

**Test Coverage** (9 tests, all passing):
1. ✅ Contract_Error_NeverDowngraded_EvenIfHeuristic
2. ✅ Contract_Error_NeverDowngraded_EvenIfSpecHint
3. ✅ Structural_Error_NeverDowngraded
4. ✅ Advisory_Error_DowngradedToWarning_WhenSpecHint
5. ✅ Advisory_Error_DowngradedToWarning_WhenHeuristic
6. ✅ Advisory_Warning_NotDowngraded
7. ✅ Advisory_Info_NotDowngraded
8. ✅ Contract_Warning_PreservedAsWarning
9. ✅ Structural_Warning_PreservedAsWarning

## Behavioral Changes

### Before
- QuestionAnswer QUESTION_NOT_FOUND errors were **hardcoded as "warning"**
- No distinction between contract validations and heuristic guidance
- All severity was determined solely by rule configuration

### After
- QuestionAnswer QUESTION_NOT_FOUND errors use **rule.Severity with Contract classification**
- Explicit classification system distinguishes deterministic validations from heuristics
- SeverityResolver applies downgrade logic **only to Advisory validations**
- **Contract and Structural validations NEVER downgraded**

### Backward Compatibility
✅ **Fully backward compatible**:
- Existing rules without `validationClass` default to `Advisory`
- SpecHint behavior unchanged (still downgrades error → warning)
- Heuristic validation behavior unchanged
- New ValidationError fields are optional (ignored when null)
- No breaking API changes

## Impact on Current System

### QuestionAnswer Validations
**Previously**: `severity: "warning"` (hardcoded)
**Now**: `severity: rule.Severity` (typically "error") with `ValidationClass.Contract`
**Result**: System/code mismatches now correctly reported as **ERRORS**, not warnings

### SpecHint Validations
**Status**: ✅ Unchanged
**Behavior**: Still classified as `Advisory`, still downgraded from error → warning

### Structural FHIR Validations
**Status**: Can now be explicitly marked as `Structural` (optional)
**Behavior**: When marked, will never be downgraded

## Usage Example

### rules.json
```json
{
  "rules": [
    {
      "id": "qa-001",
      "type": "QuestionAnswer",
      "resourceType": "Observation",
      "path": "Observation.component",
      "severity": "error",
      "errorCode": "QUESTION_NOT_FOUND",
      "validationClass": "Contract"  // ← Explicit classification (optional, QuestionAnswerValidator forces Contract anyway)
    },
    {
      "id": "spec-hint-001",
      "type": "SpecHint",
      "resourceType": "Patient",
      "path": "Patient.name",
      "severity": "error",
      "errorCode": "MISSING_REQUIRED_FIELD",
      "validationClass": "Advisory"  // ← Will be downgraded to warning for SpecHints
    }
  ]
}
```

## Documentation Added

### Code Comments
- Comprehensive XML documentation on `ValidationClass` enum
- Detailed comments in `QuestionAnswerValidator` explaining Contract classification
- Clear comments in `SeverityResolver` explaining downgrade logic

### Intent Documentation
- **Contract validations**: Enforce explicit data mapping contracts, not uncertain heuristics
- **Structural validations**: Enforce FHIR interoperability requirements
- **Advisory validations**: Provide guidance where confidence may be low

## Verification

### Build Status
✅ Clean build - 0 errors, 140 warnings (pre-existing)

### Test Status
✅ All 9 SeverityResolver tests passing
✅ All existing QuestionAnswer tests continue to pass

### Manual Testing Required
- [ ] Validate real project data and verify QUESTION_NOT_FOUND now shows as "error" in browser
- [ ] Verify SpecHint errors still show as "warning" (regression check)
- [ ] Verify enhanced error metadata appears in ValidationError output

## Migration Path

### For Existing Projects
**No action required** - Rules without `validationClass` automatically default to `Advisory`

### For New Rules
**Optional enhancement** - Can now explicitly set `validationClass` based on validation purpose:
- Use `Contract` for deterministic data contract validations
- Use `Structural` for FHIR compliance validations  
- Use `Advisory` (or omit) for heuristic/guidance validations

## Future Enhancements

### Potential Next Steps
1. Populate `ConfiguredSeverity`, `ValidationClass`, and `DowngradeReason` in all error builders
2. Add UI indicators to show when severity was downgraded and why
3. Allow users to view "original severity" vs "effective severity" in error reports
4. Add configuration to control downgrade behavior per project

## Conclusion

The severity refactor successfully achieves all goals:
1. ✅ QuestionAnswer validations are now HARD ERRORS (Contract classification)
2. ✅ SpecHint/heuristic downgrade behavior preserved (Advisory classification)
3. ✅ Backward compatible (default to Advisory)
4. ✅ Explicit, documented design (ValidationClass enum with clear intent)
5. ✅ Comprehensive test coverage (9 tests covering all scenarios)
6. ✅ Clean, maintainable code with clear separation of concerns
