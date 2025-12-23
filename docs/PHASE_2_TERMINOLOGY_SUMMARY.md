# Phase 2 Implementation Summary: Backend Services & Rule Advisory

## 🎉 Summary of Changes

Phase 2 successfully implements backend services for terminology authoring and rule advisory detection, building upon the domain models created in Phase 1.

### **Delivered Components**

#### **PART A: Terminology Services**

1. **ITerminologyService** ([Interfaces/ITerminologyService.cs](backend/src/Pss.FhirProcessor.Engine/Interfaces/ITerminologyService.cs))
   - `GetCodeSystemByUrlAsync` - Retrieve CodeSystem by canonical URL
   - `ListCodeSystemsAsync` - List all CodeSystems for a project
   - `SaveCodeSystemAsync` - Create or overwrite CodeSystem (last-write-wins)
   - `DeleteCodeSystemAsync` - Remove CodeSystem (no cascade)
   - `FindConceptAsync` - Search for concept by system + code (recursive)

2. **IConstraintService** ([Interfaces/IConstraintService.cs](backend/src/Pss.FhirProcessor.Engine/Interfaces/IConstraintService.cs))
   - `GetConstraintByIdAsync` - Retrieve constraint by ID
   - `ListConstraintsAsync` - List all constraints for a project
   - `ListConstraintsByResourceTypeAsync` - Filter by FHIR resource type
   - `ListConstraintsByCodeSystemAsync` - Find constraints referencing a CodeSystem
   - `SaveConstraintAsync` - Create or overwrite constraint (last-write-wins)
   - `DeleteConstraintAsync` - Remove constraint

3. **TerminologyService Implementation** ([Services/Terminology/TerminologyService.cs](backend/src/Pss.FhirProcessor.Engine/Services/Terminology/TerminologyService.cs))
   - File-based JSON storage: `{baseDataPath}/{projectId}/terminology/{url-based-filename}.json`
   - Recursive concept search for hierarchical CodeSystems
   - Safe filename generation from URLs
   - Comprehensive logging

4. **ConstraintService Implementation** ([Services/Terminology/ConstraintService.cs](backend/src/Pss.FhirProcessor.Engine/Services/Terminology/ConstraintService.cs))
   - File-based JSON storage: `{baseDataPath}/{projectId}/constraints/terminology-constraints.json`
   - All constraints for a project in single file (simple structure)
   - Filtering by resource type and CodeSystem URL
   - Comprehensive logging

#### **PART B: Rule Advisory Model**

5. **RuleAdvisory Model** ([Models/Terminology/RuleAdvisory.cs](backend/src/Pss.FhirProcessor.Engine/Models/Terminology/RuleAdvisory.cs))
   ```csharp
   public class RuleAdvisory
   {
       public required string AdvisoryCode { get; set; }
       public AdvisorySeverity Severity { get; set; }  // Info | Warning | Error
       public required string Message { get; set; }
       public AdvisoryContext Context { get; set; }
       public List<string>? SuggestedActions { get; set; }
       public DateTime Timestamp { get; set; }
   }
   ```

6. **AdvisoryContext Model** - Flexible context with system, code, constraintId, resourceType, path, metadata

#### **PART C: Rule Advisory Detection**

7. **IRuleAdvisoryService** ([Interfaces/IRuleAdvisoryService.cs](backend/src/Pss.FhirProcessor.Engine/Interfaces/IRuleAdvisoryService.cs))
   - `GenerateAdvisoriesAsync` - Scan all constraints and CodeSystems
   - `GenerateAdvisoriesForConstraintAsync` - Check specific constraint
   - `GenerateAdvisoriesForCodeSystemAsync` - Check specific CodeSystem

8. **RuleAdvisoryService Implementation** ([Services/Terminology/RuleAdvisoryService.cs](backend/src/Pss.FhirProcessor.Engine/Services/Terminology/RuleAdvisoryService.cs))
   - **CODE_NOT_FOUND**: AllowedAnswer references non-existent code
   - **CODESYSTEM_NOT_FOUND**: ValueSetUrl references non-existent CodeSystem
   - **DISPLAY_MISMATCH**: Display text differs between constraint and CodeSystem
   - **DUPLICATE_CODE**: CodeSystem contains duplicate codes
   - **MISSING_DISPLAY**: Concept lacks display text
   - All advisories include suggested actions

#### **PART D: API Integration**

