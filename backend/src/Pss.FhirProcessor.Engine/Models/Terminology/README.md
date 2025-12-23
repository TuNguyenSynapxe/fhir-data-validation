# Terminology Authoring Domain Models - Phase 1

## Overview
This document describes the backend domain models for **authoring-only** FHIR terminology. These models follow FHIR principles while supporting a fully editable authoring workflow.

## Design Principles

### 1. FHIR-First Identity
- **No internal IDs** for concepts
- Identity is always `system + code`
- CodeSystem identity is `url`
- Changes to codes are permitted but trigger Rule Advisory warnings

### 2. Authoring-Only Scope
The following are **intentionally NOT implemented**:
- ❌ Locking mechanisms
- ❌ Read-only enforcement
- ❌ Lifecycle management (draft → active → retired enforcement)
- ❌ Versioning/history tracking
- ❌ Approval workflows
- ❌ Permission systems

Everything is **fully editable** at all times.

### 3. JSON as Storage Format
All models serialize cleanly to/from JSON for persistence and API transport.

---

## Domain Models

### 1. CodeSystem (FHIR-aligned)
**Location:** `Models/Terminology/CodeSystem.cs`

Represents a complete FHIR CodeSystem with its concepts.

**Identity:** `url` (canonical URL)

**Key Properties:**
- `url`: Canonical identifier (e.g., `http://example.org/fhir/CodeSystem/screening-types`)
- `version`: Business version (metadata only)
- `name`: Computer-friendly name
- `title`: Human-friendly title
- `status`: Publication status (draft | active | retired) - **no enforcement**
- `concept`: List of CodeSystemConcept objects

**JSON Example:** See `examples/terminology/example-codesystem.json`

---

### 2. CodeSystemConcept (FHIR-aligned)
**Location:** `Models/Terminology/CodeSystemConcept.cs`

Represents a concept within a CodeSystem.

**Identity:** `code` (unique within parent CodeSystem)

**Key Properties:**
- `code`: The concept code (primary identifier) - **fully editable**
- `display`: Human-readable text
- `definition`: Formal definition
- `designation`: Alternative representations (translations, synonyms)
- `property`: Additional properties (status, parent, etc.)
- `concept`: Child concepts (for hierarchies)

**Important:** If a `code` value is changed, any rules referencing the old code become orphaned and should be flagged via **Rule Advisory**.

**JSON Example:** See concepts within `examples/terminology/example-codesystem.json`

---

### 3. TerminologyConstraint (Project-specific)
**Location:** `Models/Terminology/TerminologyConstraint.cs`

Defines validation rules that reference CodeSystem concepts.

**Identity:** `id` (constraint identifier)

**Key Properties:**
- `id`: Unique constraint ID (e.g., "TERM-OBS-001")
- `resourceType`: FHIR resource type (e.g., "Observation")
- `path`: FHIRPath to constrained element (e.g., "Observation.category.coding")
- `constraintType`: Type of constraint (required | allowedValues | binding)
- `bindingStrength`: For bindings (required | extensible | preferred | example)
- `valueSetUrl`: Reference to CodeSystem URL
- `allowedAnswers`: List of AllowedAnswer objects (system + code references)
- `severity`: Violation severity (error | warning | information)
- `message`: Error message template

**JSON Example:** See `examples/terminology/example-terminology-constraint.json`

---

### 4. AllowedAnswer (Project-specific)
**Location:** `Models/Terminology/AllowedAnswer.cs`

References a specific code within a CodeSystem (part of TerminologyConstraint).

**Identity:** `system + code` (no internal IDs)

**Key Properties:**
- `system`: CodeSystem URL
- `code`: Concept code within that system
- `display`: Human-readable text (optional, for UX)
- `version`: CodeSystem version (optional)
- `note`: Additional context about why this answer is allowed

**Important:** This is a **reference by value** (system + code). If the referenced code is changed or deleted in the CodeSystem, the constraint becomes orphaned and should be flagged.

**JSON Example:** See `allowedAnswers` array in constraint examples

---

## Usage Examples

### Example 1: Simple CodeSystem with Flat Concepts
```json
{
  "url": "http://example.org/fhir/CodeSystem/screening-observation-category",
  "version": "1.0.0",
  "name": "ScreeningObservationCategory",
  "title": "Screening Observation Categories",
  "status": "active",
  "concept": [
    {
      "code": "screening-mental-health",
      "display": "Mental Health Screening"
    },
    {
      "code": "screening-social",
      "display": "Social Screening"
    }
  ]
}
```

### Example 2: Hierarchical CodeSystem
```json
{
  "url": "http://example.org/fhir/CodeSystem/screening-types",
  "concept": [
    {
      "code": "screening-developmental",
      "display": "Developmental Screening",
      "concept": [
        {
          "code": "screening-developmental-infant",
          "display": "Infant Developmental Screening"
        },
        {
          "code": "screening-developmental-toddler",
          "display": "Toddler Developmental Screening"
        }
      ]
    }
  ]
}
```

### Example 3: Terminology Constraint
```json
{
  "id": "TERM-OBS-001",
  "resourceType": "Observation",
  "path": "Observation.category.coding",
  "constraintType": "binding",
  "bindingStrength": "required",
  "valueSetUrl": "http://example.org/fhir/CodeSystem/screening-observation-category",
  "allowedAnswers": [
    {
      "system": "http://example.org/fhir/CodeSystem/screening-observation-category",
      "code": "screening-mental-health",
      "display": "Mental Health Screening"
    }
  ],
  "severity": "error",
  "message": "Observation category must be one of the allowed screening types"
}
```

