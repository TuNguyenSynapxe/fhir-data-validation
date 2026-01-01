# QuestionAnswer Contract v1 Implementation — COMPLETE

## Overview
QuestionAnswer rules now use a **constraint-driven model** where the error code is determined automatically at runtime based on the validation outcome. Authors no longer manually select error codes during rule authoring.

## Backend Changes

### 1. Governance Exemption for Missing ErrorCode
**File:** `backend/src/Pss.FhirProcessor.Engine/Governance/RuleReviewEngine.cs`

**Change:** Modified `CheckMissingErrorCode` method to exempt QuestionAnswer rules from blocking when errorCode is missing.

```csharp
// Line ~103-122
private void CheckMissingErrorCode(Rule rule, List<RuleIssue> issues)
{
    // QuestionAnswer rules determine errorCode at runtime based on validation outcome
    if (rule.Type == "QuestionAnswer")
    {
        return;
    }
    
    if (string.IsNullOrWhiteSpace(rule.ErrorCode))
    {
        issues.Add(new RuleIssue
        {
            Code = "MISSING_ERROR_CODE",
            Severity = "BLOCKED",
            Message = "Rule must specify an errorCode"
        });
    }
}
```

### 2. Semantic Stability Scope Adjustment
**Change:** Removed QuestionAnswer from semantic stability scope in `CheckSemanticStability`.

```csharp
// Line ~125-162
private void CheckSemanticStability(Rule rule, List<RuleIssue> issues)
{
    var scopedTypes = new HashSet<string>
    {
        "FhirPath",
        "Conditional",
        "Reference",
        "Terminology",
        "Cardinality"
        // "QuestionAnswer" REMOVED from scope
    };
    
    if (!scopedTypes.Contains(rule.Type))
    {
        return;
    }
    // ...
}
```

### 3. Warning for Provided ErrorCode
**Change:** Added new `CheckQuestionAnswerProvidedErrorCode` method to issue WARNING (not BLOCKED) when errorCode is provided.

```csharp
// Line ~257-285
private void CheckQuestionAnswerProvidedErrorCode(Rule rule, List<RuleIssue> issues)
{
    if (rule.Type != "QuestionAnswer")
    {
        return;
    }

    if (!string.IsNullOrWhiteSpace(rule.ErrorCode))
    {
        issues.Add(new RuleIssue
        {
            Code = "QUESTIONANSWER_ERROR_CODE_IGNORED",
            Severity = "WARNING",
            Message = "QuestionAnswer rules determine errorCode automatically at runtime. " +
                     "The provided errorCode will be ignored. Remove it to eliminate this warning. " +
                     "Possible runtime error codes: ANSWER_REQUIRED, INVALID_ANSWER_VALUE, " +
                     "ANSWER_OUT_OF_RANGE, ANSWER_NOT_IN_VALUESET, QUESTION_NOT_FOUND, QUESTIONSET_DATA_MISSING."
        });
    }
}
```

### 4. Pipeline Integration
**Change:** Wired new check into `Review()` pipeline in WARNING section.

```csharp
// Line ~47-73
public RuleReviewResult Review(Rule rule)
{
    var issues = new List<RuleIssue>();

    // === BLOCKED checks ===
    CheckDanglingInstanceScope(rule, issues);
    CheckMissingErrorCode(rule, issues);
    CheckSemanticStability(rule, issues);
    CheckReferenceCircularity(rule, issues);

    // === WARNING checks ===
    CheckSuspiciousFhirPath(rule, issues);
    CheckQuestionAnswerProvidedErrorCode(rule, issues); // <-- NEW

    var blocked = issues.Any(i => i.Severity == "BLOCKED");
    var hasWarnings = issues.Any(i => i.Severity == "WARNING");

    return new RuleReviewResult
    {
        Status = blocked ? "BLOCKED" : hasWarnings ? "WARNING" : "OK",
        Issues = issues
    };
}
```

### 5. Governance Tests
**File:** `backend/tests/Pss.FhirProcessor.Engine.Tests/Governance/RuleReviewEngineTests.cs`

**Test 1: Missing ErrorCode Allowed**
```csharp
// Line ~281-304
[Fact]
public void QuestionAnswerRule_WithMissingErrorCode_IsAllowed()
{
    // Arrange
    var engine = new RuleReviewEngine();
    var rule = new Rule
    {
        Id = "qa-test-1",
        Type = "QuestionAnswer",
        Name = "Test QuestionAnswer Rule",
        ErrorCode = "", // Missing errorCode
        Severity = "error",
        ResourceType = "Observation"
    };

    // Act
    var result = engine.Review(rule);

    // Assert
    Assert.NotEqual("BLOCKED", result.Status);
    Assert.DoesNotContain(result.Issues, i => i.Code == "MISSING_ERROR_CODE");
}
```

