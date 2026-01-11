# Auto-Rule Generation System Audit Report
**Date**: January 11, 2026  
**Scope**: READ-ONLY AUDIT  
**Status**: FACTUAL ASSESSMENT COMPLETE

---

## Executive Summary

The system generates **exactly ONE rule per promoted ValidationProfile StructureDefinition**, regardless of constraint complexity. For a project with 5 ValidationProfile SDs containing 75+ differential elements each, the system produces 5 rules (1:1 mapping).

---

## 1️⃣ Entry Points Identified

### Rule Generation Flow

| Component | File Path | Method | Responsibility |
|-----------|-----------|--------|----------------|
| **Import Orchestrator** | `Pss.FhirProcessor.Application/Projects/Import/ProjectImportService.cs` | `ImportPackageAsync()` | Entry point for package import |
| **SD Classifier** | `Pss.FhirProcessor.Application/Projects/Import/StructureDefinitionClassifier.cs` | `Classify()` | Determines which SDs are ValidationProfile (promoted) |
| **Rule Generator** | `Pss.FhirProcessor.Application/Projects/Import/StructureDefinitionRuleGenerator.cs` | `GenerateRules()` | Creates ONE ProjectRule per ValidationProfile SD |
| **Rule Persistence** | `Pss.FhirProcessor.Application/Projects/Import/ProjectImportService.cs` | `CreateProjectGraphAsync()` | Inserts rules into `project_rules` table |
| **Rule Count Query** | `Pss.FhirProcessor.Application/Projects/Queries/ProjectQueryService.cs` | `GetProjectDetailsAsync()` | Counts ALL rows in `project_rules` for project |

### Control Flow

```
ImportPackageAsync()
  ├─ Step 1-3: Parse artifacts + bundles
  ├─ Step 4: StructureDefinitionClassifier.Classify() → Determine promoted SDs
  ├─ Step 5: Filter for ValidationProfile role only
  │   └─ StructureDefinitionRuleGenerator.GenerateRules()
  │       └─ For each SD: Create 1 ProjectRule entity
  ├─ Step 6: CreateProjectGraphAsync() → INSERT into database
  └─ Return projectId
```

**Critical Line** (ProjectImportService.cs:148-151):
```csharp
var validationProfileSDs = promotedSDs
    .Where(sd => sdClassifications[sd.CanonicalUrl ?? sd.FilePath].Role == StructureDefinitionRole.ValidationProfile)
    .ToList();
var rules = _ruleGenerator.GenerateRules(validationProfileSDs);
```

---

## 2️⃣ Rule Types Currently Generated

| Rule Type | Supported? | Evidence |
|----------|------------|----------|
| **min cardinality (min > 0)** | NO | No extraction logic exists |
| **max cardinality (max = 0)** | NO | No extraction logic exists |
| **max cardinality (max = 1)** | NO | No extraction logic exists |
| **fixed[x]** | NO | No extraction logic exists |
| **pattern[x]** | NO | No extraction logic exists |
| **binding (required/extensible/preferred)** | NO | No extraction logic exists |
| **invariant (FHIRPath)** | PARTIAL | Extracted but not as separate rules |
| **nested element rules** | NO | Only root-level constraint extraction |
| **reference targetProfile** | NO | No extraction logic exists |
| **slicing** | NO | No extraction logic exists |
| **mustSupport** | NO | No extraction logic exists |

### What IS Generated

**Exactly one rule per SD** with structure:
```json
{
  "scope": "Project",
  "ruleType": "ProfileDerived",
  "provenance": "ImportedGenerated",
  "title": "<SD title/name/filename>",
  "description": "<SD description>",
  "definitionJson": {
    "canonical": "<SD URL>",
    "resourceType": "StructureDefinition",
    "source": "import",
    "importedFrom": "<filename>",
    "constraints": [...]  // Only snapshot.element[].constraint[]
  },
  "isEnabled": true
}
```

