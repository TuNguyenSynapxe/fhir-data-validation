# STRUCTURE Validation Guardrails — Phase 1

**Version:** 1.0  
**Status:** Active  
**Last Updated:** January 3, 2026

---

## Overview

This document describes the guardrails implemented to protect Phase 1 STRUCTURE validation integrity and prevent accidental regression or misuse.

**Purpose:**
- Prevent weakening of STRUCTURE validation
- Enforce architectural constraints
- Ensure only JsonNodeStructuralValidator emits STRUCTURE errors
- Block duplicate error emissions
- Require test coverage for all error codes

---

## Implemented Guardrails

### 1. Test Enforcement Guardrail

**Test:** `Phase1_AllStructureErrorCodes_MustHaveTestCoverage()`

**Purpose:** Ensures every STRUCTURE error code has documented test coverage.

**Implementation:**
- Documents all 11 Phase 1 error codes
- Maps each error code to its test class
- Fails CI if mapping is incomplete

**Error Codes Verified:**
```csharp
// Rule 1: FHIR id grammar
"FHIR_INVALID_ID_FORMAT"

// Rule 2: string vs markdown
"FHIR_INVALID_STRING_NEWLINE"

// Rule 3: code lexical grammar
"FHIR_INVALID_CODE_LITERAL"

// Rule 4: value[x] exclusivity
"FHIR_MULTIPLE_VALUE_X"

// Rule 5: Reference grammar
"FHIR_INVALID_REFERENCE_FORMAT"
"FHIR_REFERENCE_INVALID_COMBINATION"

// Rule 6: Extension grammar
"FHIR_EXTENSION_MISSING_URL"
"FHIR_EXTENSION_INVALID_SHAPE"

// Rule 7: uri / url / canonical grammar
"FHIR_INVALID_URI"
"FHIR_INVALID_URL"
"FHIR_INVALID_CANONICAL"
```

**Enforcement:**
- Test fails if any error code lacks test coverage documentation
- Requires explicit mapping to test class
- Forces developers to acknowledge new error codes

---

### 2. Authority Guard Guardrail

**Test:** `OnlyJsonNodeStructuralValidator_MayEmitStructureErrors()`

**Purpose:** Enforces that only JsonNodeStructuralValidator may emit `Source = "STRUCTURE"`.

**Architectural Constraint:**
- STRUCTURE errors come from one authority only
- No other component may emit STRUCTURE errors
- Prevents confusion about validation responsibility

**Implementation:**
- Validates STRUCTURE errors come from the designated authority
- Verifies all STRUCTURE errors have `Source == "STRUCTURE"`
- Documents that JsonNodeStructuralValidator is the STRUCTURE authority

**Why This Matters:**
- Single source of truth for grammar validation
- Clear ownership of STRUCTURE errors
- Prevents duplicate validation logic
- Ensures consistent error quality

**How to Detect Violations:**
This test would fail if:
1. Another service emits `Source = "STRUCTURE"`
2. Mixed error sources are returned
3. STRUCTURE errors lack proper source attribution

---

### 3. Duplicate Prevention Guardrail

**Test:** `StructureValidation_MustNotEmitDuplicateErrors()`

**Purpose:** Prevents duplicate STRUCTURE errors for the same path + error code combination.

**Implementation:**
- Groups errors by `Path + ErrorCode`
- Fails if any combination appears multiple times
- Ensures each violation is reported exactly once

**Deduplication Key:**
```csharp
var errorKey = $"{error.Path}|{error.ErrorCode}";
```

**Why This Matters:**
- Improves error readability
- Prevents overwhelming users with duplicates
- Ensures efficient error processing
- Maintains clean error output

**Valid Scenario:**
- Multiple violations of different types at same path: ✅ ALLOWED
- Same violation at different paths: ✅ ALLOWED
- Same violation at same path: ❌ BLOCKED

---

### 4. STRUCTURE Error Properties Guardrail

**Test:** `StructureErrors_MustHaveRequiredProperties()`

**Purpose:** Ensures all STRUCTURE errors have required properties and correct severity.

**Required Properties:**
```csharp
// Mandatory
Source == "STRUCTURE"
Severity == "error"
ErrorCode != null && !string.IsNullOrWhiteSpace(ErrorCode)
Message != null && !string.IsNullOrWhiteSpace(Message)

// At least one path property
Path != null || JsonPointer != null
```

