---
⚠️ HISTORICAL DOCUMENT  
This phase is complete. Do not use this document as a source of truth for new development.
---

# FHIR Processor V2 — MVP Scope (R5 Only)

**Status:** Cleanup Phase  
**Target:** R5-only validation playground  
**Last Updated:** January 8, 2026

---

## Supported FHIR Version

**R5 Only** (`fhirVersions: ["5.0.0"]`)

This MVP explicitly supports **FHIR R5** and rejects all other versions.

---

## MVP Feature Scope

### ✅ In Scope

1. **Bundle Validation**
   - Input: FHIR R5 Bundle JSON
   - Validation against FHIR R5 core specification
   - Profile validation (Bundle StructureDefinitions)

2. **Simplifier Package Support**
   - Upload Simplifier R5 package (`.zip`)
   - Load StructureDefinitions from package
   - Enforce `"fhirVersions": ["5.0.0"]` from `package.json`
   - Resolve dependencies: `hl7.fhir.r5.core`

3. **Validation Pipeline**
   - JSON syntax validation
   - Structural pre-validation (lightweight)
   - **Firely R5 Validator** (authoritative semantic validation)
   - Business rules (FHIRPath expressions)
   - Terminology validation (CodeSystem)
   - Reference resolution

4. **Public Playground**
   - Anonymous bundle validation
   - Project-based validation with rules
   - Profile selection for Bundle validation
   - Unified error reporting

### ❌ Out of Scope (MVP)

1. **FHIR R4 Support**
   - No R4 validation
   - No R4 packages
   - No R4/R5 dual-mode
   - No R4 → R5 migration tools

2. **Mixed-Version Projects**
   - Cannot mix R4 and R5 in same project
   - No version-agnostic validation
   - No "best effort" mode

3. **Partial Validation**
   - Cannot skip Firely validation
   - Cannot validate without profile selection (when required)
   - No silent fallbacks

4. **Legacy Features**
   - No CPS1 syntax support
   - No duplicate Firely validation
   - No R4 SpecHint catalogs

---

## Technical Constraints

### Firely SDK

**Required Packages:**
```xml
<PackageReference Include="Hl7.Fhir.R5" Version="5.x.x" />
<PackageReference Include="Hl7.Fhir.Specification.R5" Version="5.x.x" />
<PackageReference Include="Hl7.Fhir.Validation" Version="5.x.x" />
```

**NOT ALLOWED:**
```xml
<!-- LEGACY R4 - NOT USED FOR MVP -->
<PackageReference Include="Hl7.Fhir.R4" Version="..." />
<PackageReference Include="Hl7.Fhir.Validation.Legacy.R4" Version="..." />
```

### Validation Authority

**Firely R5 Validator is SOLE semantic authority**

- Layer 1 (JsonNodePreValidator): Syntax/type checking only, non-authoritative
- Layer 2 (Firely R5): Authoritative semantic + profile validation
- Layer 3 (Business Rules): Project-specific constraints

### Input Requirements

**Valid Input:**
```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [...]
}
```

**Package Metadata:**
```json
{
  "name": "example.package",
  "version": "1.0.0",
  "fhirVersions": ["5.0.0"],
  "dependencies": {
    "hl7.fhir.r5.core": "5.0.0"
  }
}
```

**Explicit Rejections:**
- `"fhirVersions": ["4.0.1"]` → Error: "R4 not supported in MVP"
- Missing `fhirVersions` → Error: "Package must declare FHIR version"
- Mixed versions → Error: "Only R5 supported"

---

## Architecture Principles (Preserved)

These remain unchanged during MVP:

1. ✅ POCO Boundary (just R4 → R5 swap)
2. ✅ Layer Separation
3. ✅ Unified Error Model
4. ✅ Fail-Safe Aggregation
5. ✅ BundleProfile Multi-Profile Support
6. ✅ Anonymous Public Validation Flow

---

## Implementation Phases

### Phase 0: Cleanup (Current)
- Remove R4 ambiguity
- Isolate legacy R4 code
- Clarify MVP scope in docs

### Phase 1: Firely R5 Integration
- Replace Firely SDK packages (R4 → R5)
- Rewrite POCO boundaries
- Update ModelInfo references

### Phase 2: Simplifier Package Reader
- Parse `package.json`
- Load StructureDefinitions
- Resolve dependencies

### Phase 3: Profile Validation
- Composite resolver (package + core)
- Bundle profile enforcement
- Public playground with profile selection

### Phase 4: Testing
- R5 test fixtures
- E2E validation scenarios
- Public playground smoke tests

---

## Exit Criteria (MVP Complete)

- [ ] Can validate R5 Bundle JSON against core spec
- [ ] Can upload Simplifier R5 package
- [ ] Can select Bundle profile for validation
- [ ] Firely R5 validator returns accurate errors
- [ ] Public playground works end-to-end
- [ ] No R4 code paths active
- [ ] Documentation reflects R5-only scope

---

## References

- FHIR R5 Spec: https://hl7.org/fhir/R5/
- Simplifier Package Format: https://simplifier.net/docs/package-server
- Firely SDK R5: https://fire.ly/products/firely-net-sdk/

---

**Note:** This scope is for MVP only. Future versions may expand to support R4 alongside R5, but MVP is explicitly R5-only to reduce complexity.
