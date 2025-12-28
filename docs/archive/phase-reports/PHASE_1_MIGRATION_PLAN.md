# Phase 1 Terminology Migration Plan

## Current Status (22 Dec 2025)

### ✅ COMPLETED: Backend Phase 1 Implementation

The backend is **fully Phase 1 compliant**:

1. **New DTOs Created** (`CodeSetDto.cs`):
   ```csharp
   public class CodeSetDto {
       public string Url { get; set; }
       public string? Name { get; set; }
       public List<CodeSetConceptDto> Concepts { get; set; }
   }
   
   public class CodeSetConceptDto {
       public string Code { get; set; }
       public string? Display { get; set; }
   }
   ```

2. **TerminologyController Updated**:
   - All endpoints accept/return DTOs only
   - Internal mapping between DTOs ↔ domain models
   - Automatic stripping of advanced fields (definition, designation, property, child concepts)

3. **API Endpoints**:
   - `GET /api/projects/{projectId}/terminology/codesystems` → Returns `CodeSetDto[]`
   - `GET /api/projects/{projectId}/terminology/codesystems/by-url` → Returns `CodeSetDto`
   - `PUT /api/projects/{projectId}/terminology/codesystems` → Accepts `CodeSetDto`
   - `DELETE /api/projects/{projectId}/terminology/codesystems` → By URL

**Result**: Backend exposes only code + display. Backend is production-ready for Phase 1.

---

### ❌ REVERTED: Frontend Phase 1 Implementation

Frontend changes were **reverted** due to extensive breaking changes (~100 TypeScript errors).

**What Was Attempted**:
- ✅ Core types updated (CodeSystem, CodeSystemConcept reduced to url, name, code, display)
- ✅ ConceptEditorPanel simplified (removed advanced fields)
- ✅ Export utilities updated (lean JSON/CSV)
- ❌ ~50 files still referenced removed fields

**Why Reverted**:
- Breaking changes across validators, CSV parsers, import dialogs, list panels
- References to removed fields: `status`, `title`, `description`, `publisher`, `version`, `content`, `count`, `definition`, `designation`, `property`, `concept` children
- Estimated 4-6 hours additional work to complete
- High risk of runtime bugs without comprehensive testing

---

## Incremental Migration Strategy

### Phase 1A: Backend Only (DONE ✅)
- Backend uses DTOs
- Frontend continues using full FHIR types
- **Benefit**: API is clean, frontend has time to migrate
- **Risk**: None - backward compatible

### Phase 1B: Update Frontend Types (2-3 hours)
**Goal**: Make TypeScript types match DTOs without breaking existing code

**Files to Update**:
1. `frontend/src/types/terminology.ts`:
   ```typescript
   // Minimal Phase 1 types
   export interface CodeSystem {
     url: string;
     name?: string;
     concept: CodeSystemConcept[];
   }
   
   export interface CodeSystemConcept {
     code: string;
     display?: string;
   }
   ```

2. Add adapter layer for gradual migration:
   ```typescript
   // frontend/src/utils/terminologyAdapter.ts
   export function toLegacyCodeSystem(dto: CodeSetDto): LegacyCodeSystem {
     return {
       url: dto.url,
       name: dto.name,
       title: dto.name, // backward compat
       status: 'active',
       content: 'complete',
       concept: dto.concepts.map(c => ({
         code: c.code,
         display: c.display,
       })),
     };
   }
   ```

**Impact**: Low - types change but adapter provides compatibility

### Phase 1C: Update UI Components (3-4 hours)
**Goal**: Remove UI for Phase 2+ fields

**Components to Update**:
1. **ConceptEditorPanel** - Remove:
   - Definition field
   - Designations section
   - Properties section
   - Advanced fields toggle
   - Child concepts section

2. **CodeSystemListPanel** - Remove:
   - Status badge display
   - Publisher display
   - Version display  
   - Description display

3. **CreateCodeSystemDialog** - Simplify to:
   - URL (required)
   - Name (optional)
   - Concepts (code + display only)

4. **ImportCodeSystemDialog** - Strip extra fields:
   - Accept FHIR input but only extract url, name, concepts
   - Warn user about ignored fields

**Impact**: Medium - UI changes visible to users

### Phase 1D: Update Utilities (1-2 hours)
**Goal**: Clean up validators and parsers

**Files to Update**:
1. `frontend/src/utils/codeSystemValidator.ts`:
   - Remove status validation
   - Remove content validation
   - Remove definition validation
   - Remove hierarchy validation

2. `frontend/src/utils/csvParser.ts`:
   - CSV format: `code,display` only
   - Remove definition column support
   - Remove parentCode column support

3. `frontend/src/utils/exportCodeSystem.ts`:
   - JSON export: `{url, name, concepts[{code, display}]}`
   - CSV export: `code,display` only

**Impact**: Low - mostly internal logic

---

## Testing Checklist

### Backend Tests (Already Passing)
- [x] GET codesystems returns DTOs
- [x] GET by-url returns single DTO
- [x] PUT accepts DTO and strips extra fields
- [x] DELETE works by URL

### Frontend Tests (After Migration)
- [ ] Can create CodeSystem with url + name only
- [ ] Can add concept with code + display only
- [ ] Cannot add definition, designation, property
- [ ] Import FHIR JSON: extra fields ignored with warning
- [ ] Import CSV: only code,display columns supported
- [ ] Export JSON: matches lean schema
- [ ] Export CSV: only code,display columns
- [ ] Delete CodeSystem works
- [ ] Bulk import works with lean format

---

## Migration Timeline

| Phase | Task | Effort | Dependencies |
|-------|------|--------|--------------|
| 1A ✅ | Backend DTOs | DONE | None |
| 1B | Frontend types + adapter | 2-3h | None |
| 1C | UI components | 3-4h | 1B |
| 1D | Utilities | 1-2h | 1B, 1C |
| **Total** | | **6-9h** | |

---

## Rollback Plan

If migration issues arise:

1. **Backend**: Keep as-is (DTOs provide isolation)
2. **Frontend**: Use adapter layer to maintain compatibility
3. **Gradual**: Migrate one component at a time, test thoroughly

---

## Benefits After Full Migration

1. **Simpler API**: Clean code + display only
2. **Smaller Payloads**: ~70% reduction in JSON size
3. **Faster UI**: Less data to render
4. **Clear Separation**: Phase 1 vocabulary ≠ Phase 2 rules
5. **Better UX**: Users focus on lookup tables, not FHIR complexity

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Existing data has advanced fields | Backend strips on save |
| Users expect full FHIR | Clear messaging: "Phase 1 = Vocabulary Only" |
| Import fails on old files | Adapter layer supports legacy format |
| UI breaks unexpectedly | Component-by-component migration with testing |

---

## Decision

**Recommended Approach**: Incremental migration (Phase 1B → 1C → 1D)
- Lower risk
- Testable at each step
- Can pause/resume anytime
- Backend already done, frontend catches up gradually

**Alternative**: Big bang migration
- Faster but riskier
- Requires dedicated testing time
- Harder to rollback if issues found

---

## Next Steps

1. Review this plan with team
2. Decide on timeline (sprint planning)
3. Start with Phase 1B (types + adapter)
4. Test thoroughly before moving to 1C
5. Update user documentation to explain Phase 1 scope

---

**Document Version**: 1.0  
**Date**: 22 December 2025  
**Author**: Phase 1 Terminology Cleanup Initiative
