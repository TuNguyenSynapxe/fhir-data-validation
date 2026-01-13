# Phase 10.0 Quick Reference — StructureDefinition Promotion

**Last Updated**: 2026-01-10  
**Status**: Production Ready  

---

## 📖 Overview

**What**: Automatic StructureDefinition classification and promotion during FHIR package import  
**Why**: Populate SD-centric UI with actionable profiles (not all 100+ SDs in a package)  
**How**: Explicit rule-based classification at import time (NO heuristics)

---

## 🎯 3 Categories

| Category | Role | Promoted? | Rules Generated? | Visible in UI? |
|----------|------|-----------|------------------|----------------|
| **A** | ValidationProfile | ✅ Yes | ✅ Yes | ✅ Yes |
| **B** | BundleProfile | ✅ Yes | ❌ No | ✅ Yes (dropdown) |
| **C** | SupportingArtifact | ❌ No | ❌ No | ❌ No |

---

## 📋 Classification Rules

### Category A: ValidationProfile

```yaml
Criteria:
  - kind == "resource"
  - type != null AND type != "Bundle"
  - abstract != true

Examples:
  - Patient profiles
  - Observation profiles
  - Practitioner profiles

Behavior:
  - IsPromoted = true
  - Auto-rules generated
  - Visible in SD list
```

### Category B: BundleProfile

```yaml
Criteria:
  - type == "Bundle"
  - Canonical URL in Bundle.meta.profile

Examples:
  - Bundle profiles used by example bundles

Behavior:
  - IsPromoted = true
  - NO auto-rules (bundles don't need rules)
  - Selectable in bundle profile dropdown
```

### Category C: SupportingArtifact

```yaml
Criteria:
  - Everything else

Examples:
  - Extensions (kind="complex-type")
  - Logical models (kind="logical")
  - Abstract base definitions (abstract=true)
  - Unreferenced bundle profiles

Behavior:
  - IsPromoted = false
  - NO auto-rules
  - Hidden from UI
```

---

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `StructureDefinitionRole.cs` | Enum (3 categories) |
| `StructureDefinitionClassifier.cs` | Classification logic |
| `ProjectArtifact.cs` | Storage (role + isPromoted) |
| `ProjectImportService.cs` | Import integration |

---

## 💻 Code Examples

### Backend: Query Promoted SDs

```csharp
var promotedSDs = await _dbContext.ProjectArtifacts
    .Where(a => a.ProjectId == projectId && 
                a.ArtifactType == ArtifactType.StructureDefinition &&
                a.IsPromoted == true)
    .OrderBy(a => a.FileName)
    .ToListAsync();
```

### Backend: Query by Role

```csharp
var validationProfiles = await _dbContext.ProjectArtifacts
    .Where(a => a.ProjectId == projectId && 
                a.StructureDefinitionRole == StructureDefinitionRole.ValidationProfile)
    .ToListAsync();
```

### Frontend: Filter Promoted SDs

```typescript
const promotedSDs = artifacts.filter(a => 
  a.type === 'StructureDefinition' && a.isPromoted === true
);
```

---

## 📊 Expected Results

### Typical FHIR Package (PSS-Profiles-R5)

```
Total SDs:               127
Category A (promoted):    18  (14%)
Category B (promoted):     5  (4%)
Category C (hidden):     104  (82%)

Total Promoted:           23  (18%)
Auto-rules Generated:     18  (Category A only)
```

---

## 🚨 Constraints

| Constraint | Status |
|------------|--------|
| **No Heuristics** | ✅ Only explicit FHIR fields used |
| **No Content Analysis** | ✅ No snapshot/differential parsing |
| **No Validation Engine Changes** | ✅ Import-time only |
| **Deterministic** | ✅ Same input = same output |
| **Explainable** | ✅ Every classification has a `Reason` |

---

## 🧪 Testing

### Unit Tests (12 total)
```bash
cd backend
dotnet test --filter "FullyQualifiedName~StructureDefinitionClassifierTests"
```