**Enforcement:**
- All STRUCTURE errors must be blocking (`severity = "error"`)
- No advisory STRUCTURE errors allowed
- No missing error codes or messages
- All errors must be locatable via path

**Why This Matters:**
- STRUCTURE errors are blocking by definition
- Ensures errors are actionable
- Provides consistent error structure
- Enables reliable error processing

---

### 5. Phase 1 Error Code Naming Convention Guardrail

**Test:** `Phase1StructureErrors_MustFollowNamingConvention()`

**Purpose:** Enforces consistent error code naming.

**Naming Rules:**
1. All error codes start with `FHIR_`
2. All error codes are UPPERCASE
3. No spaces allowed
4. Use underscores for word separation

**Valid Examples:**
- ✅ `FHIR_INVALID_ID_FORMAT`
- ✅ `FHIR_MULTIPLE_VALUE_X`
- ✅ `FHIR_EXTENSION_MISSING_URL`

**Invalid Examples:**
- ❌ `fhir_invalid_id` (lowercase)
- ❌ `INVALID_ID` (missing prefix)
- ❌ `FHIR INVALID ID` (spaces)

**Why This Matters:**
- Consistent error identification
- Easy to search and filter
- Clear FHIR association
- Professional error codes

---

### 6. No SPEC_HINT from JsonNodeStructuralValidator Guardrail

**Test:** `JsonNodeStructuralValidator_MustNotEmitSpecHint()`

**Purpose:** Ensures JsonNodeStructuralValidator only emits STRUCTURE errors, never advisory hints.

**Constraint:**
- JsonNodeStructuralValidator outputs `Source = "STRUCTURE"` only
- No `Source = "FHIR"` or downgraded severity
- SPEC_HINT comes from other validation layers

**Why This Matters:**
- Clear separation of concerns
- STRUCTURE = blocking grammar errors
- SPEC_HINT = advisory quality warnings
- Prevents confusion about error severity

**Layer Separation:**
```
JsonNodeStructuralValidator → STRUCTURE (blocking)
Firely Validator            → FHIR (may include SPEC_HINT)
Business Rules              → PROJECT (blocking)
```

---

## Phase Lock Comment

The following comment has been added to `JsonNodeStructuralValidator.cs`:

```csharp
//
// ⚠️ PHASE 1 STRUCTURE VALIDATION — LOCKED ⚠️
//
// Phase 1 STRUCTURE coverage is complete (Rules 1-7).
// New grammar rules require Phase 2 proposal and architectural review.
//
// Phase 1 Rules:
//   1. FHIR id grammar
//   2. string vs markdown
//   3. code lexical grammar
//   4. value[x] exclusivity
//   5. Reference grammar
//   6. Extension grammar
//   7. uri / url / canonical grammar
//
// See: /docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md
// Tests: StructureValidationGuardrailTests.cs
//
// Modification Policy:
//   - Bug fixes: allowed with tests + documentation update
//   - New rules: require Phase 2 proposal + version bump
//   - Changes must not weaken existing validation
//   - All 128 Phase 1 tests must continue passing
//
```

**Purpose:**
- Prevents accidental modifications
- Forces developers to review policy
- Documents completion of Phase 1
- Points to documentation and tests

---

## Test Results

### Guardrail Test Summary

```
Test Class: StructureValidationGuardrailTests
Total Tests: 6
Status: ✅ All Passing

1. Phase1_AllStructureErrorCodes_MustHaveTestCoverage ✅
2. OnlyJsonNodeStructuralValidator_MayEmitStructureErrors ✅
3. StructureValidation_MustNotEmitDuplicateErrors ✅
4. StructureErrors_MustHaveRequiredProperties ✅
5. Phase1StructureErrors_MustFollowNamingConvention ✅
6. JsonNodeStructuralValidator_MustNotEmitSpecHint ✅
```

### Complete Phase 1 Test Coverage

```
Total Tests: 134
Status: ✅ All Passing

Phase 1 Grammar Rules:
- Rule 1 (id grammar): 24 tests ✅
- Rule 2 (string vs markdown): 10 tests ✅
- Rule 3 (code lexical): 19 tests ✅
- Rule 4 (value[x] exclusivity): 13 tests ✅
- Rule 5 (Reference grammar): 18 tests ✅
- Rule 6 (Extension grammar): 14 tests ✅
- Rule 7 (uri/url/canonical): 19 tests ✅
- Existing structural: 11 tests ✅
- Guardrails: 6 tests ✅

Subtotal: 134 tests
```

---

## CI Integration

### Recommended CI Checks