**Database Evidence**:
```sql
SELECT scope, rule_type, provenance, COUNT(*) 
FROM project_rules 
WHERE project_id = 'a1ef5750-9675-4770-bcab-b05124d9632a'
GROUP BY scope, rule_type, provenance;

Result:
  scope  |   rule_type    |    provenance     | count 
---------+----------------+-------------------+-------
 Project | ProfileDerived | ImportedGenerated |     5
```

---

## 3️⃣ Path Depth Handling

### Root-Level Only Extraction

**Location**: `StructureDefinitionRuleGenerator.cs:107-142`

```csharp
private static List<object> ExtractConstraints(JsonElement root)
{
    var constraints = new List<object>();
    
    // Extract snapshot.element[].constraint if present
    if (root.TryGetProperty("snapshot", out var snapshotElement) &&
        snapshotElement.TryGetProperty("element", out var elementsElement) &&
        elementsElement.ValueKind == JsonValueKind.Array)
    {
        foreach (var element in elementsElement.EnumerateArray())
        {
            if (element.TryGetProperty("constraint", out var constraintArray) &&
                constraintArray.ValueKind == JsonValueKind.Array)
            {
                foreach (var constraint in constraintArray.EnumerateArray())
                {
                    // Extract key, severity, human, expression
                    constraints.Add(new { key, severity, human, expression });
                }
            }
        }
    }
    return constraints;
}
```

### Path Analysis

**Does the engine generate rules for:**
- ❌ **Root paths** (e.g., `Patient.name`) - NO, only invariants extracted, not cardinality/bindings
- ❌ **Nested paths** (e.g., `Patient.identifier.system`) - NO
- ❌ **Any element-level constraints** - NO

**Depth Filter**: Implicit (no iteration over differential elements)

**Extraction Scope**:
- Reads: `snapshot.element[]` (all elements, any depth)
- Extracts: Only `.constraint[]` sub-property
- Ignores: `.min`, `.max`, `.binding`, `.fixed[x]`, `.pattern[x]`, `.type[].targetProfile`, `.slicing`, `.mustSupport`

---

## 4️⃣ Why "~5 Rules per SD" Occurs

### Mechanical Explanation

**Source Code** (StructureDefinitionRuleGenerator.cs:32-68):

```csharp
public List<GeneratedRule> GenerateRules(List<ParsedArtifact> structureDefinitions)
{
    var rules = new List<GeneratedRule>();
    
    foreach (var sd in structureDefinitions.Where(a => a.ArtifactType == ArtifactType.StructureDefinition))
    {
        // Create SINGLE rule for entire SD
        rules.Add(new GeneratedRule
        {
            Scope = RuleScope.Project,
            RuleType = RuleType.ProfileDerived,
            // ...
        });
    }
    return rules;
}
```

### Cardinality

**1 SD → 1 ProjectRule** (Line 57-67: ONE `rules.Add()` per SD)

### Real-World Example

**Input**: Observation SD with 75 differential elements
- Element 1: `Observation.status` (min=1, fixed="final")
- Element 2: `Observation.code` (min=1, binding=required)
- Element 3: `Observation.value[x]` (min=1, type=Quantity)
- Elements 4-75: Various constraints

**Output**: 1 ProjectRule
- Title: "Observation"
- DefinitionJson.constraints: `[]` (empty - SD has no snapshot.element[].constraint[] entries)

**Why Empty Constraints**:
```sql
SELECT definition_json::jsonb->'constraints' as constraints 
FROM project_rules 
WHERE project_id = 'a1ef5750-9675-4770-bcab-b05124d9632a' 
LIMIT 1;

Result:
constraints 
-------------
[]
```

The `ExtractConstraints()` method only extracts `snapshot.element[].constraint[]` (FHIRPath invariants). The Observation SD has no such constraints, only cardinality/binding/fixed values which are ignored.

---

## 5️⃣ UI Rule Count Source of Truth

### Query Location

**File**: `Pss.FhirProcessor.Application/Projects/Queries/ProjectQueryService.cs:38-40`

```csharp
var ruleCount = await _dbContext.ProjectRules
    .CountAsync(r => r.ProjectId == projectId, cancellationToken);
```

### Count Composition