**Expected Output**:
```
Passed!  - Failed: 0, Passed: 12, Skipped: 0, Total: 12
```

---

## 🗄️ Database Schema

**Migration**: `20260110140831_Phase10_0_SD_Promotion`

**New Columns in `project_artifacts`**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `StructureDefinitionRole` | `integer` | Yes | 0=ValidationProfile, 1=BundleProfile, 2=SupportingArtifact |
| `IsPromoted` | `boolean` | Yes | True for Category A & B, False for C |

---

## 🔄 Import Flow (Updated)

```
1. Parse package manifest
2. Extract JSON files
3. Classify artifacts (all types)
4. Identify bundles
5. Extract bundle profile URLs                    ← NEW
6. Classify StructureDefinitions                  ← NEW
7. Generate rules (ValidationProfile only)        ← MODIFIED
8. Persist artifacts (with SD role/promotion)     ← MODIFIED
9. Create project graph
```

---

## 📝 Logs Example

```
[INFO] StructureDefinition classification complete:
  - 127 SDs total
  - 23 promoted (18 validation profiles, 5 bundle profiles)
  - 104 supporting artifacts

[DEBUG] SD Classification: MyPatient.json 
  -> ValidationProfile (Promoted: True)
  - Reason: Category A: Validation Profile (kind=resource, type=Patient)

[DEBUG] SD Classification: MyExtension.json 
  -> SupportingArtifact (Promoted: False)
  - Reason: Category C: Supporting Artifact (kind=complex-type, type=Extension)
```

---

## 🐛 Troubleshooting

### Issue: SD not promoted (expected promotion)

**Check**:
1. Is `kind == "resource"`?
2. Is `type` field present and != "Bundle"?
3. Is `abstract == true` (base definitions)?
4. Check logs for classification reason

### Issue: Bundle profile not promoted

**Check**:
1. Is SD `type == "Bundle"`?
2. Is canonical URL referenced in any `Bundle.meta.profile`?
3. Do example bundles exist in package?

### Issue: Too many SDs promoted

**Check**:
1. Verify abstract SDs are excluded
2. Check for incorrect `kind` fields in SDs
3. Review classification logs

---

## 🚀 Usage (Post-Import)

### Backend API Response

```json
{
  "projectId": "...",
  "artifactCount": 127,
  "promotedSdCount": 23,      // NEW
  "ruleCount": 18              // ValidationProfile count
}
```

### Frontend Query (SD List)

```typescript
// Get all promoted SDs for display
const sds = useQuery({
  queryKey: ['promotedSDs', projectId],
  queryFn: () => getPromotedStructureDefinitions(projectId)
});

// Filter by role
const validationProfiles = sds.data?.filter(
  sd => sd.sdRole === 'ValidationProfile'
);

const bundleProfiles = sds.data?.filter(
  sd => sd.sdRole === 'BundleProfile'
);
```

---

## ⚡ Performance

**Import Time Impact**: +5-10ms per SD (negligible)  
**Database Impact**: 2 new nullable columns (no indexes needed)  
**Query Performance**: No change (filter by `ArtifactType` first)

---

## 📚 Related Phases

- **Phase 7.2**: FHIR package import (baseline)
- **Phase 8.3**: Bundle profile resolution
- **Phase 9.6**: SD-centric UI (frontend)
- **Phase 10.0**: SD promotion (backend) ← YOU ARE HERE

---

## ✅ Checklist (Deployment)

- [ ] Run database migration: `dotnet ef database update`
- [ ] Re-import test projects to populate new columns
- [ ] Verify SD counts in logs
- [ ] Check UI shows promoted SDs
- [ ] Verify auto-rule counts increased

---

## 📖 Full Documentation

See `PHASE_10.0_COMPLETE.md` for:
- Detailed implementation notes
- Test coverage report
- Classification examples
- Integration details
- Acceptance criteria audit

---

**Quick Start**:
1. Import FHIR package → SDs classified automatically
2. Check logs for promotion counts
3. Query promoted SDs via API
4. Frontend displays only actionable profiles

**Zero Configuration Required** — works out of the box!