```yaml
# .github/workflows/structure-validation.yml

- name: Run STRUCTURE Validation Tests
  run: |
    dotnet test --filter "FullyQualifiedName~StructureValidationGuardrailTests"
    dotnet test --filter "FullyQualifiedName~Fhir*GrammarValidationTests"
    
- name: Verify No Regressions
  run: |
    dotnet test --filter "FullyQualifiedName~JsonNodeStructuralValidatorTests"
```

### Fail Conditions

CI must fail if:
1. Any guardrail test fails
2. Any Phase 1 grammar test fails
3. New STRUCTURE error code added without test coverage
4. Code emits STRUCTURE errors outside JsonNodeStructuralValidator
5. Duplicate STRUCTURE errors detected

---

## Developer Guidelines

### When Adding New STRUCTURE Rules

**STOP. Phase 1 is locked.**

If you believe a new STRUCTURE rule is needed:

1. **Document the proposal**
   - Why is this rule needed?
   - What HL7 grammar does it enforce?
   - Is it truly STRUCTURE (grammar) vs. SPEC_HINT (quality)?

2. **Get architectural review**
   - Review with team leads
   - Assess impact on existing integrations
   - Consider if it belongs in Phase 2

3. **Update documentation**
   - Update `/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md`
   - Bump version number
   - Update CHANGELOG.md

4. **Implement with tests**
   - Write comprehensive test suite (positive + negative cases)
   - Update `StructureValidationGuardrailTests`
   - Add error code to Phase 1 mapping

5. **Update guardrails**
   - Add new error code to test coverage mapping
   - Ensure all 6 guardrail tests still pass
   - Verify no regressions

### When Fixing STRUCTURE Bugs

**Allowed without Phase 2 proposal:**

1. **Fix incorrect validation logic**
   - Update validator implementation
   - Add regression test
   - Update documentation if behavior changes

2. **Improve error messages**
   - Make messages more actionable
   - Add context or examples
   - Update tests if assertions check messages

3. **Fix duplicate emissions**
   - Eliminate redundant checks
   - Ensure guardrail test passes

**Not allowed:**
- Weakening validation (making it less strict)
- Removing error codes
- Changing error severity from "error"
- Emitting STRUCTURE from other components

---

## Maintenance

### Regular Checks

**Monthly:**
- Run all 134 Phase 1 tests
- Verify guardrails still pass
- Check for new STRUCTURE emissions

**Per Release:**
- Review error code catalog
- Update version history if changed
- Verify documentation accuracy

**On Code Changes:**
- Run guardrail tests immediately
- Check for duplicate errors
- Verify test coverage maintained

---

## Appendix: Error Code Catalog

| Error Code | Rule | Test Class | Test Count |
|------------|------|------------|------------|
| `FHIR_INVALID_ID_FORMAT` | 1 | FhirIdGrammarValidationTests | 24 |
| `FHIR_INVALID_STRING_NEWLINE` | 2 | FhirStringMarkdownGrammarValidationTests | 10 |
| `FHIR_INVALID_CODE_LITERAL` | 3 | FhirCodeGrammarValidationTests | 19 |
| `FHIR_MULTIPLE_VALUE_X` | 4 | FhirValueXExclusivityValidationTests | 13 |
| `FHIR_INVALID_REFERENCE_FORMAT` | 5 | FhirReferenceGrammarValidationTests | 18 |
| `FHIR_REFERENCE_INVALID_COMBINATION` | 5 | FhirReferenceGrammarValidationTests | 18 |
| `FHIR_EXTENSION_MISSING_URL` | 6 | FhirExtensionGrammarValidationTests | 14 |
| `FHIR_EXTENSION_INVALID_SHAPE` | 6 | FhirExtensionGrammarValidationTests | 14 |
| `FHIR_INVALID_URI` | 7 | FhirUriUrlCanonicalGrammarValidationTests | 19 |
| `FHIR_INVALID_URL` | 7 | FhirUriUrlCanonicalGrammarValidationTests | 19 |
| `FHIR_INVALID_CANONICAL` | 7 | FhirUriUrlCanonicalGrammarValidationTests | 19 |

**Total Error Codes:** 11  
**Total Test Coverage:** 128 tests (excluding guardrails)

---

**End of Document**

For questions or to propose changes, refer to:
- `/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md` - Main validation specification
- `StructureValidationGuardrailTests.cs` - Guardrail implementation
- `/docs/01_architecture_spec.md` - Overall architecture
