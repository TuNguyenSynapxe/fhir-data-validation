# SPEC_HINT → STRUCTURE: Corrective Implementation Plan

## Executive Summary

**Current State**: Implementation creates duplicate STRUCTURE errors for missing required fields.

**Root Cause**: BaseRuleClassifier upgrades SpecHint issues to STRUCTURE, but JsonNodeStructuralValidator ALREADY emits STRUCTURE errors for the same violations.

**Solution**: Refine BaseRuleClassifier to ONLY upgrade violations that JsonNodeStructuralValidator doesn't handle.

---

## Corrective Actions

### Action #1: Update BaseRuleClassifier Logic
**Priority**: CRITICAL

**Change**: Remove unconditional required fields from upgrade list, since JsonNodeStructuralValidator handles them.

**Keep STRUCTURE Upgrades For**:
- JSON grammar violations not yet handled by JsonNodeStructuralValidator:
  - Multiple value[x] present (FHIR spec violation)
  - reference as object instead of string
  - Primitive wrapped as `{ value: ... }`
  
**Remove From Upgrade**:
- All `Min >= 1` validations (JsonNodeStructuralValidator handles these)
- Examples: Observation.status, Encounter.class, etc.

**Result**: No duplicates, proper division of responsibility.

---

### Action #2: Reorder ValidationPipeline
**Priority**: HIGH

**Current Order**:
```
1. SpecHint (line 134)
2. JsonNodeStructuralValidator (line 149)
```

**Correct Order**:
```
1. JsonNodeStructuralValidator (PRIMARY)
2. SpecHint (ADVISORY)
```

**Rationale**: Primary authority runs first, advisory supplements.

---

### Action #3: Simplify BaseRuleClassifier
**Priority**: MEDIUM

**New Logic**:
```csharp
// ONLY upgrade rules for violations JsonNodeStructuralValidator doesn't handle
if (issue.IsConditional) return SPEC_HINT;
if (IsJsonGrammarViolation(issue)) return STRUCTURE;  // NEW
return SPEC_HINT;  // Default to advisory
```

---

## Implementation Strategy

### Option A: Minimal Fix (RECOMMENDED)
1. Clear `UnconditionalRequiredFields` list in BaseRuleClassifier
2. Keep classifier for future JSON grammar validations
3. Reorder validation pipeline
4. Document that required fields are handled by JsonNodeStructuralValidator

### Option B: Remove BaseRuleClassifier
1. Delete BaseRuleClassifier entirely
2. Revert UnifiedErrorModelBuilder changes
3. All SpecHint issues remain advisory
4. Future STRUCTURE upgrades added to JsonNodeStructuralValidator

### Option C: Complete Refactor
1. Move BaseRuleClassifier logic into JsonNodeStructuralValidator
2. JsonNodeStructuralValidator handles ALL structural validations
3. SpecHint remains pure advisory
4. Most correct but highest effort

---

## Recommended: Option A Implementation

### Step 1: Update BaseRuleClassifier

```csharp
// Remove unconditional required fields - JsonNodeStructuralValidator handles these
private static readonly HashSet<string> UnconditionalRequiredFields = new()
{
    // EMPTY - JsonNodeStructuralValidator validates all Min >= 1 fields
};

// Add JSON grammar violation detection (future)
private static readonly HashSet<string> JsonGrammarViolations = new()
{
    // Future: add violations not yet handled by JsonNodeStructuralValidator
    // Examples:
    // - Multiple value[x] present
    // - reference as object
    // - Primitive wrapping violations
};
```

### Step 2: Reorder ValidationPipeline

```csharp
// Step 1.9: JSON Node Structural Validation (Phase A) - PRIMARY
var structuralErrors = await _structuralValidator.ValidateAsync(...);
response.Errors.AddRange(structuralErrors);

// Step 2.0: SpecHint (Advisory) - SECONDARY
if (validationMode == ValidationMode.FullAnalysis)
{
    var specHintIssues = await _specHintService.CheckAsync(...);
    var specHintErrors = await _errorBuilder.FromSpecHintIssuesAsync(...);
    response.Errors.AddRange(specHintErrors);
}
```

### Step 3: Update Documentation

- Update BaseRuleClassifier docs to clarify it's for JSON grammar only
- Update SpecHintService docs to clarify it's advisory only
- Update ValidationPipeline docs to show correct order

---

## Verification After Fix

### Test Case 1: Missing Required Field
**Input**: Bundle with Observation missing `status`

**Expected**:
- 1x STRUCTURE error from JsonNodeStructuralValidator
- 0x errors from SpecHint (or 1x SPEC_HINT if advisory guidance)
- Total: 1 blocking error

**Current (Broken)**:
- 1x STRUCTURE from JsonNodeStructuralValidator
- 1x STRUCTURE from SpecHint→Classifier
- Total: 2 blocking errors (DUPLICATE)

### Test Case 2: Conditional Requirement
**Input**: Bundle with Patient.communication present but missing `.language`

**Expected**:
- 0x errors from JsonNodeStructuralValidator (doesn't validate conditionals)
- 1x SPEC_HINT (warning) from SpecHint
- Total: 1 advisory warning

### Test Case 3: JSON Grammar Violation
**Input**: Bundle with coding as object instead of array

**Expected**:
- 1x STRUCTURE from JsonNodeStructuralValidator (already handles)
- 0x from SpecHint
- Total: 1 blocking error

---

## Success Criteria

✅ Zero duplicate errors for missing required fields  
✅ JsonNodeStructuralValidator is primary authority  
✅ SpecHint provides advisory guidance only  
✅ Validation pipeline order is correct  
✅ All tests pass  
✅ No regressions in valid bundle handling  

---

## Timeline

- Fix Implementation: 30 minutes
- Testing: 15 minutes
- Documentation: 15 minutes
- Total: 1 hour

---

## Decision Required

**Question**: Which option should we implement?

**Recommendation**: Option A (Minimal Fix)
- Fastest to implement
- Least risk
- Preserves BaseRuleClassifier for future use
- Clear separation of concerns

**Next Step**: Await approval to proceed with Option A.
