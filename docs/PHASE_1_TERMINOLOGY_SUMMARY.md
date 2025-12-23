# Phase 1 Implementation Summary

## ✅ Completed: Backend Terminology Domain Models

### Files Created

#### Domain Models (C#)
1. **[Models/Terminology/CodeSystem.cs](backend/src/Pss.FhirProcessor.Engine/Models/Terminology/CodeSystem.cs)**
   - FHIR-aligned CodeSystem model
   - Identity: `url` (canonical URL)
   - 11 properties including concept list

2. **[Models/Terminology/CodeSystemConcept.cs](backend/src/Pss.FhirProcessor.Engine/Models/Terminology/CodeSystemConcept.cs)**
   - FHIR-aligned Concept model
   - Identity: `code` (within CodeSystem)
   - Supports hierarchies, designations, properties
   - Includes helper classes: ConceptDesignation, ConceptProperty, Coding

3. **[Models/Terminology/TerminologyConstraint.cs](backend/src/Pss.FhirProcessor.Engine/Models/Terminology/TerminologyConstraint.cs)**
   - Project-specific validation constraint model
   - References CodeSystem concepts via system + code
   - Supports binding and allowedValues constraints

4. **[Models/Terminology/AllowedAnswer.cs](backend/src/Pss.FhirProcessor.Engine/Models/Terminology/AllowedAnswer.cs)**
   - Project-specific reference model
   - Identity: `system + code` (no internal IDs)
   - Used within TerminologyConstraint

#### Example JSON Files
1. **[examples/terminology/example-codesystem.json](examples/terminology/example-codesystem.json)**
   - Screening observation categories
   - Demonstrates hierarchical concepts

2. **[examples/terminology/example-codesystem-marital-status.json](examples/terminology/example-codesystem-marital-status.json)**
   - HL7 v3 MaritalStatus codes
   - Demonstrates designations (translations)

3. **[examples/terminology/example-terminology-constraint.json](examples/terminology/example-terminology-constraint.json)**
   - Observation category binding constraint
   - Shows allowedAnswers structure

4. **[examples/terminology/example-terminology-constraint-patient.json](examples/terminology/example-terminology-constraint-patient.json)**
   - Patient marital status constraint
   - Includes notes on each allowed answer

#### Documentation
1. **[Models/Terminology/README.md](backend/src/Pss.FhirProcessor.Engine/Models/Terminology/README.md)**
   - Comprehensive documentation
   - Design principles
   - Usage examples
   - Integration guidance
   - What's intentionally NOT implemented

---

## Key Design Decisions

### 1. ✅ FHIR-First Identity
- **No internal concept IDs** (e.g., no GUIDs, no surrogate keys)
- CodeSystem identity: `url`
- Concept identity: `code` (within CodeSystem)
- AllowedAnswer identity: `system + code`

### 2. ✅ Everything Editable
- No locking mechanisms
- No read-only enforcement
- No lifecycle transitions (draft → active → retired)
- Code values can be changed at any time

### 3. ✅ Rule Advisory Pattern
- When a code is changed, rules referencing it become orphaned
- System reports via Rule Advisory (non-blocking)
- User can update or remove affected constraints
- **Implementation:** Deferred to Phase 2

### 4. ✅ JSON as Storage Format
- All models serialize cleanly to/from JSON
- Suitable for file-based storage or API transport
- No database schema required for Phase 1

---

## Assumptions Made

1. **JSON is sufficient for storage**
   - No RDBMS/foreign keys needed initially
   - Each CodeSystem is a separate JSON file
   - TerminologyConstraints stored alongside rules.json or separately

2. **Rule Advisory is informational only**
   - Breaking references is allowed
   - Detection happens post-edit (not pre-validation)
   - Non-blocking workflow

3. **Flat file organization**
   - CodeSystems stored in `terminology/` folder
   - No nested folder structure initially
   - Naming: `{system-name}.json` or `{url-hash}.json`

4. **Local terminology authoring**
   - No external FHIR terminology servers
   - All CodeSystems authored/imported locally
   - Import from FHIR server is future enhancement

5. **Single-user editing**
   - No concurrent edit handling
   - Last-write-wins by default
   - Conflict resolution is out of scope

---

## Risks & TODOs

### Risks
1. **Scale:** Large CodeSystems (1000+ concepts) may need:
   - Pagination in UI
   - Lazy loading of concepts
   - Search/filter optimization

2. **Performance:** Full-text search across all CodeSystems:
   - May need indexing service
   - Consider in-memory cache

