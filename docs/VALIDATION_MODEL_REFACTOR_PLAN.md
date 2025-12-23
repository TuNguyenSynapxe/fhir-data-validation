# Validation Error Model Refactor - Complete Implementation Plan

**Status:** ⚠️ PAUSED - Requires Systematic Implementation  
**Date:** 24 December 2025  
**Context:** Pre-release product, no backward compatibility required  

## Current State

We began removing NavigationInfo but discovered the refactor touches **~60 files across backend and frontend**. The scope is larger than initially assessed.

### Changes Started
- ❌ Deleted NavigationInfo.cs
- ✅ Removed Navigation property from ValidationError.cs  
- ✅ Updated ISmartPathNavigationService interface to return `string?`
- ⚠️ SmartPathNavigationService partially updated (return type changed, but internal code still references breadcrumbs/exists/missingParents)
- ❌ UnifiedErrorModelBuilder.cs broken (42 compile errors)

### Compilation Errors
- **42 errors** in backend
- SmartPathNavigationService: 30+ errors from breadcrumbs/exists/missingParents references
- UnifiedErrorModelBuilder: 12 errors from Navigation property and NavigationInfo type

## Target Architecture

### Backend Model (FINAL)
```csharp
public class ValidationError
{
    public required string Source { get; set; }
    public required string Severity { get; set; }
    public string? ResourceType { get; set; }
    public string? Path { get; set; }           // FHIRPath with scope selectors
    public string? JsonPointer { get; set; }    // JSON pointer for navigation
    public string? ErrorCode { get; set; }
    public required string Message { get; set; } // Rule-authored primary text
    public Dictionary<string, object>? Details { get; set; }
    public ValidationIssueExplanation? Explanation { get; set; }
    
    // REMOVED: Navigation property
}
```

### FHIRPath Semantics
**Key principle: `where()` clauses are scope selectors, NOT JSON structure**

Example path: `Observation.where(code.coding.code='HS').performer.display`

**Decomposition:**
- **Resource Type:** `Observation`
- **Scope Selector:** `where(code.coding.code='HS')` — identifies which Observation instance
- **Structural Path:** `performer.display` — actual JSON path within that instance

**JSON Pointer (output):** `/entry/2/resource/performer/display`  
**Breadcrumbs (frontend-derived):** `Observation` → `performer` → `display`  
**Filter chip (frontend-rendered):** `Filter: code.coding.code = 'HS'`

### Frontend Rendering Strategy

#### 1. Breadcrumbs (Structural Path Only)
```tsx
// Derive from path, show ONLY structural segments
function pathToBreadcrumbs(path: string): string[] {
  const parsed = parseFhirPathComponents(path);
  const crumbs = [parsed.resourceType];
  
  if (parsed.structuralPath) {
    crumbs.push(...parsed.structuralPath.split('.').filter(Boolean));
  }
  
  return crumbs;
}

// Example: Observation.where(code='HS').performer.display
// Output: ["Observation", "performer", "display"]
```

#### 2. Scope Selector (Separate Filter Chip)
```tsx
// Extract and render where() as a separate visual element
function renderScopeSelector(path: string) {
  const parsed = parseFhirPathComponents(path);
  
  if (parsed.scopeSelector) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        <Filter size={12} />
        <span>{parsed.scopeSelector}</span>
      </div>
    );
  }
  
  return null;
}

// Example: Observation.where(code.coding.code='HS').performer.display
// Output: Chip displaying "code.coding.code='HS'"
```

#### 3. Combined Display Layout
```tsx
<div className="flex items-center gap-2">
  {/* Breadcrumbs: structural path only */}
  <div className="flex items-center">
    {breadcrumbs.map((crumb, i) => (
      <Fragment key={i}>
        {i > 0 && <ChevronRight size={12} className="text-gray-400" />}
        <span className="text-sm">{crumb}</span>
      </Fragment>
    ))}
  </div>
  
  {/* Scope selector: rendered separately */}
  {renderScopeSelector(error.path)}
</div>
```

**Visual result:**
```
Observation → performer → display  [Filter: code.coding.code='HS']
```

## Implementation Steps (In Order)

### Phase 1: Complete SmartPathNavigationService Refactor
**Goal:** Return only JSON pointer, remove all breadcrumb/exists/missingParents logic

**Files:**
- `backend/src/Pss.FhirProcessor.Engine/Services/SmartPathNavigationService.cs` (491 lines)

**Tasks:**
1. Remove all `breadcrumbs.Add()` statements (~15 locations)
2. Remove all `exists = false` assignments (~10 locations)
3. Remove all `missingParents.Add()` statements (~10 locations)
4. Keep only `pointer.Append()` logic
5. Simplify early returns to just `return null` on errors