---

## Rule Advisory Mechanism (Future Implementation)

When a CodeSystem concept's `code` value is changed or deleted:

1. **Detect Orphaned References:**
   - Scan all TerminologyConstraint.allowedAnswers
   - Identify references to the old system + code combination

2. **Report Advisory:**
   - Generate warnings for each orphaned constraint
   - Display in UI with navigation to affected constraints
   - Provide "Update Reference" or "Remove Constraint" actions

3. **No Blocking:**
   - Allow the code change to proceed
   - Advisory is informational only
   - User can choose to fix or ignore

---

## Integration Points

### Backend Services (Future Phases)
- **TerminologyService:** CRUD operations for CodeSystem
- **ConstraintService:** CRUD operations for TerminologyConstraint
- **RuleAdvisoryService:** Detect and report orphaned references
- **ValidationEngine:** Apply TerminologyConstraints during validation

### Frontend Components (Future Phases)
- **CodeSystem Editor:** Tree view for authoring concepts
- **Constraint Editor:** Form for defining terminology constraints
- **Rule Advisory Panel:** Display orphaned references
- **Terminology Browser:** Search and select codes

---

## Testing Considerations

### Unit Tests
- Serialization/deserialization (JSON ↔ C# models)
- Validation of required fields
- Hierarchical concept navigation

### Integration Tests
- CodeSystem creation and updates
- Constraint creation with references
- Rule Advisory detection when code changes

### Authoring Workflow Tests
- Create CodeSystem with concepts
- Define constraints referencing those concepts
- Change a concept code
- Verify Rule Advisory detects orphaned references
- Update constraint to use new code

---

## What is NOT Implemented (Intentional)

The following are **out of scope** for this authoring-only system:

1. **Lifecycle Enforcement**
   - No transitions (draft → active → retired)
   - Status field is metadata only

2. **Locking/Concurrency**
   - No edit locks
   - No checkout/checkin
   - No conflict resolution

3. **Versioning/History**
   - No change tracking
   - No rollback
   - No audit trail

4. **Permissions**
   - No role-based access control
   - No read-only users
   - Everyone can edit everything

5. **Governance**
   - No approval workflows
   - No review process
   - No publishing mechanism

6. **Internal Identity**
   - No concept GUIDs or internal IDs
   - No surrogate keys
   - Identity is always FHIR-standard (system + code)

---

## Migration from Existing Models

If you have existing `CodeSystemDefinition.cs` or `CodeMasterDefinition.cs`:

1. **CodeSystemDefinition → CodeSystem**
   - Map `CodeSystemDefinition.Systems` to individual `CodeSystem` instances
   - Each `CodeSystem` gets its own file/record

2. **CodeMasterDefinition → TerminologyConstraint**
   - Extract validation logic into `TerminologyConstraint`
   - Convert `ScreeningType.Questions.AllowedAnswers` to `AllowedAnswer` references

3. **Maintain Compatibility**
   - Keep old models for backward compatibility during transition
   - Gradually migrate to new models

---

## Next Steps (Future Phases)

### Phase 2: Backend Services
- CRUD API for CodeSystem
- CRUD API for TerminologyConstraint
- Rule Advisory detection service
- Validation integration

### Phase 3: Frontend UI
- CodeSystem tree editor
- Constraint form builder
- Rule Advisory panel
- Terminology browser/search

### Phase 4: Advanced Features
- Import/export from FHIR servers
- Bulk operations
- Search and filter
- Terminology insights (usage statistics)

---

## Questions & Risks

### Assumptions Made
1. **JSON is sufficient for storage:** No RDBMS/foreign keys needed initially
2. **Rule Advisory is informational:** Breaking references is allowed but reported
3. **Flat file organization:** Each CodeSystem is a separate JSON file
4. **No external terminology servers:** All terminology is authored locally

### Risks
1. **Scale:** Large CodeSystems (1000+ concepts) may need pagination/lazy loading
2. **Performance:** Full-text search across all CodeSystems may be slow
3. **Data integrity:** No referential integrity enforcement (by design)
4. **Concurrent edits:** Last-write-wins without locking

### TODOs
- [ ] Define file/folder structure for storing CodeSystem JSON files
- [ ] Decide on naming conventions for CodeSystem files
- [ ] Determine if TerminologyConstraints are stored per-project or globally
- [ ] Specify Rule Advisory notification mechanism (polling vs. push)
- [ ] Define bulk import/export format

---

## Summary

**Phase 1 Complete:** Backend domain models created for authoring-only terminology system.

**Delivered:**
- ✅ FHIR-aligned CodeSystem and CodeSystemConcept models
- ✅ Project-specific TerminologyConstraint and AllowedAnswer models
- ✅ No internal IDs (system + code identity)
- ✅ Everything is editable
- ✅ JSON-serializable
- ✅ Example JSON files
- ✅ Documentation

**Intentionally NOT Implemented:**
- ❌ Locking, versioning, lifecycle, permissions
- ❌ Backend services/APIs (Phase 2)
- ❌ Frontend UI (Phase 3)
- ❌ Rule Advisory detection (Phase 2)