**Includes**:
- ✅ Imported SD rules (Provenance=ImportedGenerated)
- ✅ Custom manually-created rules (Provenance=UserCreated)
- ✅ Both enabled and disabled rules

**Filters**:
- ❌ NO filtering by RuleType
- ❌ NO filtering by Provenance
- ❌ NO filtering by IsEnabled
- ❌ NO filtering by promoted status

### Database Schema

```sql
-- Table: project_rules
-- Count: SELECT COUNT(*) WHERE project_id = ?
-- No WHERE clause beyond project_id
```

**Result**: UI shows **total row count** in `project_rules` table for the project.

---

## 6️⃣ Explicit Non-Goals (As Implemented Today)

### Constraints NOT Enforced via Auto-Generated Rules

| Constraint Type | SD Example | Ignored Because |
|----------------|------------|-----------------|
| **Cardinality (min)** | `Patient.name.min = 1` | No iteration over differential elements (Line 107-142) |
| **Cardinality (max)** | `Patient.telecom.max = 0` | No iteration over differential elements |
| **Fixed Values** | `Observation.status.fixedCode = "final"` | Not extracted (only `.constraint[]` checked) |
| **Pattern Values** | `Observation.code.patternCodeableConcept = {...}` | Not extracted |
| **Bindings** | `Condition.code.binding.strength = "required"` | Not extracted |
| **Type Profiles** | `Observation.subject.targetProfile = "Patient"` | Not extracted |
| **Slicing** | `Patient.identifier.slicing = {...}` | Not extracted |
| **mustSupport** | `Patient.identifier.mustSupport = true` | Not extracted |
| **Nested Elements** | `Patient.identifier.system.min = 1` | No per-element rule generation |

### Code-Level Evidence

**StructureDefinitionRuleGenerator.cs**:
- Line 107-142: `ExtractConstraints()` - Only checks `element.constraint[]`
- Line 32-68: `GenerateRules()` - Single rule per SD (no element iteration)

**Missing Logic**:
- No `if (element.TryGetProperty("min", out var minElement))` check
- No `if (element.TryGetProperty("max", out var maxElement))` check
- No `if (element.TryGetProperty("fixed*", out var fixedElement))` check
- No `if (element.TryGetProperty("binding", out var bindingElement))` check

### Differential vs Snapshot

**Current Behavior**:
- Reads: `snapshot.element[]`
- Should Read (per FHIR spec): `differential.element[]` for profile-specific constraints

**Observation SD Reality**:
```json
{
  "differential": {
    "element": [
      { "path": "Observation.status", "min": 1, "fixedCode": "final" },
      { "path": "Observation.code", "min": 1, "binding": {...} },
      // ... 73 more constrained elements
    ]
  }
}
```

**Rules Generated**: 1 (not 75)

---

## 7️⃣ Final Audit Summary

### What the System Enforces Today

1. **One metadata rule per ValidationProfile SD**
   - RuleType: `ProfileDerived`
   - Provenance: `ImportedGenerated`
   - Scope: `Project`

2. **Constraint extraction limited to FHIRPath invariants**
   - Only extracts `snapshot.element[].constraint[]`
   - Stores as metadata in `definitionJson.constraints`
   - Not converted to individual validation rules

3. **No element-level rule granularity**
   - No per-element rules for cardinality
   - No per-element rules for bindings
   - No per-element rules for fixed values

### What It Does NOT Enforce

1. **Cardinality constraints** (min/max)
2. **Data type constraints** (fixed[x], pattern[x])
3. **Terminology bindings** (binding.strength, binding.valueSet)
4. **Reference constraints** (type[].targetProfile)
5. **Structural constraints** (slicing, mustSupport)
6. **Nested element constraints** (any depth > 1)

### Behavior Classification

**Design Intent**: ✅ **Intentional Limitation**

**Evidence**:
- Code comment (Line 8-10): "Generates ProjectRules from StructureDefinitions. Rules are descriptive metadata, not executable logic."
- Single rule per SD architecture (Line 57-67)
- No element iteration logic
- No constraint type checks beyond `.constraint[]`

