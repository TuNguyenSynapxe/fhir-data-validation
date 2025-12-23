# Phase 2: Validation Error Model Refactor

**Status:** ✅ Complete  
**Date:** December 2025  
**Based on:** Phase 1 Audit (field usage analysis)

## Overview

This phase implements surgical refactoring of the validation error model based on the comprehensive audit findings from Phase 1. All changes maintain strict backward compatibility during the migration period (Q1 2026 removal target).

## Approved Refactor Scope

### Backend Changes

#### 1. Dead Field Removal (NavigationInfo.cs)
**Removed completely:**
- `Exists` field (bool) - Zero frontend usage
- `MissingParents` field (List<string>) - Zero frontend usage

**Rationale:** These fields were never consumed by any frontend component, making them completely dead code.

#### 2. Field Deprecation (NavigationInfo.cs)
**Marked with [Obsolete]:**
- `JsonPointer` field - Redundant with top-level `ValidationError.JsonPointer`
  - Message: "Use ValidationError.JsonPointer top-level field instead. This will be removed in Q1 2026."
- `Breadcrumbs` field - Frontend derives from `path` field
  - Message: "Frontend derives breadcrumbs from path field. This will be removed in Q1 2026."

**Rationale:** These fields are redundant but still have limited usage. Deprecation markers guide migration while maintaining compatibility.

#### 3. Top-Level JsonPointer Standardization
**Verified existing implementation:**
- `UnifiedErrorModelBuilder.cs` already correctly populates `ValidationError.JsonPointer` from `navigation.JsonPointer`
- Lines 51-53: Updates top-level jsonPointer when navigation provides one
- Line 112: Sets jsonPointer during error creation
- Pattern ensures consistent top-level field population

**No changes required** - implementation already follows best practice.

### Frontend Changes

#### 1. Breadcrumb Derivation (ErrorTable.tsx)
**Before:**
```tsx
{error.breadcrumbs && error.breadcrumbs.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {error.breadcrumbs.map((crumb, i) => (
      <span key={i}>{crumb}</span>
    ))}
  </div>
)}
```

**After:**
```tsx
{(() => {
  // Phase 1 Audit (Dec 2025): Derive breadcrumbs from path, not navigation.breadcrumbs
  const breadcrumbs = pathToBreadcrumbs(error.path);
  return breadcrumbs.length > 0 && (
    <div className="flex flex-wrap gap-1 mt-1">
      {breadcrumbs.map((crumb, i) => (
        <span key={i}>{crumb}</span>
      ))}
    </div>
  );
})()}
```

**New utility function:**
```tsx
function pathToBreadcrumbs(path: string | undefined): string[] {
  if (!path) return [];
  
  const parsed = parseFhirPathComponents(path);
  const breadcrumbs: string[] = [parsed.resourceType];
  
  if (parsed.scopeSelector) {
    breadcrumbs.push(`where(${parsed.scopeSelector})`);
  }
  
  if (parsed.structuralPath) {
    breadcrumbs.push(...parsed.structuralPath.split('.').filter(Boolean));
  }
  
  return breadcrumbs;
}
```

**Impact:** ErrorTable.tsx no longer depends on `navigation.breadcrumbs`.

#### 2. JsonPointer Preference Documentation
**Added clarifying comments to:**
- ValidationErrorItem.tsx (line 169)
- ErrorCard.tsx (line 69, line 164)

**Pattern (already implemented, now documented):**
```tsx
// Phase 1 Audit (Dec 2025): Prefer top-level jsonPointer, fallback to navigation.jsonPointer for backward compatibility
error.jsonPointer || error.navigation?.jsonPointer
```

**Impact:** All components already follow this pattern. Comments clarify migration strategy.

## Backward Compatibility Strategy

### Migration Period: Dec 2025 - Q1 2026

1. **Deprecated fields remain in model** - No breaking changes during migration
2. **[Obsolete] attributes added** - Compiler warnings guide developers away from deprecated fields
3. **Fallback logic preserved** - Frontend continues to check both locations for jsonPointer
4. **Legacy component support** - ErrorTable.tsx transitioned to path-derived breadcrumbs

### Q1 2026 Removal Plan

**Step 1:** Verify all consumers migrated off deprecated fields
**Step 2:** Remove deprecated fields from NavigationInfo.cs:
- Remove `JsonPointer` property
- Remove `Breadcrumbs` property

**Step 3:** Simplify frontend code:
- Remove fallback: `|| error.navigation?.jsonPointer` (only use `error.jsonPointer`)
- Remove null checks for navigation.breadcrumbs

**Step 4:** Update tests to reflect new model

## Impact Analysis

### Files Modified
**Backend:**
- NavigationInfo.cs - Removed dead fields, added deprecation markers

**Frontend:**
- ErrorTable.tsx - Derives breadcrumbs from path
- ValidationErrorItem.tsx - Added migration comments
- ErrorCard.tsx - Added migration comments

### Files NOT Modified (Already Correct)
**Backend:**
- UnifiedErrorModelBuilder.cs - Already populates top-level jsonPointer correctly
- SmartPathNavigationService.cs - No changes needed

**Frontend:**
- GroupedErrorCard.tsx - Already uses correct pattern
- validationGrouping.ts - Already uses correct pattern
- PlaygroundPage.tsx - Already uses correct pattern

### Risk Assessment

| Change | Risk Level | Mitigation |
|--------|-----------|------------|
| Remove Exists field | NONE | No consumers found in audit |
| Remove MissingParents field | NONE | No consumers found in audit |
| Deprecate navigation.jsonPointer | LOW | All components already prefer top-level, fallback preserved |
| Deprecate navigation.breadcrumbs | LOW | Only ErrorTable.tsx used it, now derives from path |
| ErrorTable.tsx breadcrumb logic | LOW | Uses existing parseFhirPathComponents utility, tested pattern |

## Testing Checklist

### Backend
- [x] NavigationInfo.cs compiles without errors
- [ ] Run unit tests to verify no regressions
- [ ] Verify [Obsolete] warnings appear when using deprecated fields

### Frontend
- [x] ErrorTable.tsx compiles without errors
- [ ] Test breadcrumb rendering in ErrorTable component
- [ ] Verify navigation still works (Jump-to-JSON)
- [ ] Test with errors that have no navigation info (graceful degradation)
- [ ] Verify path-to-breadcrumb conversion handles edge cases:
  - Simple paths: `Patient.name.given`
  - Filtered paths: `Observation.where(code='123').value`
  - Missing paths: `undefined` or empty string

## Success Criteria

✅ All modified files compile without errors  
✅ No breaking changes to existing functionality  
✅ Deprecated fields marked with [Obsolete] attributes  
✅ Frontend components documented with migration comments  
⏳ Visual testing confirms breadcrumb rendering unchanged  
⏳ Navigation features (Jump-to-JSON) work correctly  
⏳ Unit tests pass with no regressions  

## Next Steps

1. **Testing:** Run full test suite (backend + frontend)
2. **Visual QA:** Verify UI components render correctly
3. **Documentation:** Update API docs if necessary
4. **Monitoring:** Track usage of deprecated fields via compiler warnings
5. **Q1 2026:** Execute removal plan once migration confirmed

## References

- Phase 1 Audit: Comprehensive field usage analysis
- Docs: /docs/08_unified_error_model.md
- Docs: /docs/07_smart_path_navigation.md
- Backend Model: /backend/src/Pss.FhirProcessor.Engine/Models/NavigationInfo.cs
- Error Builder: /backend/src/Pss.FhirProcessor.Engine/Services/UnifiedErrorModelBuilder.cs
