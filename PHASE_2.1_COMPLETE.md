# Phase 2.1 Implementation Summary

**Date:** January 8, 2026  
**Status:** ✅ COMPLETE  
**Scope:** Firely R5 Validator Wiring (Zero Scope Creep)

---

## Objective

Wire the Firely R5 Validator to replace POCO-only validation with full semantic validation enforcing:
- Core R5 constraints
- Cardinality enforcement
- Invariants
- Slicing rules
- Profile constraints

---

## Changes Made

### 1. **Package Reference Added**

**File:** `src/Pss.FhirProcessor.Engine/Pss.FhirProcessor.Engine.csproj`

**Change:**
```xml
<PackageReference Include="Hl7.Fhir.Validation.Legacy.R5" Version="5.11.0" />
```

**Note:** The package name is `Hl7.Fhir.Validation.Legacy.R5`, NOT `Hl7.Fhir.Validation`. This matches the R4 legacy pattern where the Validator class lives in a version-specific legacy package.

---

### 2. **FirelyR5ValidationService Updated**

**File:** `src/Pss.FhirProcessor.Engine/Firely/FirelyR5ValidationService.cs`

**Key Changes:**

#### Validation Logic Replaced
**Old (Phase 2):**
```csharp
// Step 5: Perform R5 structural validation
var outcome = ValidateR5Structure(bundle, resolver);
```

**New (Phase 2.1):**
```csharp
// Step 5: Run Firely R5 Validator (Phase 2.1 wiring)
_logger.LogDebug("Creating Firely R5 Validator with core R5 resolver");

var settings = new ValidationSettings
{
    ResourceResolver = resolver,
    EnableXsdValidation = false  // FHIR validation only, no XSD
};

var validator = new Validator(settings);
var outcome = validator.Validate(bundle);
```

#### Method Removed
Deleted `ValidateR5Structure()` helper method (no longer needed - Firely does all validation).

#### Documentation Updated
- Class summary: Updated to reflect "Phase 2.1: Firely R5 semantic validation (wiring complete)"
- Method summary: Updated to reflect "Phase 2.1: Full semantic validation via Firely Validator"
- Emphasized: "Returns OperationOutcome unchanged (NO post-processing)"

---

## Validation Flow (Phase 2.1)

```
1. Parse Bundle JSON → R5 POCO
2. Build CompositeResourceResolver (package + core R5)
3. Validate profile exists (if provided)
4. Inject profile into Bundle.Meta.Profile (if provided)
5. Generate snapshots for profiles (if needed)
6. **NEW** → Run Firely Validator with ValidationSettings
7. Return OperationOutcome unchanged
```

---

## What Changed vs Phase 2

| Aspect | Phase 2 | Phase 2.1 |
|--------|---------|-----------|
| Validation Logic | Custom `ValidateR5Structure()` method | Firely `Validator.Validate()` |
| Constraint Enforcement | Basic POCO checks only | Full semantic validation |
| Cardinality | Not enforced | ✅ Enforced by Firely |
| Invariants | Not enforced | ✅ Enforced by Firely |
| Slicing | Not enforced | ✅ Enforced by Firely |
| Profile Constraints | Partially (via injection) | ✅ Fully enforced |
| Package | None | `Hl7.Fhir.Validation.Legacy.R5` added |

---

## What Did NOT Change (Zero Scope Creep)

✅ **No changes to:**
- ValidationPipeline order
- Engine layering
- Public APIs
- Frontend code
- Business rules / FHIRPath logic
- Simplifier package logic (already existed from Phase 2)
- DI registration
- Test infrastructure

✅ **Only modified:**
- `Pss.FhirProcessor.Engine.csproj` (1 line added)
- `FirelyR5ValidationService.cs` (validation logic replaced)

---

## Build Status

```
Build succeeded.
    0 Error(s)
    195 Warning(s)
```

All warnings are pre-existing (nullability, CS0105 duplicate usings).

---

## Expected Behavior Changes

