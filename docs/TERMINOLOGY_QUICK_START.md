# Terminology Domain Models - Quick Start Guide

## 📦 What Was Created

### Backend C# Models (4 files)
Location: `backend/src/Pss.FhirProcessor.Engine/Models/Terminology/`

1. **CodeSystem.cs** - FHIR CodeSystem container
2. **CodeSystemConcept.cs** - Individual concepts with hierarchies
3. **TerminologyConstraint.cs** - Validation rules
4. **AllowedAnswer.cs** - Code references in constraints

### Example JSON Files (4 files)
Location: `examples/terminology/`

1. **example-codesystem.json** - Screening categories with hierarchy
2. **example-codesystem-marital-status.json** - HL7 v3 MaritalStatus
3. **example-terminology-constraint.json** - Observation category constraint
4. **example-terminology-constraint-patient.json** - Patient marital status constraint

### Documentation (3 files)
1. **Models/Terminology/README.md** - Comprehensive guide
2. **docs/PHASE_1_TERMINOLOGY_SUMMARY.md** - Implementation summary
3. **docs/TERMINOLOGY_MODEL_DIAGRAM.md** - Visual diagrams and relationships

---

## 🚀 Quick Usage

### 1. Create a CodeSystem
```csharp
using Pss.FhirProcessor.Engine.Models.Terminology;

var codeSystem = new CodeSystem
{
    Url = "http://example.org/fhir/CodeSystem/my-codes",
    Name = "MyCodes",
    Title = "My Code System",
    Status = "active",
    Concept = new List<CodeSystemConcept>
    {
        new CodeSystemConcept
        {
            Code = "code-1",
            Display = "First Code"
        },
        new CodeSystemConcept
        {
            Code = "code-2",
            Display = "Second Code"
        }
    }
};

// Serialize to JSON
var json = JsonSerializer.Serialize(codeSystem, new JsonSerializerOptions 
{ 
    WriteIndented = true 
});
```

### 2. Create a Terminology Constraint
```csharp
var constraint = new TerminologyConstraint
{
    Id = "TERM-001",
    ResourceType = "Observation",
    Path = "Observation.code.coding",
    ConstraintType = "binding",
    BindingStrength = "required",
    ValueSetUrl = "http://example.org/fhir/CodeSystem/my-codes",
    AllowedAnswers = new List<AllowedAnswer>
    {
        new AllowedAnswer
        {
            System = "http://example.org/fhir/CodeSystem/my-codes",
            Code = "code-1",
            Display = "First Code"
        }
    },
    Severity = "error",
    Message = "Code must be from allowed list"
};
```

### 3. Load from JSON
```csharp
var jsonString = File.ReadAllText("examples/terminology/example-codesystem.json");
var codeSystem = JsonSerializer.Deserialize<CodeSystem>(jsonString);

// Access concepts
foreach (var concept in codeSystem.Concept)
{
    Console.WriteLine($"{concept.Code}: {concept.Display}");
}
```

---

## ✅ Build & Verify

```bash
cd backend
dotnet build src/Pss.FhirProcessor.Engine/Pss.FhirProcessor.Engine.csproj
```

**Status:** ✅ Build successful (verified)

---

## 🎯 Key Principles

### Identity = system + code
```csharp
// ❌ WRONG: Internal ID
var concept = new CodeSystemConcept 
{ 
    InternalId = Guid.NewGuid(), // NO!
    Code = "A" 
};

// ✅ CORRECT: System + Code
var reference = new AllowedAnswer
{
    System = "http://example.org/fhir/CodeSystem/my-codes",
    Code = "A"  // Identity is system + code
};
```

### Everything is Editable
```csharp
// ✅ Allowed: Change code value
concept.Code = "new-code-value";

// No validation blocks this change
// Rule Advisory will detect orphaned references (Phase 2)
```

### No Lifecycle Enforcement
```csharp
codeSystem.Status = "retired";  // Metadata only
// No enforcement: system still allows edits
```

---

## 📖 Next Steps

### Immediate (You)
1. Review the models in `Models/Terminology/`
2. Check example JSON files in `examples/terminology/`
3. Read comprehensive docs in `Models/Terminology/README.md`
4. Decide on storage strategy (files vs. database)

### Phase 2 (Future)
1. Implement backend services:
   - `ITerminologyService` (CRUD for CodeSystems)
   - `IConstraintService` (CRUD for constraints)
   - `IRuleAdvisoryService` (detect orphaned refs)
2. Integrate with ValidationPipeline
3. Add API endpoints

### Phase 3 (Future)
1. Frontend UI:
   - CodeSystem tree editor
   - Constraint form builder
   - Rule Advisory panel
   - Terminology browser

---

## 🔍 Example Workflow

### Author a CodeSystem
1. Create CodeSystem with URL and concepts
2. Save as JSON file in `terminology/` folder
3. Reference in TerminologyConstraint

### Define a Constraint
1. Create TerminologyConstraint
2. Set resource type and FHIRPath
3. Add AllowedAnswers referencing CodeSystem concepts
4. Save as JSON in `constraints/` folder

### Change a Code (Demonstrates Editability)
1. Open CodeSystem JSON
2. Change concept.code from "A" to "B"
3. Save
4. (Phase 2) Rule Advisory detects orphaned references
5. User updates or removes affected constraints

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| [Models/Terminology/README.md](backend/src/Pss.FhirProcessor.Engine/Models/Terminology/README.md) | Comprehensive model documentation |
| [PHASE_1_TERMINOLOGY_SUMMARY.md](docs/PHASE_1_TERMINOLOGY_SUMMARY.md) | Implementation summary & decisions |
| [TERMINOLOGY_MODEL_DIAGRAM.md](docs/TERMINOLOGY_MODEL_DIAGRAM.md) | Visual diagrams & relationships |
| This file | Quick start guide |

---

## 💡 FAQ

**Q: Can I change a concept's code value?**  
A: Yes! Everything is editable. Rule Advisory (Phase 2) will warn about broken references.

**Q: Do I need to set internal IDs?**  
A: No. Identity is always system + code (FHIR pattern).

**Q: How do I handle code changes breaking rules?**  
A: Rule Advisory (Phase 2) will detect and report. You can then update or remove constraints.

**Q: File-based or database storage?**  
A: Phase 1 supports both. File-based JSON recommended for simplicity.

**Q: How do I validate terminology constraints?**  
A: Integration with ValidationPipeline comes in Phase 2.

---

## ✨ Summary

**Phase 1 Complete!**

- ✅ 4 C# domain models
- ✅ 4 example JSON files  
- ✅ Comprehensive documentation
- ✅ Build verified
- ✅ FHIR-aligned identity (no internal IDs)
- ✅ Everything editable (authoring-only)
- ✅ Ready for Phase 2 (services)

**No Locking. No Versioning. No Lifecycle. Pure Authoring.**