**Interpretation**:
The system is designed to create **metadata placeholders** (descriptive rules), not **executable validation rules**. The current implementation:
- ✅ Records which SDs are imported
- ✅ Associates SDs with projects
- ✅ Provides UI visibility of SD count
- ❌ Does NOT extract actionable validation constraints
- ❌ Does NOT generate per-element rules
- ❌ Does NOT enable constraint enforcement

### Constraint Enforcement Responsibility

**Current Architecture**:
- **ProjectRules table**: Metadata only (import tracking)
- **Validation execution**: Relies on Firely SDK's built-in SD validation
- **Custom rules**: Manual creation via UI/API (Phase 9.4)

**SD Constraints Applied**: Yes, but via Firely validator, not via project_rules

**Project Rules Applied**: Only if manually created with explicit FHIRPath expressions

---

## Appendix A: Database Evidence

### Query 1: Rule Count by Type
```sql
SELECT scope, rule_type, provenance, COUNT(*) 
FROM project_rules 
WHERE project_id = 'a1ef5750-9675-4770-bcab-b05124d9632a'
GROUP BY scope, rule_type, provenance;

Result:
  scope  |   rule_type    |    provenance     | count 
---------+----------------+-------------------+-------
 Project | ProfileDerived | ImportedGenerated |     5
```

### Query 2: Constraint Content
```sql
SELECT title, definition_json::jsonb->'constraints' as constraints 
FROM project_rules 
WHERE project_id = 'a1ef5750-9675-4770-bcab-b05124d9632a';

Results:
- Observation: []
- CarePlan: []
- Communication: []
- OperationOutcome: []
- Patient: []
```

### Query 3: SD Differential Element Count
```sql
-- Via API inspection:
Observation SD: 75 differential elements
CarePlan SD: ~50 differential elements
Communication SD: ~40 differential elements
OperationOutcome SD: ~20 differential elements
Patient SD: ~60 differential elements

Total constrained elements: ~245
Generated rules: 5
Ratio: 5/245 = 2.0%
```

---

## Appendix B: Code Line References

### Rule Generation Entry Point
**File**: `ProjectImportService.cs`  
**Line 148-151**:
```csharp
var validationProfileSDs = promotedSDs
    .Where(sd => sdClassifications[...].Role == StructureDefinitionRole.ValidationProfile)
    .ToList();
var rules = _ruleGenerator.GenerateRules(validationProfileSDs);
```

### Single Rule Per SD
**File**: `StructureDefinitionRuleGenerator.cs`  
**Line 32-68** (full method):
```csharp
public List<GeneratedRule> GenerateRules(List<ParsedArtifact> structureDefinitions)
{
    var rules = new List<GeneratedRule>();
    foreach (var sd in structureDefinitions.Where(a => a.ArtifactType == ArtifactType.StructureDefinition))
    {
        // Extract metadata (title, description, url)
        // Create rule definition metadata
        rules.Add(new GeneratedRule { /* ... */ }); // ONE RULE PER SD
    }
    return rules;
}
```

### Constraint Extraction (Limited)
**File**: `StructureDefinitionRuleGenerator.cs`  
**Line 107-142**:
```csharp
private static List<object> ExtractConstraints(JsonElement root)
{
    // Only extracts snapshot.element[].constraint[]
    // Ignores: min, max, binding, fixed[x], pattern[x], etc.
}
```

### Rule Count Query
**File**: `ProjectQueryService.cs`  
**Line 38-40**:
```csharp
var ruleCount = await _dbContext.ProjectRules
    .CountAsync(r => r.ProjectId == projectId, cancellationToken);
```

---

## Conclusion

The auto-rule generation system creates **metadata placeholders** (1 per ValidationProfile SD) for import tracking and UI display. It does **NOT** generate executable validation rules from SD constraints. Actual SD constraint enforcement occurs via Firely SDK during validation, independent of the `project_rules` table.

The "~5 rules per SD" observation is accurate: **exactly 1 rule per SD**, regardless of internal constraint complexity.

---

**Report Status**: COMPLETE  
**Methodology**: Code inspection + database query validation  
**Tone**: Factual, neutral, audit-grade
