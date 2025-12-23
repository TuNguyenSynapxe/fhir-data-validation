# Phase 2 Quick Reference - Terminology Services & Rule Advisory

## Service Interfaces

### ITerminologyService
```csharp
Task<CodeSystem?> GetCodeSystemByUrlAsync(string url, CancellationToken ct = default);
Task<List<CodeSystem>> ListCodeSystemsAsync(string projectId, CancellationToken ct = default);
Task SaveCodeSystemAsync(string projectId, CodeSystem codeSystem, CancellationToken ct = default);
Task<bool> DeleteCodeSystemAsync(string projectId, string url, CancellationToken ct = default);
Task<CodeSystemConcept?> FindConceptAsync(string system, string code, CancellationToken ct = default);
```

### IConstraintService
```csharp
Task<TerminologyConstraint?> GetConstraintByIdAsync(string constraintId, CancellationToken ct = default);
Task<List<TerminologyConstraint>> ListConstraintsAsync(string projectId, CancellationToken ct = default);
Task<List<TerminologyConstraint>> ListConstraintsByResourceTypeAsync(string projectId, string resourceType, CancellationToken ct = default);
Task<List<TerminologyConstraint>> ListConstraintsByCodeSystemAsync(string projectId, string codeSystemUrl, CancellationToken ct = default);
Task SaveConstraintAsync(string projectId, TerminologyConstraint constraint, CancellationToken ct = default);
Task<bool> DeleteConstraintAsync(string projectId, string constraintId, CancellationToken ct = default);
```

### IRuleAdvisoryService
```csharp
Task<List<RuleAdvisory>> GenerateAdvisoriesAsync(string projectId, CancellationToken ct = default);
Task<List<RuleAdvisory>> GenerateAdvisoriesForConstraintAsync(TerminologyConstraint constraint, CancellationToken ct = default);
Task<List<RuleAdvisory>> GenerateAdvisoriesForCodeSystemAsync(CodeSystem codeSystem, string projectId, CancellationToken ct = default);
```

---

## Advisory Types

| Code | Severity | Description |
|------|----------|-------------|
| `CODE_NOT_FOUND` | Error | AllowedAnswer references non-existent code |
| `CODESYSTEM_NOT_FOUND` | Error | ValueSetUrl references non-existent CodeSystem |
| `DISPLAY_MISMATCH` | Warning | Display text differs between constraint and CodeSystem |
| `DUPLICATE_CODE` | Error | CodeSystem contains duplicate codes |
| `MISSING_DISPLAY` | Warning | Concept lacks display text |

---

## API Endpoint

```bash
GET /api/projects/{id}/terminology/advisories
```

**Response:**
```json
{
  "projectId": "guid",
  "advisoryCount": 2,
  "advisories": [
    {
      "advisoryCode": "CODE_NOT_FOUND",
      "severity": "Error",
      "message": "Code 'xyz' not found in CodeSystem 'http://...'",
      "context": {
        "system": "http://...",
        "code": "xyz",
        "constraintId": "TERM-001"
      },
      "suggestedActions": ["Add code", "Remove reference", "Update"],
      "timestamp": "2025-12-21T15:30:00Z"
    }
  ],
  "generatedAt": "2025-12-21T15:30:00Z"
}
```

---

## Storage Structure

```
{baseDataPath}/
├── {projectId}/
│   ├── terminology/
│   │   ├── screening-types.json       (CodeSystem)
│   │   ├── marital-status.json        (CodeSystem)
│   │   └── observation-categories.json (CodeSystem)
│   └── constraints/
│       └── terminology-constraints.json (All constraints)
```

---

## DI Registration

```csharp
// In Program.cs
var baseDataPath = builder.Configuration.GetValue<string>("TerminologyDataPath") 
    ?? Path.Combine(Directory.GetCurrentDirectory(), "data", "terminology");
builder.Services.AddTerminologyServices(baseDataPath);
```

---

## Common Patterns

### Create CodeSystem
```csharp
var codeSystem = new CodeSystem
{
    Url = "http://example.org/CodeSystem/my-codes",
    Name = "MyCodes",
    Status = "draft",
    Concept = new List<CodeSystemConcept>
    {
        new CodeSystemConcept { Code = "A", Display = "Option A" }
    }
};
await terminologyService.SaveCodeSystemAsync(projectId, codeSystem);
```

### Create Constraint
```csharp
var constraint = new TerminologyConstraint
{
    Id = "TERM-001",
    ResourceType = "Observation",
    Path = "Observation.code.coding",
    ConstraintType = "binding",
    AllowedAnswers = new List<AllowedAnswer>
    {
        new AllowedAnswer { System = "http://...", Code = "A" }
    }
};
await constraintService.SaveConstraintAsync(projectId, constraint);
```

### Check for Issues
```csharp
var advisories = await advisoryService.GenerateAdvisoriesAsync(projectId);
var errors = advisories.Where(a => a.Severity == AdvisorySeverity.Error);
if (errors.Any())
{
    Console.WriteLine($"Found {errors.Count()} errors");
}
```

---

## Key Principles

✅ **Last-write-wins** - No locking, no concurrency control  
✅ **Non-blocking** - Advisories inform, don't prevent  
✅ **On-demand** - Advisory generation is explicit, not automatic  
✅ **File-based** - JSON storage for simplicity  
✅ **FHIR identity** - system + code, no internal IDs  

---

## Files Created

**Interfaces (3):**
- `Interfaces/ITerminologyService.cs`
- `Interfaces/IConstraintService.cs`
- `Interfaces/IRuleAdvisoryService.cs`

**Models (1):**
- `Models/Terminology/RuleAdvisory.cs`

**Services (3):**
- `Services/Terminology/TerminologyService.cs`
- `Services/Terminology/ConstraintService.cs`
- `Services/Terminology/RuleAdvisoryService.cs`

**Modified (3):**
- `DependencyInjection/EngineServiceCollectionExtensions.cs`
- `Controllers/ProjectsController.cs`
- `Program.cs`

**Documentation (2):**
- `docs/TERMINOLOGY_SERVICES_USAGE.md`
- `docs/PHASE_2_TERMINOLOGY_SUMMARY.md`

---

## Build Status

✅ **Engine:** Build succeeded (0 errors)  
✅ **Playground API:** Build succeeded (0 errors, 0 warnings)  
✅ **Phase 1 Models:** No changes (zero impact)

---

For detailed examples, see: [TERMINOLOGY_SERVICES_USAGE.md](TERMINOLOGY_SERVICES_USAGE.md)  
For complete summary, see: [PHASE_2_TERMINOLOGY_SUMMARY.md](PHASE_2_TERMINOLOGY_SUMMARY.md)