9. **API Endpoint** ([Controllers/ProjectsController.cs](backend/src/Pss.FhirProcessor.Playground.Api/Controllers/ProjectsController.cs))
   - `GET /api/projects/{id}/terminology/advisories`
   - Returns: `{ projectId, advisoryCount, advisories[], generatedAt }`
   - Non-mutating, on-demand generation
   - Graceful handling if service not configured

10. **DI Registration** ([DependencyInjection/EngineServiceCollectionExtensions.cs](backend/src/Pss.FhirProcessor.Engine/DependencyInjection/EngineServiceCollectionExtensions.cs))
    ```csharp
    services.AddTerminologyServices(baseDataPath);
    ```
    - Registers ITerminologyService, IConstraintService, IRuleAdvisoryService
    - Configurable base data path (default: `data/terminology`)

#### **Documentation**

11. **[TERMINOLOGY_SERVICES_USAGE.md](docs/TERMINOLOGY_SERVICES_USAGE.md)** - Comprehensive usage examples with 7 scenarios
12. **This summary document**

---

## ✅ Verification

### Build Status
```bash
dotnet build src/Pss.FhirProcessor.Engine/Pss.FhirProcessor.Engine.csproj
# Result: Build succeeded (0 errors, warnings are pre-existing)

dotnet build src/Pss.FhirProcessor.Playground.Api/Pss.FhirProcessor.Playground.Api.csproj
# Result: Build succeeded (0 errors, 0 warnings)
```

### Files Created/Modified
- **Created:** 7 new files (interfaces, implementations, models)
- **Modified:** 3 files (DI registration, API controller, Program.cs)
- **Phase 1 models:** 0 changes (zero impact on domain models)

---

## 🎯 Assumptions Made

### 1. Storage Strategy
**Assumption:** File-based JSON storage is sufficient for authoring scenarios.
- **Rationale:** Simple, version-control friendly, human-readable
- **Trade-off:** May not scale to hundreds of CodeSystems or thousands of constraints
- **Alternative:** Database storage (future consideration)

### 2. Single Project File Structure
**Assumption:** All constraints for a project are stored in a single JSON file.
- **Rationale:** Simplifies loading and querying
- **Trade-off:** Entire file must be loaded/saved on any constraint change
- **Alternative:** Individual files per constraint (more files to manage)

### 3. No Concurrency Control
**Assumption:** Last-write-wins is acceptable for authoring.
- **Rationale:** Authoring is typically single-user or small-team
- **Trade-off:** Risk of data loss if two users edit simultaneously
- **Alternative:** Optimistic locking with version tracking (future)

### 4. Advisory Generation is On-Demand
**Assumption:** Advisories are generated on-demand, not automatically on save.
- **Rationale:** Non-blocking; user chooses when to check
- **Trade-off:** Broken references may exist until user runs detection
- **Alternative:** Auto-generate on save (adds latency)

### 5. File Naming from URLs
**Assumption:** Generate filename from last segment of CodeSystem URL.
- **Rationale:** Human-readable, predictable
- **Trade-off:** URL changes require manual file renaming
- **Alternative:** Hash-based filenames (opaque but stable)

### 6. No Referential Integrity Enforcement
**Assumption:** Broken references are allowed and reported via advisory.
- **Rationale:** Authoring-only scope; user flexibility
- **Trade-off:** Data can become inconsistent
- **Design:** Intentional (core principle)

---

## ⚠️ Edge Cases Handled

### 1. CodeSystem Not Found
```csharp
var codeSystem = await _terminologyService.GetCodeSystemByUrlAsync(url);
if (codeSystem == null)
{
    // Returns null, caller decides how to handle
}
```

### 2. Hierarchical Concept Search
```csharp
// FindConceptAsync searches recursively through nested concepts
var concept = await _terminologyService.FindConceptAsync(system, code);
// Handles arbitrarily deep hierarchies
```

### 3. Duplicate Codes Detection
```csharp
// RuleAdvisoryService detects duplicates across hierarchy
var duplicates = FindDuplicateCodes(codeSystem.Concept);
// Generates advisory for each duplicate
```

### 4. Empty Constraint Lists
```csharp
// Returns empty list if no constraints, never null
var constraints = await _constraintService.ListConstraintsAsync(projectId);
// constraints.Count == 0 is valid
```

### 5. Missing Display Text
```csharp
// Advisory generated for concepts without display
// Severity: Warning (not Error, since display is optional in FHIR)
```