**Test 2: Provided ErrorCode Issues Warning**
```csharp
// Line ~306-329
[Fact]
public void QuestionAnswerRule_WithProvidedErrorCode_IsWarning_NotBlocked()
{
    // Arrange
    var engine = new RuleReviewEngine();
    var rule = new Rule
    {
        Id = "qa-test-2",
        Type = "QuestionAnswer",
        Name = "Test QuestionAnswer Rule",
        ErrorCode = "INVALID_ANSWER_VALUE", // Provided errorCode
        Severity = "error",
        ResourceType = "Observation"
    };

    // Act
    var result = engine.Review(rule);

    // Assert
    Assert.Equal("WARNING", result.Status);
    Assert.Contains(result.Issues, i => 
        i.Code == "QUESTIONANSWER_ERROR_CODE_IGNORED" && 
        i.Severity == "WARNING");
}
```

**Test Results:**
```
Passed! - Failed: 0, Passed: 2, Skipped: 0, Total: 2
```

## Frontend Changes

### 1. Removed CARDINALITY Constraint
**File:** `frontend/src/components/playground/Rules/rule-types/question-answer/QuestionAnswerConstraint.types.ts`

**Changes:**
- Removed `| 'CARDINALITY'` from `QuestionAnswerConstraint` type union (line 15)
- Removed `CARDINALITY: 'ANSWER_MULTIPLE_NOT_ALLOWED'` from `CONSTRAINT_TO_ERROR_CODE` (line 26)
- Removed `ANSWER_MULTIPLE_NOT_ALLOWED: 'CARDINALITY'` from `ERROR_CODE_TO_CONSTRAINT` (line 36)
- Removed CARDINALITY entry from `CONSTRAINT_METADATA` array (lines 72-77)

**Reason:** Backend never emits `ANSWER_MULTIPLE_NOT_ALLOWED` error code. CARDINALITY was a phantom constraint with no runtime implementation.

### 2. Fixed TYPE Constraint Error Code Mapping
**File:** `frontend/src/components/playground/Rules/rule-types/question-answer/QuestionAnswerConstraint.types.ts`

**Before:**
```typescript
TYPE: 'INVALID_ANSWER_TYPE'
```

**After:**
```typescript
TYPE: 'INVALID_ANSWER_VALUE' // Backend emits INVALID_ANSWER_VALUE (not INVALID_ANSWER_TYPE)
```

**Reason:** Aligns frontend mapping with actual backend error code emission.

### 3. Updated Runtime Error Code Info Panel
**File:** `frontend/src/components/playground/Rules/rule-types/question-answer/QuestionAnswerRuleForm.tsx`

**Before:** "Runtime Behavior" panel with 3 example error codes

**After:** "Runtime Error Code (Automatic)" panel listing all 6 possible error codes:

```tsx
{/* Runtime Error Code (Automatic) - Contract v1 */}
{constraint && (
  <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 mb-4">
    <div className="font-semibold mb-2 flex items-center gap-2">
      <HelpCircle className="w-4 h-4" />
      Runtime Error Code (Automatic)
    </div>
    <div className="space-y-1 text-blue-800">
      <div>
        The error code is determined automatically at runtime based on the validation outcome. Possible error codes:
      </div>
      <ul className="list-disc ml-4 mt-2 space-y-0.5">
        <li><code>ANSWER_REQUIRED</code> — Required answer missing</li>
        <li><code>INVALID_ANSWER_VALUE</code> — Answer type/format mismatch</li>
        <li><code>ANSWER_OUT_OF_RANGE</code> — Numeric value outside range</li>
        <li><code>ANSWER_NOT_IN_VALUESET</code> — Code not in allowed ValueSet</li>
        <li><code>QUESTION_NOT_FOUND</code> — Question not in QuestionSet</li>
        <li><code>QUESTIONSET_DATA_MISSING</code> — QuestionSet data unavailable</li>
      </ul>
    </div>
  </div>
)}
```

### 4. Verified Error Message Mapping
**File:** `frontend/src/constants/errorMessages.ts`

**Status:** ✅ VERIFIED — All 6 QuestionAnswer error codes have complete message definitions in `QuestionAnswerErrorMessages` record:
- `INVALID_ANSWER_VALUE` (lines 616-643)
- `ANSWER_OUT_OF_RANGE` (lines 645-677)
- `ANSWER_NOT_IN_VALUESET` (lines 679-704)
- `ANSWER_REQUIRED`
- `QUESTION_NOT_FOUND`
- `QUESTIONSET_DATA_MISSING`

