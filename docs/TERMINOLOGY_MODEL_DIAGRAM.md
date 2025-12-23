# Terminology Domain Model Relationships

## Entity Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CodeSystem                              │
│  (FHIR-aligned)                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Identity: url (canonical URL)                                  │
│                                                                 │
│  + url: string [required]                                       │
│  + version: string?                                             │
│  + name: string?                                                │
│  + title: string?                                               │
│  + status: string (draft|active|retired)                        │
│  + description: string?                                         │
│  + publisher: string?                                           │
│  + content: string (complete|example|fragment|supplement)       │
│  + count: int?                                                  │
│  + concept: List<CodeSystemConcept>                             │
│  + meta: Dictionary<string, object>?                            │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ 1:N (contains)
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CodeSystemConcept                            │
│  (FHIR-aligned)                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Identity: code (unique within CodeSystem)                      │
│                                                                 │
│  + code: string [required, editable]                            │
│  + display: string?                                             │
│  + definition: string?                                          │
│  + designation: List<ConceptDesignation>?                       │
│  + property: List<ConceptProperty>?                             │
│  + concept: List<CodeSystemConcept>? (hierarchical)             │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                   TerminologyConstraint                         │
│  (Project-specific)                                             │
├─────────────────────────────────────────────────────────────────┤
│  Identity: id (constraint ID)                                   │
│                                                                 │
│  + id: string [required]                                        │
│  + name: string?                                                │
│  + description: string?                                         │
│  + resourceType: string [required] (e.g., "Observation")        │
│  + path: string [required] (FHIRPath)                           │
│  + constraintType: string (required|allowedValues|binding)      │
│  + bindingStrength: string? (required|extensible|...)           │
│  + valueSetUrl: string? (reference to CodeSystem)               │
│  + allowedAnswers: List<AllowedAnswer>                          │
│  + severity: string (error|warning|information)                 │
│  + message: string?                                             │
│  + active: bool                                                 │
│  + metadata: Dictionary<string, object>?                        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ 1:N (references)
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AllowedAnswer                              │
│  (Project-specific)                                             │
├─────────────────────────────────────────────────────────────────┤
│  Identity: system + code (references CodeSystem.concept)        │
│                                                                 │
│  + system: string [required] (CodeSystem URL)                   │
│  + code: string [required] (concept code)                       │
│  + display: string?                                             │
│  + version: string?                                             │
│  + note: string?                                                │
└─────────────────────────────────────────────────────────────────┘
                   │
                   │ references (logical, not enforced)
                   │
                   ▼
        ┌──────────────────────┐
        │  CodeSystemConcept   │
        │  (via system + code) │
        └──────────────────────┘
```

## Key Relationships

### 1. CodeSystem → CodeSystemConcept (1:N, containment)
- **Type:** Composition (strong ownership)
- **Cardinality:** 1 CodeSystem contains 0..* Concepts
- **Identity:** Concept.code is unique within parent CodeSystem
- **Hierarchy:** Concepts can contain child concepts (recursive)

### 2. TerminologyConstraint → AllowedAnswer (1:N, containment)
- **Type:** Composition (strong ownership)
- **Cardinality:** 1 Constraint contains 0..* AllowedAnswers
- **Purpose:** Define which codes are permitted

### 3. AllowedAnswer → CodeSystemConcept (N:1, reference)
- **Type:** Logical reference (not enforced)
- **Identity:** Reference by value (system + code)
- **Important:** If concept code changes, reference becomes orphaned
- **Detection:** Via Rule Advisory Service (Phase 2)

---

## Identity Patterns

### CodeSystem Identity
```
url = "http://example.org/fhir/CodeSystem/screening-types"
```
- Primary key: `url`
- No internal GUID or ID
- FHIR-standard canonical URL

### CodeSystemConcept Identity
```
system = "http://example.org/fhir/CodeSystem/screening-types"
code = "screening-mental-health"
```
- Composite key: `system + code`
- No internal GUID or ID
- FHIR-standard Coding pattern

### TerminologyConstraint Identity
```
id = "TERM-OBS-001"
```
- Primary key: `id`
- User-assigned or generated
- Not FHIR-standard (project-specific)

### AllowedAnswer Identity
```
system = "http://example.org/fhir/CodeSystem/screening-types"
code = "screening-mental-health"
```
- Composite key: `system + code`
- References CodeSystemConcept
- No internal GUID or ID

---

## Reference Resolution Example

### Scenario: User changes a concept code

#### Before:
```json
// CodeSystem
{
  "url": "http://example.org/fhir/CodeSystem/screening-types",
  "concept": [
    {
      "code": "mental-health",  // ← Original code
      "display": "Mental Health Screening"
    }
  ]
}