### 6. ValueSetUrl References Non-Existent CodeSystem
```csharp
// CODESYSTEM_NOT_FOUND advisory generated
// Includes suggested actions: create, update, or remove reference
```

### 7. Display Mismatch
```csharp
// If allowedAnswer.display != concept.display
// Advisory: DISPLAY_MISMATCH (Warning severity)
// User can ignore if intentional variant
```

---

## ❌ Intentionally NOT Implemented

### 1. Automatic Constraint Updates
**Not Implemented:** When code changes, automatically update referencing constraints
**Reason:** User should make explicit decisions about how to fix broken references
**Alternative:** Advisory provides suggested actions; user chooses

### 2. Cascade Delete
**Not Implemented:** Deleting CodeSystem does not delete referencing constraints
**Reason:** Constraints may reference multiple CodeSystems; explicit cleanup is safer
**Advisory:** CODE_NOT_FOUND will be generated for orphaned references

### 3. Versioning/History
**Not Implemented:** No tracking of changes over time
**Reason:** Authoring-only scope; version control systems (Git) handle this
**Alternative:** Use file-based storage with Git for version control

### 4. Locking/Concurrency
**Not Implemented:** No edit locks, no optimistic locking
**Reason:** Authoring-only scope; simple last-write-wins
**Risk:** Data loss if multiple users edit simultaneously
**Mitigation:** Document as known limitation

### 5. Validation on Save
**Not Implemented:** Saving does NOT validate or reject invalid data
**Reason:** Non-blocking principle; advisories inform but don't prevent
**Advisory:** Run advisory detection separately to check for issues

### 6. Automatic Advisory Generation
**Not Implemented:** Advisories are not generated automatically on save
**Reason:** Avoids save latency; user chooses when to check
**API:** Explicit endpoint `/terminology/advisories` for on-demand generation

### 7. Referential Integrity Enforcement
**Not Implemented:** No foreign key constraints, no cascade updates
**Reason:** Core design principle (authoring-only, no blocking)
**Advisory:** Rule Advisory reports issues without preventing them

### 8. Batch Operations
**Not Implemented:** No bulk import/export, no batch updates
**Reason:** Phase 2 scope (can be added later)
**Alternative:** Save multiple CodeSystems individually

### 9. Search/Query Capabilities
**Not Implemented:** No full-text search, no advanced filtering
**Reason:** Phase 2 scope (simple list/filter operations only)
**Future:** Add search service in Phase 3 if needed

### 10. Notification System
**Not Implemented:** No push notifications when advisories are detected
**Reason:** API is pull-based (user requests advisories on-demand)
**Alternative:** Frontend can poll or use WebSocket (future)

---

## 🚀 Integration Guide

### Step 1: Configure Storage Path
```csharp
// In appsettings.json
{
  "TerminologyDataPath": "/path/to/terminology/data"
}

// Or use default
// Default: {currentDirectory}/data/terminology
```

### Step 2: Register Services
```csharp
// In Program.cs (already done)
var baseDataPath = builder.Configuration.GetValue<string>("TerminologyDataPath") 
    ?? Path.Combine(Directory.GetCurrentDirectory(), "data", "terminology");
builder.Services.AddTerminologyServices(baseDataPath);
```

### Step 3: Inject and Use
```csharp
public class MyController : ControllerBase
{
    private readonly ITerminologyService _terminologyService;
    private readonly IConstraintService _constraintService;
    private readonly IRuleAdvisoryService _advisoryService;
    
    public MyController(
        ITerminologyService terminologyService,
        IConstraintService constraintService,
        IRuleAdvisoryService advisoryService)
    {
        _terminologyService = terminologyService;
        _constraintService = constraintService;
        _advisoryService = advisoryService;
    }
    
    // Use services...
}
```

### Step 4: Call API Endpoint
```bash
curl http://localhost:5000/api/projects/{projectId}/terminology/advisories
```

---

## 📊 Advisory Types Reference

| Advisory Code | Severity | Trigger | Suggested Actions |
|--------------|----------|---------|-------------------|
| `CODE_NOT_FOUND` | Error | AllowedAnswer references non-existent code | Add code to CodeSystem, remove allowed answer, update reference |
| `CODESYSTEM_NOT_FOUND` | Error | ValueSetUrl references non-existent CodeSystem | Create CodeSystem, update URL, remove ValueSetUrl |
| `DISPLAY_MISMATCH` | Warning | AllowedAnswer display ≠ concept display | Update display in constraint, ignore if intentional |
| `DUPLICATE_CODE` | Error | CodeSystem contains duplicate codes | Remove/rename duplicates, check hierarchy |
| `MISSING_DISPLAY` | Warning | Concept lacks display text | Add display text, ignore if not required |