## Runtime Error Code Taxonomy

| Error Code | Constraint | Description |
|-----------|-----------|-------------|
| `ANSWER_REQUIRED` | REQUIRED | Required answer missing from bundle |
| `INVALID_ANSWER_VALUE` | TYPE | Answer type/format does not match expected type |
| `ANSWER_OUT_OF_RANGE` | RANGE | Numeric answer value outside allowed min/max range |
| `ANSWER_NOT_IN_VALUESET` | VALUESET | Coded answer not found in allowed ValueSet |
| `QUESTION_NOT_FOUND` | (Any) | Question linkId not found in QuestionSet definition |
| `QUESTIONSET_DATA_MISSING` | (Any) | QuestionSet data unavailable at validation time |

## Behavioral Changes

### Before Contract v1
- Authors manually selected errorCode during rule authoring
- CARDINALITY constraint available (non-functional phantom)
- TYPE constraint mapped to `INVALID_ANSWER_TYPE` (mismatch with backend)
- errorCode field required (blocked if missing)

### After Contract v1
- Authors select constraint only (errorCode determined at runtime)
- CARDINALITY constraint removed (phantom)
- TYPE constraint maps to `INVALID_ANSWER_VALUE` (aligned with backend)
- errorCode field optional (missing = OK, provided = WARNING)
- Runtime info panel shows all 6 possible error codes with explanations

## Testing Status

### Backend
- ✅ Governance test: Missing errorCode allowed (PASSING)
- ✅ Governance test: Provided errorCode issues WARNING (PASSING)
- ✅ Build: 0 errors
- ✅ Test execution: 2/2 passing

### Frontend
- ✅ Build: Successful (0 errors)
- ✅ TypeScript compilation: Clean
- ✅ Constraint types: Updated and consistent
- ✅ Error message mappings: Verified complete

## Acceptance Criteria

| Criterion | Status |
|----------|--------|
| Backend: QuestionAnswer missing errorCode not blocked | ✅ PASS |
| Backend: QuestionAnswer provided errorCode receives WARNING | ✅ PASS |
| Backend: 2 governance tests passing | ✅ PASS |
| Frontend: CARDINALITY constraint removed | ✅ PASS |
| Frontend: TYPE → INVALID_ANSWER_VALUE mapping fixed | ✅ PASS |
| Frontend: Runtime error code info panel updated | ✅ PASS |
| Frontend: INVALID_ANSWER_VALUE message mapping verified | ✅ PASS |
| Frontend: Build successful | ✅ PASS |

## Migration Impact

### Existing Rules
- **No breaking changes** — Existing QuestionAnswer rules with hardcoded errorCode will continue to work
- **WARNING issued** — Authors will see governance warning suggesting removal of errorCode
- **Runtime behavior unchanged** — Engine still emits appropriate error code based on validation outcome

### New Rules
- Authors must select constraint (REQUIRED, TYPE, RANGE, or VALUESET)
- errorCode field omitted during authoring
- Runtime engine determines errorCode based on actual validation failure

## Files Modified

### Backend (4 files)
1. `backend/src/Pss.FhirProcessor.Engine/Governance/RuleReviewEngine.cs`
2. `backend/tests/Pss.FhirProcessor.Engine.Tests/Governance/RuleReviewEngineTests.cs`

### Frontend (3 files)
1. `frontend/src/components/playground/Rules/rule-types/question-answer/QuestionAnswerConstraint.types.ts`
2. `frontend/src/components/playground/Rules/rule-types/question-answer/QuestionAnswerRuleForm.tsx`
3. `frontend/src/constants/errorMessages.ts` (verified, no changes needed)

## Documentation

This implementation follows specifications in:
- `/docs/03_rule_dsl_spec.md` (Rule DSL structure)
- `/docs/05_validation_pipeline.md` (Validation behavior)
- `/docs/08_unified_error_model.md` (Error taxonomy)

## Next Steps (Optional Enhancements)

1. **Legacy Rule Migration Tool:** Script to remove errorCode from existing QuestionAnswer rules
2. **E2E Testing:** Create/validate QuestionAnswer rule without errorCode in UI
3. **Documentation Update:** Update user-facing docs explaining constraint-driven model
4. **Telemetry:** Track WARNING frequency for errorCode usage patterns

---
**Status:** ✅ COMPLETE  
**Date:** 2025  
**Tests:** 2/2 Backend Passing | Frontend Build Successful  
**Breaking Changes:** None