// TerminologyConstraint
{
  "id": "TERM-OBS-001",
  "allowedAnswers": [
    {
      "system": "http://example.org/fhir/CodeSystem/screening-types",
      "code": "mental-health",  // ← References original code
      "display": "Mental Health Screening"
    }
  ]
}
```

#### After code change:
```json
// CodeSystem (code changed)
{
  "url": "http://example.org/fhir/CodeSystem/screening-types",
  "concept": [
    {
      "code": "screening-mental-health",  // ← NEW code
      "display": "Mental Health Screening"
    }
  ]
}

// TerminologyConstraint (now orphaned!)
{
  "id": "TERM-OBS-001",
  "allowedAnswers": [
    {
      "system": "http://example.org/fhir/CodeSystem/screening-types",
      "code": "mental-health",  // ← ORPHANED: no longer exists
      "display": "Mental Health Screening"
    }
  ]
}
```

#### Rule Advisory Detection (Phase 2):
```
⚠️ Rule Advisory: Orphaned Code Reference

Constraint: TERM-OBS-001 (Observation Category Binding)
Orphaned Reference:
  - system: http://example.org/fhir/CodeSystem/screening-types
  - code: mental-health (NOT FOUND)

Possible Actions:
  1. Update reference to use new code: "screening-mental-health"
  2. Remove this allowed answer from constraint
  3. Restore old code in CodeSystem
```

---

## Authoring Workflow

### 1. Create CodeSystem
```
User → Creates CodeSystem
     → Sets url, name, title
     → Adds concepts with codes and displays
```

### 2. Create TerminologyConstraint
```
User → Creates constraint
     → Selects resource type and path
     → Chooses constraint type (binding, allowedValues)
     → Picks allowed codes from CodeSystem (browser/search)
     → System creates AllowedAnswer references (system + code)
```

### 3. Edit CodeSystem Concept Code
```
User → Changes concept.code from "A" to "B"
System → Allows change (no blocking)
      → Schedules Rule Advisory scan
      → Detects orphaned AllowedAnswer references
      → Displays advisory in UI
```

### 4. Resolve Orphaned References
```
User → Reviews Rule Advisory
     → Option 1: Updates constraint to use new code "B"
     → Option 2: Removes allowed answer from constraint
     → Option 3: Reverts code change back to "A"
```

---

## Storage Patterns

### Option A: File-based (Recommended for Phase 1)
```
project/
├── terminology/
│   ├── screening-types.json        (CodeSystem)
│   ├── marital-status.json         (CodeSystem)
│   └── observation-categories.json (CodeSystem)
├── constraints/
│   ├── observation-constraints.json (TerminologyConstraints)
│   └── patient-constraints.json     (TerminologyConstraints)
└── rules.json                       (Business rules)
```

### Option B: Database (Future)
```
Tables:
- code_systems
- code_system_concepts
- terminology_constraints
- allowed_answers

Indexes:
- code_systems.url (unique)
- concepts (system + code composite unique)
- allowed_answers (system + code for lookups)
```

---

## JSON Serialization Examples

### Minimal CodeSystem
```json
{
  "url": "http://example.org/fhir/CodeSystem/simple",
  "concept": [
    { "code": "A", "display": "Option A" },
    { "code": "B", "display": "Option B" }
  ]
}
```

### Hierarchical CodeSystem
```json
{
  "url": "http://example.org/fhir/CodeSystem/hierarchical",
  "concept": [
    {
      "code": "parent",
      "display": "Parent Concept",
      "concept": [
        { "code": "child-1", "display": "Child 1" },
        { "code": "child-2", "display": "Child 2" }
      ]
    }
  ]
}
```

### TerminologyConstraint with AllowedAnswers
```json
{
  "id": "TERM-001",
  "resourceType": "Observation",
  "path": "Observation.code.coding",
  "constraintType": "binding",
  "allowedAnswers": [
    {
      "system": "http://example.org/fhir/CodeSystem/simple",
      "code": "A",
      "display": "Option A"
    }
  ]
}
```

---

## Summary

- **4 domain models:** CodeSystem, CodeSystemConcept, TerminologyConstraint, AllowedAnswer
- **FHIR identity pattern:** No internal IDs, identity is system + code
- **Logical references:** AllowedAnswer → CodeSystemConcept (not enforced)
- **Rule Advisory:** Detects orphaned references when codes change (Phase 2)
- **Storage:** JSON files or database (file-based recommended for Phase 1)