---

## 🧪 Testing Recommendations

### Unit Tests
```csharp
// Test advisory detection
[Fact]
public async Task GenerateAdvisories_CodeNotFound_ReturnsError()

// Test concept search
[Fact]
public async Task FindConcept_Hierarchical_FindsNestedConcept()

// Test constraint filtering
[Fact]
public async Task ListConstraintsByCodeSystem_ReturnsMatchingConstraints()
```

### Integration Tests
```csharp
// Test full workflow
[Fact]
public async Task SaveCodeSystem_ChangeCode_AdvisoryDetected()

// Test API endpoint
[Fact]
public async Task GetAdvisories_ReturnsValidResponse()
```

### Manual Testing Scenarios
1. Create CodeSystem with concepts
2. Create constraint referencing concepts
3. Change concept code
4. Call `/terminology/advisories` endpoint
5. Verify CODE_NOT_FOUND advisory
6. Update constraint to fix reference
7. Call endpoint again, verify advisory cleared

---

## 📁 File Structure

```
backend/src/Pss.FhirProcessor.Engine/
├── Interfaces/
│   ├── ITerminologyService.cs          ✅ NEW
│   ├── IConstraintService.cs           ✅ NEW
│   └── IRuleAdvisoryService.cs         ✅ NEW
├── Models/Terminology/
│   ├── CodeSystem.cs                   (Phase 1)
│   ├── CodeSystemConcept.cs            (Phase 1)
│   ├── TerminologyConstraint.cs        (Phase 1)
│   ├── AllowedAnswer.cs                (Phase 1)
│   └── RuleAdvisory.cs                 ✅ NEW
├── Services/Terminology/
│   ├── TerminologyService.cs           ✅ NEW
│   ├── ConstraintService.cs            ✅ NEW
│   └── RuleAdvisoryService.cs          ✅ NEW
└── DependencyInjection/
    └── EngineServiceCollectionExtensions.cs  ✅ MODIFIED

backend/src/Pss.FhirProcessor.Playground.Api/
├── Controllers/
│   └── ProjectsController.cs           ✅ MODIFIED
└── Program.cs                          ✅ MODIFIED

docs/
├── TERMINOLOGY_SERVICES_USAGE.md       ✅ NEW
└── PHASE_2_TERMINOLOGY_SUMMARY.md      ✅ NEW (this file)
```

---

## 🎓 Next Steps (Future Phases)

### Phase 3: Frontend UI
1. **CodeSystem Editor**
   - Tree view for hierarchical concepts
   - Inline editing (code, display, definition)
   - Drag-and-drop for reordering

2. **Constraint Builder**
   - Form-based constraint creation
   - CodeSystem browser/picker
   - Visual allowed answer selection

3. **Rule Advisory Panel**
   - Display advisories grouped by severity
   - Navigate to affected constraints
   - One-click fix actions

4. **Terminology Browser**
   - Search across all CodeSystems
   - Filter by code, display, system
   - Usage statistics (where is code referenced?)

### Phase 4: Advanced Features
1. **Bulk Operations**
   - Import multiple CodeSystems from FHIR server
   - Export to FHIR Bundle
   - Batch update operations

2. **Search & Analytics**
   - Full-text search across CodeSystems
   - Usage analytics (most/least used codes)
   - Orphan detection (unused codes)

3. **Collaboration Features**
   - Activity log (who changed what)
   - Comments on concepts/constraints
   - Change proposals/reviews

---

## ✨ Summary

**Phase 2 Complete!**

- ✅ CRUD services for CodeSystems and Constraints
- ✅ Rule Advisory detection for CODE_NOT_FOUND and 4 other advisory types
- ✅ File-based JSON storage (simple, version-control friendly)
- ✅ API endpoint for on-demand advisory generation
- ✅ Zero changes to Phase 1 domain models
- ✅ Non-blocking workflow (advisories inform, don't prevent)
- ✅ Comprehensive documentation and usage examples
- ✅ Build verified (0 errors)

**Key Principles Maintained:**
- No locking, versioning, or lifecycle enforcement
- Everything editable (last-write-wins)
- Advisories are informational, not blocking
- Identity follows FHIR strictly (system + code)

**Ready for Phase 3: Frontend UI Implementation**
