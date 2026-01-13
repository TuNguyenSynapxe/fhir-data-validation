---
🧪 Exploratory Design  
This document is not authoritative and may be superseded.
---

# Terminology Phase 1 — Scope Lock

## Purpose

Phase 1 implements **simple lookup tables** for FHIR CodeSystems containing only **code + display** pairs. This provides basic terminology management for validation rules without the complexity of full FHIR CodeSystem features.

## Architecture

- **Backend**: TerminologyController with file-based storage
- **Frontend**: CodeMasterEditor (list → detail → concept editor)
- **Storage**: One JSON file per CodeSystem in `{projectId}/terminology/{url-hash}.json`
- **API**: RESTful endpoints (GET list, GET by-url, PUT save, DELETE)

## IN-SCOPE (Phase 1)

### Data Model
✅ **CodeSetDto**:
- `url` (string, required) - CodeSystem canonical URL
- `name` (string, optional) - Human-readable name
- `concepts` (array, required) - List of concepts

✅ **CodeSetConceptDto**:
- `code` (string, required) - Unique concept code
- `display` (string, optional) - Human-readable label

### Features
✅ Create/Read/Update/Delete CodeSystems
✅ Create/Read/Update/Delete Concepts within CodeSystem
✅ Search concepts by code or display
✅ File-based storage (one file per CodeSystem)
✅ Phase B migration from legacy Project.codeMasterJson

### UI Components
✅ List view (shows all CodeSystems)
✅ Detail view (shows concepts for selected CodeSystem)
✅ Concept editor (edit code + display fields only)
✅ Add/Delete CodeSystem buttons
✅ Add/Delete Concept buttons
✅ Import Legacy data button (Phase B)

### Validation
✅ Code uniqueness within CodeSystem
✅ Required fields (code must not be empty)
✅ Basic error handling

## OUT-OF-SCOPE (Phase 1)

### FHIR CodeSystem Properties (Deferred to Phase 2+)
❌ `definition` - Concept definition text
❌ `designation` - Alternate labels (translations, synonyms)
❌ `property` - Additional concept properties
❌ `version` - CodeSystem versioning
❌ `status` - Publication status (draft/active/retired)
❌ `date` - Last updated timestamp
❌ `publisher` - Organization responsible
❌ `contact` - Contact information
❌ `copyright` - Usage rights
❌ `valueSet` - Associated ValueSets
❌ `filter` - Filtering capabilities
❌ `hierarchy` - Parent/child relationships

### Question Configuration (Phase 2)
❌ Linking CodeSystems to FHIR Questionnaire items
❌ Enforcing allowed values for questionnaire answers
❌ Dynamic dropdown population from CodeSystem
❌ Answer validation against CodeSystem
❌ Question item constraints

### Advanced Features (Phase 2+)
❌ Import from external terminologies (SNOMED, LOINC, etc.)
❌ Export to standard formats (CSV, TSV, JSON-LD)
❌ Bulk edit operations
❌ Version history / audit trail
❌ CodeSystem composition (include/exclude filters)
❌ Concept mapping between CodeSystems

### Validation Rules Integration (Phase 2)
❌ Automatic rule generation from CodeSystems
❌ FHIRPath expressions using CodeSystem concepts
❌ ValueSet binding enforcement
❌ Code validation against terminology

## Phase 1 Implementation Status

### Backend (Complete)
✅ `TerminologyController.cs` - 4 RESTful endpoints
✅ `TerminologyService.cs` - File-based storage
✅ `CodeSetDto.cs` / `CodeSetConceptDto.cs` - Minimal DTOs
✅ Mapping: Domain ↔ DTO (strips non-Phase-1 fields)

### Frontend (Complete)
✅ `terminologyApi.ts` - API client
✅ `CodeMasterEditor.tsx` - Main UI component
✅ `ConceptListPanel.tsx` - Concept list with search
✅ `ConceptEditorPanel.tsx` - Code + display editor
✅ Phase A migration: Connected to TerminologyController
✅ Phase B migration: Legacy data import

### Documentation (Complete)
✅ `PHASE_A_MIGRATION_COMPLETE.md` - API connection
✅ `PHASE_B_MIGRATION_BRIDGE.md` - Legacy import
✅ `TERMINOLOGY_PHASE_1.md` - Scope lock (this file)

## Phase 2 Preview

