# Phase 1: Firely R5 Integration — Status Report

**Date:** January 8, 2026  
**Status:** 🔄 IN PROGRESS (90% complete)

---

## ✅ Completed

### 1. NuGet Package Migration
- ✅ Replaced `Hl7.Fhir.R4` → `Hl7.Fhir.R5` (v5.11.1)
- ✅ Replaced `Hl7.Fhir.Specification.R4` → `Hl7.Fhir.Specification.R5` (v5.11.1)
- ✅ Removed `Hl7.Fhir.Validation.Legacy.R4` (R4 legacy validator)
- ✅ Packages restore successfully

### 2. Core Validation Service (R5)
- ✅ Created `FirelyR5ValidationService.cs` — Core R5 validation service
  - Parses R5 Bundle JSON → R5 POCOs
  - Basic structural validation
  - Returns OperationOutcome
  - Profile enforcement deferred to future phase (as instructed)
- ✅ Archived `FirelyValidationService.cs` → `FirelyValidationService.cs.r4_obsolete`
  - Old R4 validation service excluded from compilation
  - Preserved for reference

### 3. Dependency Injection
- ✅ Updated `EngineServiceCollectionExtensions.cs`
  - `IFirelyValidationService` now resolves to `FirelyR5ValidationService`
  - Comment added: "// Phase 1: R5 only"

### 4. R5 MVP Runtime Guardrail
- ✅ Added version check in `ValidationPipeline.ValidateAsync()`
  - Step 0.5: Enforces `fhirVersion == "R5"`
  - Returns error `MVP_VERSION_NOT_SUPPORTED` if R4 or other version requested
  - Uses `SupportedFhir.MvpFhirVersion` constant
  - NO silent coercion or fallbacks

### 5. POCO Breaking Changes (Partial)
- ✅ Fixed `FhirEnumIndex.cs` — Commented out `Encounter.EncounterStatus` (R5 enum structure changed)
  - TODO marker added for Phase 1 completion
  - Does NOT block core validation
- ✅ Updated `TestHelper.CreateFirelyValidationService()` to use R5 service

---

## ⚠️ Remaining Work (Test Fixtures Only)

### R4→R5 POCO Differences in Test Files
**Scope:** Test data construction only (not validation logic)

#### Affected Test Files (10 compile errors):
1. `SpecHintEncounterTests.cs` (2 errors)
   - `Encounter.Period` property access
   - `Encounter.EncounterStatus` enum reference

2. `TestHelper.cs` (2 errors)
   - `Encounter.EncounterStatus` enum
   - `Encounter.Class` type changed (Coding → List<CodeableConcept>)

3. `SmartPathNavigationServiceTests.cs` (2 errors)
   - `Encounter.EncounterStatus` inline initialization

4. `ReferenceResolverTests.cs` (1 error)
   - `Encounter.ParticipantComponent.Individual` property (renamed or removed in R5)

5. `SpecHintInstanceScopedTests.cs` (3 errors)
   - `Encounter.EncounterStatus` enum
   - `Encounter.Class` type change

#### R5 POCO Changes Identified:
- `Encounter.Status`: Property exists but enum type location may have changed
- `Encounter.Class`: Changed from `Coding` to `List<CodeableConcept>` in R5
- `Encounter.Period`: May have been renamed or restructured
- `Encounter.ParticipantComponent.Individual`: Renamed or removed in R5 spec

---

## 📋 Phase 1 Exit Criteria Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| Solution builds successfully | ⚠️ 10 test errors | Test fixture POCOs only, not validation logic |
| No R4 Firely packages referenced | ✅ | R4 packages removed, R5 packages active |
| R5 Bundle JSON validates | ✅ | `FirelyR5ValidationService` parses R5 POCOs |
| Errors from Firely R5 Validator | 🔄 | Basic validation works; full R5 validator integration pending |
| UnifiedErrorModel still used | ✅ | OperationOutcome → ValidationError path unchanged |
| Legacy R4 services not called | ✅ | DI wired to R5 service only |
| ValidationPipeline order unchanged | ✅ | Pipeline logic untouched |
| R5 MVP guardrail active | ✅ | Runtime version check enforced |

---

## 🛠️ Next Steps (Priority Order)

### A. Fix Test Fixture POCOs (10 errors)
**Approach:** Update test data construction to use R5 POCO syntax
- Replace `Encounter.EncounterStatus` with R5 equivalent
- Update `Encounter.Class` from `Coding` to `List<CodeableConcept>`
- Fix `Encounter.Period` and `Participant.Individual` property access
- Estimated: 30-60 minutes

**Alternative (if R5 POCOs unavailable):**
- Use Patient/Observation test fixtures instead of Encounter
- Comment out Encounter-based tests temporarily
- Document as "R5 Encounter tests deferred"

### B. Implement Full Firely R5 Validator
**Current State:** FirelyR5ValidationService uses basic POCO validation
**Goal:** Integrate full Firely R5 Validator SDK

Steps:
1. Identify R5 Validator API in `Hl7.Fhir.Specification.R5`
2. Replace basic validation with Firely SDK validation
3. Ensure OperationOutcome includes detailed R5 errors
4. Test with R5 Bundle containing violations

---

## 🎯 Phase 1 Completion Estimate

- **Current Progress:** 90%
- **Blocking:** 10 test fixture compile errors
- **Time to Complete:** 30-60 minutes (test fixture updates)
- **Alternative Path:** 10 minutes (comment out Encounter tests, defer to Phase 2)

---

## 📝 Notes

### Design Decisions
1. **R4 Legacy Code:** Renamed to `.r4_obsolete` extension to exclude from compilation while preserving for reference
2. **Profile Validation:** Intentionally deferred to future phase (per Phase 1 instructions)
3. **MVP Guardrail:** Added as explicit runtime check, not silent coercion
4. **Encounter Enum Index:** Temporarily excluded from FhirEnumIndex (does not block validation)

### Breaking Changes (R4→R5)
- Enum types moved from nested classes to top-level or different namespaces
- Encounter resource structure changed (Period, Class, Participant properties)
- Some CodeableConcept fields changed from single to List<>

---

**Recommendation:** Complete test fixture updates (Option A) to achieve full Phase 1 compliance. If blocked, use Option B (defer Encounter tests) and proceed to Phase 2.
