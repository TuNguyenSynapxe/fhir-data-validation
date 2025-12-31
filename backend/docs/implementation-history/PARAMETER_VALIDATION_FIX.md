# Backend Parameter Validation Fix

## Overview
Eliminated silent rule skips in `FhirPathRuleEngine` by adding explicit parameter validation checks. Previously, 5 rule types would silently skip validation when required parameters were missing, creating a false sense of security.

## Problem Statement
When business rules were misconfigured (missing required parameters), the engine would silently skip validation without generating any errors. This meant:
- Users could save incomplete rule definitions
- No validation would occur for those rules
- No error feedback to indicate misconfiguration
- Rules appeared to exist but never triggered

## Solution
Added parameter existence checks at the start of each affected validation method. When required parameters are missing, the engine now returns a `RULE_CONFIGURATION_ERROR` with detailed information about the missing parameters.

## Files Modified

### 1. FhirPathRuleEngine.cs
**Location**: `/backend/src/Pss.FhirProcessor.Engine/Services/FhirPathRuleEngine.cs`

**Modified Methods** (5 total):

#### ValidateFixedValue() - Lines 175-216
**Required Parameter**: `params.value`
```csharp
if (!rule.Params.ContainsKey("value"))
{
    errors.Add(new RuleValidationError
    {
        RuleId = rule.Id,
        RuleType = rule.Type,
        Severity = "error",
        ResourceType = rule.ResourceType,
        Path = rule.Path,
        ErrorCode = "RULE_CONFIGURATION_ERROR",
        Message = $"Rule '{rule.Id}' (FixedValue) is missing required parameter 'value'. Please configure the rule properly.",
        Details = new Dictionary<string, object>
        {
            ["ruleType"] = rule.Type,
            ["missingParams"] = new[] { "value" }
        },
        EntryIndex = entryIndex,
        ResourceId = resource.Id
    });
    return errors;
}
```

#### ValidateAllowedValues() - Lines 218-259
**Required Parameter**: `params.values`
- Checks for missing `values` parameter
- Returns configuration error with `missingParams = ["values"]`

#### ValidateRegex() - Lines 261-307
**Required Parameter**: `params.pattern`
- Checks for missing `pattern` parameter
- Returns configuration error with `missingParams = ["pattern"]`

#### ValidateArrayLength() - Lines 309-368
**Required Parameters**: At least one of `params.min` OR `params.max`
```csharp
if (!rule.Params.ContainsKey("min") && !rule.Params.ContainsKey("max"))
{
    errors.Add(new RuleValidationError
    {
        RuleId = rule.Id,
        RuleType = rule.Type,
        Severity = "error",
        ResourceType = rule.ResourceType,
        Path = rule.Path,
        ErrorCode = "RULE_CONFIGURATION_ERROR",
        Message = $"Rule '{rule.Id}' (ArrayLength) is missing required parameters. At least one of 'min' or 'max' must be specified.",
        Details = new Dictionary<string, object>
        {
            ["ruleType"] = rule.Type,
            ["missingParams"] = new[] { "min", "max" }
        },
        EntryIndex = entryIndex,
        ResourceId = resource.Id
    });
    return errors;
}
```

#### ValidateCodeSystem() - Lines 370-442
**Required Parameter**: `params.system`
- Checks for missing `system` parameter
- Returns configuration error with `missingParams = ["system"]`

### 2. FhirPathRuleEngineTests.cs
**Location**: `/backend/tests/Pss.FhirProcessor.Tests/FhirPathRuleEngineTests.cs`

**Added Tests** (5 total):

1. **FixedValue_MissingParam_ReturnsConfigurationError**
   - Creates FixedValue rule without `params.value`
   - Asserts `RULE_CONFIGURATION_ERROR` is returned
   - Verifies error contains `missingParams` details

2. **AllowedValues_MissingParam_ReturnsConfigurationError**
   - Creates AllowedValues rule without `params.values`
   - Asserts `RULE_CONFIGURATION_ERROR` is returned
   - Verifies error message mentions 'values'

3. **Regex_MissingParam_ReturnsConfigurationError**
   - Creates Regex rule without `params.pattern`
   - Asserts `RULE_CONFIGURATION_ERROR` is returned
   - Verifies error message mentions 'pattern'

4. **ArrayLength_MissingBothParams_ReturnsConfigurationError**
   - Creates ArrayLength rule without both `params.min` and `params.max`
   - Asserts `RULE_CONFIGURATION_ERROR` is returned
   - Verifies error message mentions both parameters

