# Multi-Bundle Support Implementation Summary

## Phase 1: Infrastructure Foundation (COMPLETED)

**Date:** January 7, 2026  
**Status:** ✅ Successfully Implemented and Tested

---

## Overview

Implemented multi-bundle support infrastructure without modifying the validation engine. This Phase 1 implementation introduces `BundleProfile` as a first-class domain concept while maintaining full backward compatibility with existing APIs.

---

## What Was Implemented

### 1. Domain Model

**New Entities:**

- **`BundleProfile.cs`** (Playground.Api/Models)
  - Represents a Bundle StructureDefinition profile for validation
  - Properties: Id, ProjectId, Name, Description, CanonicalUrl, StructureDefinitionJson, IsDefault, CreatedAt, UpdatedAt

- **`BundleProfileRecord.cs`** (Persistence/Models)
  - Database entity for bundle_profiles table

### 2. Database Schema

**New Table:** `bundle_profiles`

```sql
CREATE TABLE bundle_profiles (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    canonical_url VARCHAR(500) NOT NULL,
    structure_definition_json TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- ✅ Unique canonical URL per project (`uq_project_canonical`)
- ✅ Only one default profile per project (partial unique index)
- ✅ Indexed for fast lookups (project_id, canonical_url)
- ✅ Cascade delete with projects

**Data Migration:**
- ✅ Existing `projects.sample_bundle_json` migrated to default BundleProfile
- ⚠️ `sample_bundle_json` column preserved for backward compatibility (will be removed in future phase)

### 3. Repository Layer

**New Interface:** `IBundleProfileRepository`

Methods:
- `GetByProjectIdAsync()` - List all profiles for a project
- `GetDefaultByProjectIdAsync()` - Get default profile
- `GetByIdAsync()` - Get specific profile by ID
- `CreateAsync()`, `UpdateAsync()`, `DeleteAsync()` - CRUD operations

**Implementation:** `PostgresBundleProfileRepository`
- Dapper-based queries
- Full logging support
- Async/await throughout

### 4. API Enhancements

**New Endpoint:**

```http
GET /api/public/projects/{slug}/bundle-profiles
```

Returns list of available bundle profiles for a project:

```json
[
  {
    "id": "uuid",
    "name": "Patient Bundle Profile",
    "description": "Validates patient-centric bundles",
    "canonicalUrl": "http://hl7.sg/fhir/StructureDefinition/sg-patient-bundle",
    "isDefault": true,
    "createdAt": "2026-01-07T00:00:00Z"
  }
]
```

**Extended Endpoint:**

```http
POST /api/public/projects/{slug}/validate
```

**Request Body (Extended):**

```json
{
  "bundleJson": "{ ... }",
  "bundleProfileId": "uuid",  // ← NEW (optional)
  "fhirVersion": "R4",
  "validationMode": "standard"
}
```

**Behavior:**
- ✅ If `bundleProfileId` is provided → Uses specified profile
- ✅ If `bundleProfileId` is null → Uses default profile for project
- ✅ If no default profile exists → Validation proceeds without profile (backward compatible)

### 5. DI Registration

Added to `Program.cs`:

```csharp
builder.Services.AddScoped<IBundleProfileRepository>(sp =>
{
    var connString = builder.Configuration.GetConnectionString("PostgreSQL");
    var logger = sp.GetRequiredService<ILogger<PostgresBundleProfileRepository>>();
    return new PostgresBundleProfileRepository(connString!, logger);
});
```

---

## Backward Compatibility Verification

### ✅ Anonymous Validation (Unchanged)

```http
POST /api/validate
Body: { "bundleJson": "..." }
```

**Status:** ✅ Works unchanged (no bundle profile support needed)

### ✅ Project Validation (Backward Compatible)

```http
POST /api/public/projects/{slug}/validate
Body: { "bundleJson": "..." }  // No bundleProfileId
```

**Status:** ✅ Works with existing behavior (uses default profile if available)

### ✅ Existing Projects

- ✅ Projects without bundle profiles continue to work
- ✅ Migrated projects have default bundle profile
- ✅ No breaking changes to Project model

---

## Testing Results

### Test 1: Bundle Profile Listing

```bash
curl http://localhost:5000/api/public/projects/draft-medication/bundle-profiles
```

**Result:** ✅ Returns list of profiles

```json
[
  {
    "id": "9a414020-a972-4e41-b6d1-df2f0473564b",
    "name": "Medication Validation (Draft) - Default Bundle",
    "description": "Migrated from existing sample bundle",
    "canonicalUrl": "http://hl7.org/fhir/StructureDefinition/Bundle",
    "isDefault": true,
    "createdAt": "2026-01-07T08:58:48.120255Z"
  }
]
```

### Test 2: Validation Without Profile Selection

```bash
curl -X POST http://localhost:5000/api/public/projects/draft-medication/validate \
  -d '{"bundleJson": "{\"resourceType\":\"Bundle\",\"type\":\"collection\",\"entry\":[]}"}'
