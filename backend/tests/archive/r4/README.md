# Archived R4 Tests

**Archived:** January 8, 2026  
**Reason:** R5 MVP Cleanup Phase

## Files in This Archive

### ProfileEnforcementTests.cs
- **Purpose:** Integration tests for Firely SDK profile constraint enforcement
- **R4 Dependency:** Uses `Hl7.Fhir.Model.StructureDefinition` (R4), `FhirJsonParser` (R4)
- **Why Archived:** Tests R4-specific profile validation behavior
- **Restoration:** Will need R5 equivalents when Phase 1 (Firely R5 Integration) completes

### ValidationPipelineTests.cs
- **Purpose:** End-to-end validation pipeline integration tests
- **R4 Dependency:** Fixtures use `FhirVersion = "R4"`, R4 POCOs for test setup
- **Why Archived:** Tests R4 validation flow
- **Restoration:** Will need R5 test fixtures and updated validation requests

## Active Tests (Not Archived)

The following test categories remain active because they are version-agnostic:

- **Concurrency Tests** — Thread safety, parallel validation
- **Orchestration Tests** — Validation request routing, error aggregation
- **Rule Engine Tests** — FHIRPath business rule evaluation
- **Navigation Tests** — SmartPathNavigationService (JSON Pointer resolution)
- **Pre-validation Tests** — JsonNodePreValidator (syntax checking)
- **CodeMaster Tests** — Code system validation logic
- **Reference Tests** — FHIR reference resolution
- **Unified Error Model Tests** — Error classification and deduplication

## Restoration Plan

When Phase 1 (Firely R5 Integration) is complete:

1. Replace `Hl7.Fhir.R4` imports with `Hl7.Fhir.R5`
2. Update test fixtures to use R5 resource structures
3. Update `FhirVersion = "R4"` → `"R5"` in validation requests
4. Verify Firely R5 SDK behavior matches R4 test expectations
5. Move files back to active test directory
6. Run full test suite to confirm R5 compatibility

## Notes

- These files are **NOT deleted** — they are preserved for reference
- They may serve as templates for R5 test creation
- Version-agnostic test logic should be extracted and reused
- Do not modify these files; create new R5 equivalents instead

---

**See:** `/docs/CLEANUP_NOTES.md` for complete cleanup documentation