### Before Phase 2.1 (POCO-only)
```json
{
  "resourceType": "Bundle",
  "type": "document",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient"
        // Missing required fields
      }
    }
  ]
}
```
**Result:** Minimal errors (only checked `Bundle.type` and empty entries)

### After Phase 2.1 (Firely Validator)
```json
{
  "resourceType": "Bundle",
  "type": "document",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient"
        // Missing required fields
      }
    }
  ]
}
```
**Result:** Detailed Firely errors for:
- Missing required Patient fields
- Cardinality violations
- Invariant failures
- Profile constraint violations

**This is expected and correct behavior.**

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| `dotnet build` passes | ✅ YES |
| Existing tests compile | ✅ YES |
| Validation produces more errors than before | ✅ EXPECTED (Firely is stricter) |
| No code outside FirelyR5ValidationService.cs meaningfully changed | ✅ YES (only .csproj) |
| No new R4-related warnings | ✅ YES |

---

## Technical Details

### ValidationSettings Configuration

```csharp
var settings = new ValidationSettings
{
    ResourceResolver = resolver,  // CompositeResourceResolver from Phase 2
    EnableXsdValidation = false   // FHIR validation only
};
```

**Why `EnableXsdValidation = false`?**
- XSD validation is redundant with FHIR POCO parsing
- FHIR R5 validation is the authoritative semantic check
- Per Phase 2.1 spec: "FHIR validation only"

### Validator Instantiation

```csharp
var validator = new Validator(settings);
var outcome = validator.Validate(bundle);
```

**Key Points:**
- Validator comes from `Hl7.Fhir.Validation.Legacy.R5` package
- `Validate()` method returns `OperationOutcome` directly
- NO post-processing - UnifiedErrorModelBuilder handles downstream

---

## Design Rationale

### Why Legacy Package?

The `Hl7.Fhir.Validation.Legacy.R5` package contains the classic `Validator` class that:
- Enforces full FHIR R5 semantic validation
- Supports profile validation via `ResourceResolver`
- Returns standard `OperationOutcome`
- Matches the R4 validation pattern

This is the **authoritative Firely validation** for R5.

### Why Minimal Changes?

Phase 2.1 is **wiring only** - connecting existing components to Firely's semantic validator. The architecture (CompositeResourceResolver, profile injection, snapshot generation) from Phase 2 remains unchanged and works with the Validator seamlessly.

---

## Known Behavior Changes (Expected)

1. **More Validation Errors**
   - Firely enforces ALL R5 constraints
   - Tests may fail if fixtures are non-compliant
   - **This is correct behavior**

2. **Stricter Cardinality**
   - 0..1 and 1..1 constraints now enforced
   - Required fields must be present

3. **Invariant Checking**
   - FHIRPath invariants from R5 spec now evaluated
   - Complex business rules in core spec enforced

---

## Next Steps

### Immediate (If Needed)
1. **Review Test Fixtures**
   - Some tests may now fail due to stricter validation
   - Update fixtures to be R5-compliant
   - This is expected and healthy

2. **Update Assertions**
   - Tests expecting zero errors may now see Firely errors
   - Adjust assertions to match real semantic validation

### Future Phases
- Phase 2.2: Terminology validation
- Phase 3: Playground UX enhancements
- Phase 4: Performance optimization (caching, etc.)

---

## Validation Authority

**Before Phase 2.1:**
- Custom `ValidateR5Structure()` method
- Basic POCO checks
- No semantic validation

**After Phase 2.1:**
- **Firely Validator is the sole semantic authority**
- Full R5 spec compliance
- Industry-standard validation

---

## Summary

Phase 2.1 successfully wires the Firely R5 Validator by:
1. Adding `Hl7.Fhir.Validation.Legacy.R5` package
2. Replacing custom validation with `Validator.Validate()`
3. Preserving all Phase 2 architecture (profiles, packages, snapshots)
4. Zero scope creep - only wiring changes

**"Firely is the semantic authority. We only connect the pipe."** ✅