```

**Result:** ✅ Uses default profile, validation succeeds

### Test 3: Validation With Explicit Profile

```bash
curl -X POST http://localhost:5000/api/public/projects/draft-medication/validate \
  -d '{"bundleJson": "...", "bundleProfileId": "9a414020-a972-4e41-b6d1-df2f0473564b"}'
```

**Result:** ✅ Uses specified profile, validation succeeds

### Test 4: Anonymous Validation

```bash
curl -X POST http://localhost:5000/api/validate \
  -d '{"bundleJson": "{\"resourceType\":\"Bundle\",\"type\":\"collection\",\"entry\":[]}"}'
```

**Result:** ✅ Works unchanged (no regression)

---

## What Was NOT Changed (As Mandated)

### ✅ Validation Engine (`Pss.FhirProcessor.Engine`)

- ❌ No modifications to ValidationPipeline
- ❌ No modifications to FirelyValidationService
- ❌ No modifications to ValidationRequest
- ✅ Engine remains DLL-ready and stateless

### ✅ Existing Validation Semantics

- ✅ POCO boundary intact
- ✅ Firely authority unchanged
- ✅ Layer 3 separation preserved
- ✅ Error model unchanged

### ✅ Existing APIs

- ✅ Anonymous validation unchanged
- ✅ Admin project management unchanged
- ✅ Validation routing logic compatible

---

## Known Limitations (Phase 1)

### 🟡 Bundle Profile SD Not Passed to Engine

**Current State:** Bundle profile StructureDefinition JSON is loaded but NOT passed to validation engine.

**Reason:** `ValidationRequest` does not have a field for profile SD. Engine modifications require Phase 2.

**Code Evidence:**

```csharp
// PublicProjectsController.ValidateProject() - Line ~343
// NOTE: profileStructureDefinitionJson is loaded but NOT passed to engine in Phase 1
// Phase 1 focus: Infrastructure for multi-bundle support (table, repository, API)
// Future Phase: Add ProfileStructureDefinitionJson field to ValidationRequest
var engineRequest = new ValidationRequest
{
    BundleJson = request.BundleJson,
    FhirVersion = request.FhirVersion,
    ValidationMode = request.ValidationMode,
    RulesJson = rulesJson,
    CodeSystemsJson = codeSystemsJson
    // TODO: Add ProfileStructureDefinitionJson once engine supports it
};
```

**Impact:** Bundle profile validation against custom SDs will not work until Phase 2.

### 🟡 `sample_bundle_json` Column Still Exists

**Current State:** Column preserved for backward compatibility during transition.

**Future Phase:** Remove column after verifying stability (Phase 1.5 or Phase 2).

---

## Database State After Migration

**Before Migration:**

| projects table | bundle_profiles table |
|----------------|----------------------|
| ✅ Has sample_bundle_json | ❌ Does not exist |

**After Migration:**

| projects table | bundle_profiles table |
|----------------|----------------------|
| ⚠️ Still has sample_bundle_json (deprecated) | ✅ Created with default profiles |

**Migrated Data:**

- ✅ 1 project with sample_bundle_json migrated to bundle_profiles
- ✅ Default profile flag set to TRUE
- ✅ Canonical URL set to `http://hl7.org/fhir/StructureDefinition/Bundle`

---

## Files Created

**Domain Models:**
- `backend/src/Pss.FhirProcessor.Playground.Api/Models/BundleProfile.cs`
- `backend/src/Pss.FhirProcessor.Persistence/Models/BundleProfileRecord.cs`