**Complexity:** MEDIUM — Tedious but straightforward deletion

---

### Phase 2: Fix UnifiedErrorModelBuilder
**Goal:** Use jsonPointer string directly, remove all Navigation assignments

**Files:**
- `backend/src/Pss.FhirProcessor.Engine/Services/UnifiedErrorModelBuilder.cs` (432 lines)

**Tasks:**
1. Replace all `NavigationInfo? navigation = ...` with `string? jsonPointer = ...`
2. Replace all `navigation = await _navigationService.ResolvePathAsync(...)` with `jsonPointer = await ...`
3. Replace all `error.Navigation = navigation` with removal (property doesn't exist)
4. Replace all `error.JsonPointer = navigation.JsonPointer` with `error.JsonPointer = jsonPointer`
5. Replace all `JsonPointer = navigation?.JsonPointer` in object initializers with `JsonPointer = jsonPointer`

**Affected methods:**
- `EnhanceWithNavigationAsync()` (2 locations)
- `CreateFromFhirIssueAsync()` (3 locations)
- `CreateFromCodeMasterErrorAsync()` (1 location)
- `CreateFromBusinessRuleErrorAsync()` (1 location)
- `CreateFromReferenceErrorAsync()` (1 location)
- `EnhanceErrorListAsync()` (2 locations)

**Complexity:** MEDIUM — Systematic find-and-replace across multiple methods

---

### Phase 3: Fix Test Files
**Goal:** Remove NavigationInfo mock objects

**Files:**
- `backend/tests/Pss.FhirProcessor.Engine.Tests/Services/UnifiedErrorModelBuilderTests.cs`
- Any other test files referencing NavigationInfo

**Tasks:**
1. Remove all `new NavigationInfo { ... }` instantiations
2. Update assertions to check `error.JsonPointer` instead of `error.Navigation.JsonPointer`
3. Remove `navigation.breadcrumbs` assertions
4. Remove `navigation.exists` assertions

**Complexity:** LOW — Tests should mostly just need navigation references removed

---

### Phase 4: Frontend Type Definitions
**Goal:** Remove navigation field from TypeScript interfaces

**Files:**
- `frontend/src/types/validation.ts` (or wherever UnifiedError/ValidationError is defined)

**Tasks:**
1. Remove `navigation?: { jsonPointer?: string; breadcrumbs?: string[]; ... }` from interface
2. Ensure `jsonPointer?: string` is at top level
3. Update any type guards or validators

**Complexity:** LOW — Single type definition update

---

### Phase 5: Frontend Component Updates
**Goal:** Derive breadcrumbs from path, remove navigation.* fallbacks

**Files to update (from Phase 1 Audit):**
1. `frontend/src/components/playground/ErrorTable.tsx` ✅ **DONE** (already updated)
2. `frontend/src/components/playground/Validation/ValidationErrorItem.tsx` — Remove `error.navigation?.jsonPointer` fallback
3. `frontend/src/components/playground/Validation/ErrorCard.tsx` — Remove `error.navigation?.jsonPointer` fallback
4. `frontend/src/components/playground/Validation/GroupedErrorCard.tsx` — Remove navigation fallbacks
5. `frontend/src/utils/validationGrouping.ts` — Remove navigation fallbacks
6. `frontend/src/pages/PlaygroundPage.tsx` — Remove navigation fallbacks

**Tasks:**
1. Replace all `error.jsonPointer || error.navigation?.jsonPointer` with `error.jsonPointer`
2. Replace all `error.navigation?.breadcrumbs` with `pathToBreadcrumbs(error.path)`
3. Add scope selector rendering using `renderScopeSelector(error.path)`

**Complexity:** MEDIUM — Requires careful UI updates and testing

---

### Phase 6: Add Scope Selector UI Component
**Goal:** Create reusable component for rendering where() filters

**New files:**
- `frontend/src/components/playground/Validation/ScopeSelectorChip.tsx`

**Component API:**
```tsx
interface ScopeSelectorChipProps {
  fhirPath: string;
  className?: string;
}

export function ScopeSelectorChip({ fhirPath, className }: ScopeSelectorChipProps) {
  const parsed = parseFhirPathComponents(fhirPath);
  
  if (!parsed.scopeSelector) return null;
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 ${className || ''}`}>
      <Filter size={12} />
      <span title={`where(${parsed.scopeSelector})`}>
        {formatScopeSelector(parsed.scopeSelector)}
      </span>
    </div>
  );
}
```

**Usage:**
```tsx
<div className="flex items-center gap-2">
  <SmartPathBreadcrumb path={error.path} />
  <ScopeSelectorChip fhirPath={error.path} />