3. **Data integrity:** No referential integrity enforcement:
   - Rule Advisory relies on user discipline
   - Orphaned references can accumulate

4. **Concurrent edits:** Last-write-wins without locking:
   - Risk of data loss if two users edit simultaneously
   - Consider optimistic locking in future

### TODOs (Future Phases)
- [ ] Define file/folder structure for CodeSystem storage
- [ ] Decide on file naming conventions (URL-based vs. name-based)
- [ ] Specify where TerminologyConstraints are stored (per-project or global)
- [ ] Design Rule Advisory detection algorithm
- [ ] Determine notification mechanism (polling vs. WebSocket)
- [ ] Plan bulk import from FHIR servers (FHIR $expand, $lookup)
- [ ] Design search/filter API for large CodeSystems
- [ ] Consider caching strategy for frequently used CodeSystems

---

## What is Intentionally NOT Implemented

| Feature | Status | Reason |
|---------|--------|--------|
| Locking | ❌ Not implemented | Authoring-only scope |
| Read-only mode | ❌ Not implemented | Everything editable |
| Lifecycle enforcement | ❌ Not implemented | Status is metadata only |
| Versioning/history | ❌ Not implemented | Simple authoring focus |
| Approval workflows | ❌ Not implemented | Out of scope |
| Permissions/RBAC | ❌ Not implemented | Single-author assumption |
| Internal concept IDs | ❌ Not implemented | FHIR identity pattern |
| Foreign key constraints | ❌ Not implemented | JSON storage |
| Concurrent edit detection | ❌ Not implemented | Last-write-wins |
| Audit trail | ❌ Not implemented | Simple authoring focus |

---

## Build Verification

```bash
cd backend
dotnet build src/Pss.FhirProcessor.Engine/Pss.FhirProcessor.Engine.csproj
```

**Result:** ✅ Build succeeded with 0 errors

---

## Next Steps

### Phase 2: Backend Services (Future)
1. **TerminologyService**
   - CRUD operations for CodeSystem
   - List, search, filter CodeSystems
   - Import from FHIR server

2. **ConstraintService**
   - CRUD operations for TerminologyConstraint
   - Validate constraint references against CodeSystems
   - Apply constraints during validation

3. **RuleAdvisoryService**
   - Detect orphaned references when code changes
   - Generate advisory reports
   - Suggest auto-fix actions

4. **ValidationEngine Integration**
   - Apply TerminologyConstraints during bundle validation
   - Integrate with existing ValidationPipeline
   - Report terminology violations in unified error model

### Phase 3: Frontend UI (Future)
1. **CodeSystem Tree Editor**
   - Visual tree for hierarchical concepts
   - Inline editing of code, display, definition
   - Drag-and-drop for reorganization

2. **Constraint Form Builder**
   - Select resource type and path
   - Choose constraint type (binding, allowedValues)
   - Pick allowed codes from CodeSystem browser

3. **Rule Advisory Panel**
   - Display orphaned references
   - Navigate to affected constraints
   - One-click update or remove actions

4. **Terminology Browser**
   - Search across all CodeSystems
   - Filter by system, code, display
   - Quick code picker for constraint authoring

---

## Questions for User (Optional)

1. **Storage:** File-based or database for CodeSystems?
   - File: Simple, version-control friendly
   - DB: Better for search, concurrent access

2. **Naming:** How to name CodeSystem files?
   - Option A: Use system URL path (e.g., `v3-MaritalStatus.json`)
   - Option B: Hash URL (e.g., `codesystem-abc123.json`)
   - Option C: User-defined name

3. **Constraints:** Store with rules.json or separately?
   - With rules: Single source of truth
   - Separate: Better organization, reusable across projects

4. **Import:** Need to import from external FHIR servers?
   - If yes, prioritize which servers (Ontoserver, FHIR.org, etc.)

---

## Summary

### ✅ Delivered
- 4 C# domain models (CodeSystem, CodeSystemConcept, TerminologyConstraint, AllowedAnswer)
- 4 example JSON files demonstrating usage
- Comprehensive README with design principles and guidance
- Build verification (successful compilation)

### ✅ Design Principles Followed
- FHIR-aligned identity (no internal IDs)
- Authoring-only scope (no locking, versioning, lifecycle)
- Everything editable
- JSON-serializable
- Rule Advisory pattern (non-blocking)

### ❌ Intentionally Not Implemented
- Backend services (Phase 2)
- Frontend UI (Phase 3)
- Rule Advisory detection (Phase 2)
- Locking, versioning, lifecycle, permissions

### 🎯 Ready for Phase 2
The domain models are ready for service layer implementation in Phase 2.