5. **CodeSystem_MissingParam_ReturnsConfigurationError**
   - Creates CodeSystem rule without `params.system`
   - Asserts `RULE_CONFIGURATION_ERROR` is returned
   - Verifies error message mentions 'system'

## Error Code Structure

### RULE_CONFIGURATION_ERROR
```typescript
{
  "ruleId": "R123",
  "ruleType": "FixedValue",
  "severity": "error",
  "resourceType": "Patient",
  "path": "Patient.gender",
  "errorCode": "RULE_CONFIGURATION_ERROR",
  "message": "Rule 'R123' (FixedValue) is missing required parameter 'value'. Please configure the rule properly.",
  "details": {
    "ruleType": "FixedValue",
    "missingParams": ["value"]
  },
  "entryIndex": 0,
  "resourceId": "patient-001"
}
```

## Test Results
```
Test Run Successful.
Total tests: 8
     Passed: 8
 Total time: 0.4912 Seconds

New Tests Passed:
✅ FixedValue_MissingParam_ReturnsConfigurationError (3 ms)
✅ AllowedValues_MissingParam_ReturnsConfigurationError (< 1 ms)
✅ Regex_MissingParam_ReturnsConfigurationError (106 ms)
✅ ArrayLength_MissingBothParams_ReturnsConfigurationError (1 ms)
✅ CodeSystem_MissingParam_ReturnsConfigurationError (1 ms)

Existing Tests Still Pass:
✅ Invalid_FHIRPath_Should_Produce_RuleDefinitionError (7 ms)
✅ Invalid_FHIRPath_Should_Not_Stop_Other_Rules (34 ms)
✅ Valid_FHIRPath_Should_Work_Normally (3 ms)
```

## Impact

### Backend Behavior Changes
**Before**:
- Misconfigured rules silently skipped
- No errors generated
- Other rules continued processing
- Users had no feedback about misconfiguration

**After**:
- Misconfigured rules generate `RULE_CONFIGURATION_ERROR`
- Explicit error message indicates which parameters are missing
- Other rules still continue processing (graceful degradation)
- Users receive clear feedback about what to fix

### Frontend Requirements
The frontend must now handle `RULE_CONFIGURATION_ERROR`:

1. **Display in Validation Results**
   - Show configuration errors alongside validation errors
   - Use distinct visual styling (different badge color)
   - Group by rule ID to identify misconfigured rules

2. **Rule Editor Enhancement**
   - Add parameter input fields for each rule type
   - Make parameter fields required based on rule type
   - Validate parameter presence before saving rules
   - Show inline validation errors if parameters missing

3. **Error Message Display**
   - Show full error message with missing parameter names
   - Link to rule editor to fix configuration
   - Highlight misconfigured rules in rule list

## Rule Type Parameter Requirements

| Rule Type      | Required Parameters           | Validation Added |
|----------------|-------------------------------|------------------|
| Required       | None                          | N/A              |
| FixedValue     | `value`                       | ✅               |
| AllowedValues  | `values` (array)              | ✅               |
| Regex          | `pattern`                     | ✅               |
| ArrayLength    | `min` OR `max` (at least one) | ✅               |
| CodeSystem     | `system`                      | ✅               |
| CustomFHIRPath | None                          | N/A              |
| FullUrlIdMatch | None                          | N/A              |

## Alignment with Specifications

This fix aligns with:
- **08_unified_error_model.md** - Adds new error code `RULE_CONFIGURATION_ERROR`
- **03_rule_dsl_spec.md** - Enforces parameter requirements for rule types
- **05_validation_pipeline.md** - Ensures all validation errors are explicit
- **10_do_not_do.md** - Eliminates silent failures

## Next Steps

1. **Frontend Integration**
   - Update validation result display to show configuration errors
   - Add parameter validation to RuleEditorModal
   - Implement required field indicators for rule parameters

2. **Documentation Updates**
   - Update DSL spec with parameter requirements table
   - Add `RULE_CONFIGURATION_ERROR` to unified error model docs
   - Document error handling in frontend integration guide

3. **Additional Testing**
   - Add integration tests with complete validation pipeline
   - Test error display in UI with misconfigured rules
   - Verify rule editor prevents saving incomplete rules

## Build Status
✅ All files compile successfully
✅ All 8 unit tests pass (3 existing + 5 new)
✅ No regression in existing functionality
✅ Ready for integration testing

---
**Implementation Date**: 2025-06-10  
**Modified By**: GitHub Copilot (Claude Sonnet 4.5)  
**Status**: Complete - Ready for Frontend Integration