**Question Configuration** will enable:
- Associate CodeSystems with Questionnaire items
- Enforce allowed answers from CodeSystem concepts
- Dynamic UI generation (dropdowns, radio buttons)
- Answer validation rules

**Example Use Case (Phase 2)**:
```json
{
  "linkId": "bloodType",
  "type": "choice",
  "answerValueSet": "http://example.org/fhir/CodeSystem/blood-types",
  "required": true
}
```

UI would:
1. Load CodeSystem by URL
2. Generate dropdown from concepts
3. Validate answer is in allowed codes
4. Save coded answer to response

## Migration Path

### Current State (Phase 1)
```
User creates CodeSystem manually
  → UI: Add Terminology → Edit concepts → Save
  → Storage: File per CodeSystem
  → Usage: Reference in validation rules (future)
```

### Phase 2 Goal
```
User creates Questionnaire item
  → Select "Choice" type
  → Link to existing CodeSystem (or create new)
  → UI auto-generates answer options
  → Response validation against CodeSystem
```

## Design Decisions

### Why "Code + Display Only"?
- **Simplicity**: Minimal viable product for lookup tables
- **Focus**: 80% of use cases need only code + label
- **Stability**: Locked scope prevents scope creep
- **Extensibility**: Easy to add fields later without breaking changes

### Why File-Based Storage?
- **Flexibility**: Each CodeSystem is independent JSON file
- **Performance**: No database queries for read operations
- **Version Control**: Files can be tracked in git (future)
- **Migration**: Easy to move to database later if needed

### Why Separate from Project.codeMasterJson?
- **Modularity**: CodeSystems are first-class entities
- **Scalability**: No single JSON blob limit
- **API Design**: RESTful CRUD vs. bulk update
- **Future**: Enables sharing CodeSystems across projects

## Breaking Changes Policy

**Phase 1 is STABLE** - No breaking changes will be introduced.

**Adding Fields (Phase 2+)**:
- ✅ **Safe**: Add optional fields to DTOs (backward compatible)
- ✅ **Safe**: Add new endpoints (existing endpoints unchanged)
- ❌ **Unsafe**: Change DTO field types
- ❌ **Unsafe**: Remove or rename existing fields
- ❌ **Unsafe**: Change endpoint behavior

**Deprecation Process**:
1. Mark old API as `[Obsolete]` with migration guidance
2. Run both old + new APIs for 1 release cycle
3. Remove old API after confirmed zero usage

## Testing Strategy

### Phase 1 Test Coverage
✅ Unit Tests: DTO mapping (Domain ↔ DTO)
✅ Integration Tests: TerminologyController endpoints
✅ Manual Tests: UI workflows (create/edit/delete)
✅ Migration Tests: Legacy data import

### Phase 2 Test Requirements (Future)
- Question Configuration: Link CodeSystem to Questionnaire
- Answer Validation: Enforce allowed codes
- UI Generation: Dropdown rendering from concepts
- Response Persistence: Coded answers saved correctly

## Known Limitations

1. **No Search Across CodeSystems**: Search only works within selected CodeSystem
2. **No Import/Export**: Manual entry only (except legacy migration)
3. **No Validation Against External Terminologies**: Cannot verify codes against SNOMED/LOINC
4. **No Version History**: Overwrites on save (no undo)
5. **No Bulk Operations**: Edit one concept at a time
6. **No Multi-Project Sharing**: CodeSystems scoped to single project

*These limitations are intentional for Phase 1 and will be addressed in future phases as needed.*

## FAQ

**Q: Can I add more fields to concepts now?**  
A: No. Phase 1 is locked to `code + display` only. Additional fields will come in Phase 2.

**Q: Why can't I import from SNOMED?**  
A: External terminology integration is Phase 2+. Phase 1 focuses on custom lookup tables.

**Q: Will my Phase 1 data work in Phase 2?**  
A: Yes. Phase 2 will be backward compatible. Existing CodeSystems will continue to work.

**Q: Can I use CodeSystems in validation rules now?**  
A: Not yet. Validation rule integration is Phase 2. Currently, CodeSystems are just stored data.

**Q: What happens to legacy Project.codeMasterJson?**  
A: Phase B migration moves data to new storage. Legacy field will be removed in Phase C after all projects migrate.

---

**Status**: 🔒 **LOCKED** — No new features until Phase 2  
**Last Updated**: 2025-12-23  
**Next Phase**: Question Configuration (TBD)
