# RuleType Normalization — Hardening Summary

## Problem Solved

**Before**: Inconsistent ruleType strings from the UI caused valid rules to fall into the generic fallback template with medium confidence, even for high-confidence rule types like Required, FixedValue, and ArrayLength.

**Example Issues**:
```
ArrayLength    → ✅ Matched
ARRAY_LENGTH   → ❌ Fell to fallback (medium confidence)
array-length   → ❌ Fell to fallback (medium confidence)
Cardinality    → ❌ Fell to fallback (medium confidence)
```

## Solution

Added **NormalizeRuleType()** helper that:
1. Removes underscores (`_`)
2. Removes hyphens (`-`)
3. Removes spaces
4. Upper-cases all text

```csharp
private static string NormalizeRuleType(string ruleType)
{
    if (string.IsNullOrEmpty(ruleType)) return string.Empty;
    
    return ruleType
        .Replace("_", "")
        .Replace("-", "")
        .Replace(" ", "")
        .ToUpperInvariant();
}
```

## Expanded Switch Matching

### Template 1: Required (High Confidence)
**Matches**:
- `Required`
- `REQUIRED`
- `required`
- `REQUIRED_FIELD` → normalized to `REQUIREDFIELD` (still matches `REQUIRED` substring)

### Template 2: FixedValue (High Confidence)
**Matches**:
- `FixedValue`
- `FIXED_VALUE`
- `fixed-value`
- `FixedValue`

### Template 3: AllowedValues (High Confidence)
**Matches**:
- `AllowedValues`
- `ALLOWED_VALUES`
- `allowed-values`
- `AllowedValues`

### Template 4: Regex (Medium Confidence)
**Matches**:
- `Regex`
- `REGEX`
- `Pattern`
- `PATTERN`

### Template 5: ArrayLength (High Confidence) ⭐ NEW ALIASES
**Matches**:
- `ArrayLength`
- `ARRAY_LENGTH`
- `array-length`
- **`Cardinality`** ← NEW
- **`CARDINALITY`** ← NEW
- **`ArraySize`** ← NEW
- **`ARRAY_SIZE`** ← NEW

### Template 6: CodeSystem (Medium Confidence) ⭐ NEW ALIAS
**Matches**:
- `CodeSystem`
- `CODE_SYSTEM`
- `code-system`
- **`ValueSet`** ← NEW
- **`VALUE_SET`** ← NEW
- **`value-set`** ← NEW

### Template 7: CustomFHIRPath (Low Confidence)
**Matches**:
- `CustomFHIRPath`
- `CUSTOM_FHIR_PATH`
- `custom-fhir-path`
- `FHIRPath`
- `FHIR_PATH`

## Impact

### Before Fix
```
UI sends: "ARRAY_LENGTH"
Backend: ToUpperInvariant() → "ARRAY_LENGTH"
Switch: No match for "ARRAY_LENGTH"
Result: ❌ Fallback template (medium confidence, generic text)
```

### After Fix
```
UI sends: "ARRAY_LENGTH"
Backend: NormalizeRuleType() → "ARRAYLENGTH"
Switch: Matches "ARRAYLENGTH" case
Result: ✅ ArrayLength template (high confidence, specific guidance)
```

## Confidence Guarantees

After this fix, the following rule types **always** return high confidence:

| Rule Type | Normalized Form | Confidence | Template |
|-----------|-----------------|------------|----------|
| Required | `REQUIRED` | **high** | Template 1 |
| FixedValue | `FIXEDVALUE` | **high** | Template 2 |
| AllowedValues | `ALLOWEDVALUES` | **high** | Template 3 |
| ArrayLength | `ARRAYLENGTH` | **high** | Template 5 |
| Cardinality | `CARDINALITY` → `ARRAYLENGTH` | **high** | Template 5 |
| ArraySize | `ARRAYSIZE` → `ARRAYLENGTH` | **high** | Template 5 |

Medium confidence rule types:

| Rule Type | Normalized Form | Confidence | Template |
|-----------|-----------------|------------|----------|
| Regex | `REGEX` | **medium** | Template 4 |
| Pattern | `PATTERN` → `REGEX` | **medium** | Template 4 |
| CodeSystem | `CODESYSTEM` | **medium** | Template 6 |
| ValueSet | `VALUESET` → `CODESYSTEM` | **medium** | Template 6 |

Low confidence rule types:

| Rule Type | Normalized Form | Confidence | Template |
|-----------|-----------------|------------|----------|
| CustomFHIRPath | `CUSTOMFHIRPATH` | **low** | Template 7 |
| FHIRPath | `FHIRPATH` → `CUSTOMFHIRPATH` | **low** | Template 7 |

## Testing

### Manual Verification

Run the following scenarios in the UI:

1. **Create ArrayLength rule with snake_case**:
   ```
   RuleType: ARRAY_LENGTH
   Path: Patient.name
   Min: 1, Max: 5
   ```
   **Expected**: High confidence badge, "how many items" message

2. **Create Cardinality rule**:
   ```
   RuleType: Cardinality
   Path: Patient.contact
   Min: 0, Max: 10
   ```
   **Expected**: High confidence badge, "how many items" message

3. **Create ValueSet rule**:
   ```
   RuleType: VALUE_SET
   Path: Patient.maritalStatus
   CodeSystem: http://...
   ```
   **Expected**: Medium confidence badge, "correct code system" message

4. **Create kebab-case rule**:
   ```
   RuleType: fixed-value
   Path: Patient.gender
   ExpectedValue: male
   ```
   **Expected**: High confidence badge, "fixed value" message

### Automated Tests

Created comprehensive test suite in:
```
tests/Pss.FhirProcessor.Engine.Tests/Services/ValidationExplanationServiceNormalizationTests.cs
```

Test coverage:
- ✅ Required variants (4 test cases)
- ✅ ArrayLength variants (7 test cases including aliases)
- ✅ FixedValue variants (3 test cases)
- ✅ AllowedValues variants (3 test cases)
- ✅ CodeSystem variants (6 test cases including ValueSet alias)
- ✅ Regex variants (4 test cases)
- ✅ CustomFHIRPath variants (5 test cases)
- ✅ Metadata injection (4 test cases)
- ✅ Unknown ruleType fallback (1 test case)

**Total**: 37 test cases

## Files Changed

### Modified
1. **ValidationExplanationService.cs**
   - Added `NormalizeRuleType()` private method
   - Updated `GenerateFromTemplate()` to use normalization
   - Expanded switch cases with aliases
   - Added inline comments for clarity

### Created
2. **ValidationExplanationServiceNormalizationTests.cs**
   - Comprehensive test suite for all variants
   - Metadata injection tests
   - Fallback behavior tests

3. **test-normalization.csx** (verification script)
   - Quick validation of normalization logic
   - Switch mapping visualization

## Backward Compatibility

✅ **No breaking changes**:
- Existing camelCase/PascalCase ruleTypes still work
- Normalization only expands support, doesn't remove it
- Fallback behavior unchanged for truly unknown types

## Documentation Updates

This change aligns with the existing documentation:
- **TEMPLATE_BASED_EXPLANATIONS.md**: Already specifies confidence levels per rule type
- **Rule DSL Spec** (`/docs/03_rule_dsl_spec.md`): No changes needed (backend-only fix)

## Related Issues

Fixes inconsistencies where UI-generated rule types (from dropdowns, imports, or copy-paste) use different casing/separator conventions than backend expects.

---

**Status**: ✅ Complete — Build succeeded
**Date**: 2024-12-21
**Impact**: High-confidence rule types now reliably return high-confidence explanations regardless of UI formatting