</div>
```

**Complexity:** LOW — New component, doesn't affect existing code

---

### Phase 7: Update SmartPathBreadcrumb Component
**Goal:** Ensure breadcrumbs show only structural path, not scope selectors

**Files:**
- `frontend/src/components/playground/Validation/SmartPathBreadcrumb.tsx`

**Tasks:**
1. Verify `parseFhirPathComponents()` correctly excludes scope selectors from structural path
2. Add inline comment explaining why where() is excluded
3. Test with complex paths like `Observation.where(code='HS').component.where(code='BP').valueQuantity`

**Complexity:** LOW — Likely already correct, just needs verification and comments

---

### Phase 8: Documentation and Cleanup
**Goal:** Update docs and remove unused code

**Tasks:**
1. Update `/docs/08_unified_error_model.md` to remove NavigationInfo references
2. Update `/docs/07_smart_path_navigation.md` to document new string-only return
3. Add inline comments explaining FHIRPath semantics in key files:
   - Why where() is not in breadcrumbs
   - Why scope is rendered separately
   - Why jsonPointer is top-level only
4. Remove any unused imports of NavigationInfo
5. Update PHASE_2_VALIDATION_MODEL_REFACTOR.md with final status

**Complexity:** LOW — Documentation updates

---

## Rollback Strategy

If refactor is paused or abandoned:

1. **Restore NavigationInfo.cs** from git history
2. **Restore Navigation property** in ValidationError.cs
3. **Revert ISmartPathNavigationService** interface to return NavigationInfo
4. **Revert SmartPathNavigationService** return type
5. **Do NOT rollback frontend changes** — ErrorTable.tsx breadcrumb derivation is an improvement

## Risk Assessment

| Area | Risk Level | Mitigation |
|------|-----------|------------|
| Backend model changes | MEDIUM | Systematic find-and-replace, compile-time safety |
| SmartPathNavigationService refactor | LOW | Mostly deletion, pointer logic unchanged |
| UnifiedErrorModelBuilder | MEDIUM | Many call sites, but straightforward pattern |
| Test updates | LOW | Tests verify correct behavior, easy to fix |
| Frontend type updates | LOW | Single interface change, TypeScript catches errors |
| Frontend component updates | MEDIUM | Requires UI testing to verify breadcrumbs and filters render correctly |
| UI/UX impact | LOW | Improved semantics, clearer separation of concerns |

## Success Criteria

### Backend
- ✅ No compilation errors
- ✅ All unit tests pass
- ✅ SmartPathNavigationService returns correct JSON pointers
- ✅ ValidationError model contains only essential fields

### Frontend
- ✅ All TypeScript compilation succeeds
- ✅ Breadcrumbs show only structural path segments
- ✅ Scope selectors render as separate filter chips
- ✅ Jump-to-JSON navigation still works correctly
- ✅ Error messages display correctly (rule-authored text)
- ✅ No console errors or React warnings

### Documentation
- ✅ Inline comments explain FHIRPath semantics
- ✅ Spec docs updated to reflect new model
- ✅ Migration guide added for future developers

## Estimated Effort

- **Phase 1 (SmartPathNavigationService):** 30 minutes
- **Phase 2 (UnifiedErrorModelBuilder):** 45 minutes
- **Phase 3 (Test fixes):** 30 minutes
- **Phase 4 (Frontend types):** 15 minutes
- **Phase 5 (Frontend components):** 60 minutes
- **Phase 6 (ScopeSelectorChip):** 30 minutes
- **Phase 7 (SmartPathBreadcrumb):** 15 minutes
- **Phase 8 (Documentation):** 30 minutes

**Total:** ~4 hours of focused development

## Next Steps

1. **Review this plan** with stakeholders
2. **Allocate dedicated time block** for implementation (avoid interruptions)
3. **Work phase-by-phase** — complete each phase before moving to next
4. **Test incrementally** — verify backend compiles after Phases 1-3, verify UI after Phases 5-7
5. **Commit frequently** — one commit per phase for easy rollback if needed

## Questions to Resolve

1. **Scope selector formatting:** Should `where(code.coding.code='HS')` be formatted as `code = HS` (simplified) or shown verbatim?
2. **Multiple scope selectors:** How to handle `Observation.where(code='HS').component.where(code='BP').value`? Show both filters?
3. **Array indices:** Should `[0]`, `[1]` appear in breadcrumbs or as separate indicators?
4. **Error message priority:** Confirm that rule-authored `message` always takes precedence (no auto-generation)?

---

**STATUS:** Awaiting approval to proceed with Phase 1.