**DTOs:**
- `backend/src/Pss.FhirProcessor.Playground.Api/Dtos/Validation/BundleProfileDto.cs`

**Repositories:**
- `backend/src/Pss.FhirProcessor.Persistence/Repositories/IBundleProfileRepository.cs`
- `backend/src/Pss.FhirProcessor.Persistence/Repositories/PostgresBundleProfileRepository.cs`

**Database:**
- `backend/database/init/004_bundle_profiles.sql`

---

## Files Modified

**Controllers:**
- `backend/src/Pss.FhirProcessor.Playground.Api/Controllers/PublicProjectsController.cs`
  - Added bundle profile repository injection
  - Added `GET /{slug}/bundle-profiles` endpoint
  - Extended `POST /{slug}/validate` with profile selection logic

**DTOs:**
- `backend/src/Pss.FhirProcessor.Playground.Api/Dtos/Validation/ValidateRequest.cs`
  - Added optional `BundleProfileId` property

**DI Configuration:**
- `backend/src/Pss.FhirProcessor.Playground.Api/Program.cs`
  - Added BundleProfileRepository registration

---

## Next Steps (Future Phases)

### Phase 2: Engine Integration

**Goal:** Pass Bundle profile SD to validation engine

**Required Changes:**
1. Add `ProfileStructureDefinitionJson` field to `ValidationRequest` (Engine)
2. Update ValidationPipeline to use profile SD for Firely validation
3. Update PublicProjectsController to pass profile SD to engine
4. Test profile validation with custom SDs

**Risk:** 🟡 Medium (requires engine modification but architecture is ready)

### Phase 3: Frontend Support

**Goal:** Add UI for bundle profile selection

**Required Changes:**
1. Create `<BundleProfileSelector>` component
2. Update `ProjectValidatePage.tsx` to fetch and display profiles
3. Pass selected `bundleProfileId` to validation API
4. Show profile name in validation results

**Risk:** 🟢 Low (UI-only changes)

### Phase 4: Simplifier ZIP Upload

**Goal:** Support uploading Simplifier packages

**Required Changes:**
1. Add `POST /api/admin/projects/{id}/upload-package` endpoint
2. Extract SDs from ZIP
3. Create bundle profiles for each Bundle SD found
4. Store SDs in `structure_definition_json` column

**Risk:** 🟡 Medium (new functionality)

---

## Success Criteria (Phase 1)

### ✅ All Criteria Met

- ✅ **Multi-bundle infrastructure exists** (table, repository, API)
- ✅ **Backward compatible** (existing APIs work unchanged)
- ✅ **Validation engine untouched** (no modifications to Engine project)
- ✅ **Database migration successful** (data migrated, no data loss)
- ✅ **New endpoints functional** (bundle-profiles listing works)
- ✅ **Profile selection works** (explicit or default profile loading)
- ✅ **Tests pass** (anonymous + project validation verified)

---

## Audit Compliance

**Compliance with Audit Recommendations:**

| Audit Requirement | Status | Evidence |
|-------------------|--------|----------|
| Do NOT modify Engine | ✅ PASS | No files in Pss.FhirProcessor.Engine changed |
| Do NOT change validation semantics | ✅ PASS | Validation logic unchanged, engine receives same inputs |
| Do NOT remove backward compatibility | ✅ PASS | Anonymous + project validation work unchanged |
| Do NOT rename "Project" | ✅ PASS | Project model unchanged |
| Add BundleProfile entity | ✅ PASS | Created in Models/ |
| Add database migration | ✅ PASS | 004_bundle_profiles.sql created and applied |
| Update repositories | ✅ PASS | IBundleProfileRepository + implementation created |
| Update API routing (additive only) | ✅ PASS | New endpoint added, existing endpoints extended |
| Ensure backward compatibility | ✅ PASS | All tests pass |

---

## Refactor Readiness Assessment (Post-Phase 1)

**Current State:** 🟢 **READY FOR PHASE 2**

**Why:**
- ✅ Infrastructure layer is stable and tested
- ✅ Database schema supports multi-bundle
- ✅ API surface is backward compatible
- ✅ Validation engine is architecturally ready (no coupling to projects)

**Confidence Level:** **HIGH** - Phase 2 (engine integration) can proceed safely.

---

**END OF PHASE 1 IMPLEMENTATION SUMMARY**
