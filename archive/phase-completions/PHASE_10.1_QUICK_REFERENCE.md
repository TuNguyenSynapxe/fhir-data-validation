# Phase 10.1 Quick Reference

**Phase 10.1**: Expose Promoted StructureDefinitions via Read-Only API  
**Status**: ✅ COMPLETE

---

## TL;DR

Phase 10.1 adds **one new API endpoint** to expose Phase 10.0's promoted SDs:

```http
GET /api/v2/projects/{projectId}/structure-definitions
→ Returns list of promoted SDs (ValidationProfile + BundleProfile only)
```

**Zero frontend changes needed**. Phase 9.6 UI automatically works.

---

## API Endpoint

### GET /api/v2/projects/{projectId}/structure-definitions

**Description**: Returns all promoted StructureDefinitions for a project.

**Request**:
```http
GET /api/v2/projects/00000000-0000-0000-0000-000000000001/structure-definitions HTTP/1.1
Host: localhost:5000
Accept: application/json
```

**Response (200 OK)**:
```json
[
  {
    "artifactId": "11111111-1111-1111-1111-111111111111",
    "name": "My Patient Profile",
    "canonicalUrl": "http://example.com/StructureDefinition/MyPatient",
    "resourceType": "Patient",
    "role": "ValidationProfile"
  }
]
```

**Response (404 Not Found)**:
```json
{
  "error": "Project with ID {projectId} not found"
}
```

**Empty List (Valid)**:
```json
[]
```
*Project exists but has no promoted SDs.*

---

## Filtering Logic

```csharp
// Only promoted SDs are returned
IsPromoted == true

// Only ValidationProfile and BundleProfile (no SupportingArtifacts)
StructureDefinitionRole != null

// Only StructureDefinitions (no ValueSets, CodeSystems, etc.)
ArtifactType == StructureDefinition
```

**Result**: Supporting artifacts are excluded from the API response.

---

## Response Model

```csharp
public sealed record ProjectStructureDefinitionDto
{
    public Guid ArtifactId { get; init; }
    public string Name { get; init; }               // title → name → filename
    public string CanonicalUrl { get; init; }       // SD canonical URL
    public string ResourceType { get; init; }       // Patient, Observation, Bundle, etc.
    public StructureDefinitionRole Role { get; init; } // ValidationProfile or BundleProfile
}
```

### Name Extraction Priority
1. **title** field from SD JSON (preferred)
2. **name** field from SD JSON (fallback)
3. **filename** without `.json` (last resort)

---

## Role Enum

```csharp
public enum StructureDefinitionRole
{
    ValidationProfile = 1,  // Promoted + rules generated
    BundleProfile = 2,      // Promoted + no rules
    SupportingArtifact = 3  // Not promoted (excluded from API)
}
```

**API Returns**: Only `ValidationProfile` and `BundleProfile`.

---

## Code Locations

| Component | File Path |
|-----------|-----------|
| **DTO** | `Pss.FhirProcessor.Playground.Api/Dtos/ProjectStructureDefinitionDto.cs` |
| **Query Service** | `Pss.FhirProcessor.Application/Projects/Queries/ProjectStructureDefinitionQueryService.cs` |
| **Controller** | `Pss.FhirProcessor.Playground.Api/Controllers/ProjectQueryController.cs` |
| **DI Registration** | `Pss.FhirProcessor.Playground.Api/Program.cs` |
| **Unit Tests** | `Pss.FhirProcessor.Application.Tests/Projects/Queries/ProjectStructureDefinitionQueryServiceTests.cs` |

---

## Testing

### Run Unit Tests
```bash
cd backend
dotnet test --filter "ProjectStructureDefinitionQueryServiceTests"
```

**Expected**: 10/10 tests pass

### Manual Testing
```bash
# Start backend
cd backend/src/Pss.FhirProcessor.Playground.Api
dotnet run

# In another terminal
curl http://localhost:5000/api/v2/projects/{projectId}/structure-definitions
```

---

## Integration with Phase 9.6 UI

**Before Phase 10.1**:
```
Phase 9.6 UI → GET /structure-definitions → 404 → "No SDs found"
```

**After Phase 10.1**:
```
Phase 9.6 UI → GET /structure-definitions → 200 OK → Shows SD cards
```

**No frontend changes needed** - the UI already has the integration code.

---

## Database Query

```csharp
_dbContext.ProjectArtifacts
    .Where(a => a.ProjectId == projectId &&
               a.ArtifactType == ArtifactType.StructureDefinition &&
               a.IsPromoted == true &&
               a.StructureDefinitionRole != null)
    .OrderBy(a => a.FileName)
```

**Indexes Used**:
- `IX_ProjectArtifacts_ProjectId` (existing)
- `IX_ProjectArtifacts_ArtifactType` (existing)

**Performance**: O(N) where N = total artifacts in project. Efficient for <1000 artifacts.

---

## Example Scenarios

### Scenario 1: Typical Package
**Input**: Import R5 package with:
- 5 resource profiles (Patient, Observation, etc.)
- 2 bundle profiles (document, message)
- 3 extension definitions

**Output**: API returns 7 SDs (5 ValidationProfile + 2 BundleProfile)

### Scenario 2: Extensions Only
**Input**: Import package with only extension definitions

**Output**: API returns empty list `[]` (extensions are SupportingArtifacts)

### Scenario 3: New Project
**Input**: Project created, no packages imported

**Output**: API returns empty list `[]`

---

## Key Constraints

1. ✅ **Read-Only**: No mutations
2. ✅ **No Heuristics**: Uses Phase 10.0 fields only
3. ✅ **Backend Only**: Zero frontend changes
4. ✅ **RESTful**: Standard HTTP semantics
5. ✅ **Empty List Valid**: Project may have zero promoted SDs

---

## Troubleshooting

### API returns empty list `[]`
**Possible causes**:
1. Project has no StructureDefinitions
2. All SDs are SupportingArtifacts (e.g., extensions)
3. Project was imported before Phase 10.0 (no classification data)

**Fix for #3**: Re-import the package to trigger Phase 10.0 classification.

### API returns 404
**Cause**: Project ID doesn't exist in database

**Fix**: Verify project ID with `GET /api/v2/projects`

### SD name shows filename
**Cause**: SD JSON lacks `title` and `name` fields

**Expected**: Filename fallback is correct behavior

---

## Quick Reference Table

| HTTP Method | Endpoint | Returns | Status Codes |
|-------------|----------|---------|--------------|
| `GET` | `/api/v2/projects/{id}/structure-definitions` | `List<ProjectStructureDefinitionDto>` | 200, 404 |

**Query Parameters**: None  
**Request Body**: None  
**Authentication**: Not implemented (future)

---

## Related Phases

- **Phase 10.0**: Classification at import-time (writes `IsPromoted` + `StructureDefinitionRole`)
- **Phase 10.1**: Read model API (reads `IsPromoted` + `StructureDefinitionRole`) ← **YOU ARE HERE**
- **Phase 9.6**: SD-centric UI (consumes Phase 10.1 API)

---

## Summary

**Phase 10.1** is a minimal read model layer:
- **1 new endpoint**: `GET /structure-definitions`
- **1 new DTO**: `ProjectStructureDefinitionDto`
- **1 new query service**: `ProjectStructureDefinitionQueryService`
- **10 unit tests**: All passing ✅
- **0 frontend changes**: Phase 9.6 UI automatically works

**Status**: ✅ PRODUCTION READY

---

**Full Documentation**: [PHASE_10.1_COMPLETE.md](PHASE_10.1_COMPLETE.md)
