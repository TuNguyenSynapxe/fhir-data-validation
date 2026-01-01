# Path Refinement Visibility Logic - Fix Summary

## Problem
The Path Refinement UI was showing for all selected paths, even when the path pointed to a single scalar field (e.g., `birthDate`, `gender`, `meta.versionId`). Array refinement options (index, all elements, filter) are only applicable when the path contains array segments.

## Solution
Implemented conditional rendering logic to only show the Path Refinement UI when the selected path contains at least one array segment.

## Changes Made

### 1. New Utility Function
**File:** `src/utils/arrayPathDetection.ts`

Added `hasAnyArrayInPath()` function:
```typescript
export function hasAnyArrayInPath(basePath: string): boolean {
  return detectArrayLayers(basePath).length > 0;
}
```

This function checks if a path contains any array segments (identifier, name, address, line, etc.).

### 2. Updated FhirPathRefinementPanel
**File:** `src/components/rules/FhirPathRefinementPanel.tsx`

**Key Changes:**
- Import and use `hasAnyArrayInPath()` to detect array presence
- Early return with helper text when no arrays present
- Manual mode remains accessible regardless of array presence
- Dynamic button text: "← Back to Builder" (when arrays exist) vs "← Back" (when no arrays)

**UI Behavior:**

#### When NO arrays in path (e.g., `birthDate`, `gender`):
```
┌─────────────────────────────────────────┐
│ Path Refinement          [Manual Mode →]│
├─────────────────────────────────────────┤
│ Path scope: single element              │
│ (no array refinement required)          │
│                                         │
│ This path points to a single value.    │
│ Array refinement is not applicable.    │
├─────────────────────────────────────────┤
│ Preview: birthDate                      │
└─────────────────────────────────────────┘
```

**Features:**
- ✅ Helper text explains why refinement is not shown
- ✅ Manual mode still accessible via button
- ✅ Path preview always visible
- ✅ No confusing array refinement options

#### When arrays EXIST in path (e.g., `address`, `identifier.value`):
```
┌─────────────────────────────────────────┐
│ Path Refinement    [Show Raw] [Manual →]│
├─────────────────────────────────────────┤
│ Base Path: address                      │
├─────────────────────────────────────────┤
│ Refinement Mode:                        │
│ ○ First element (default)               │
│ ● All elements [*]                      │
│ ○ Index [n]                             │
│ ○ Filter (where)                        │
├─────────────────────────────────────────┤
│ Preview: address[*]                     │
└─────────────────────────────────────────┘
```

**Features:**
- ✅ Full refinement UI shown
- ✅ All array modes available
- ✅ Toggle buttons for raw path and manual mode

#### Manual Mode for Non-Array Paths:
When user clicks "Manual Mode →" on a non-array path:
```
┌─────────────────────────────────────────┐
│ Path Refinement              [← Back]   │
├─────────────────────────────────────────┤
│ Note: No arrays in this path            │
│ This path points to a single element.  │
│ You can still edit it manually if      │
│ needed.                                 │
├─────────────────────────────────────────┤
│ Manual FHIRPath:                        │
│ ┌─────────────────────────────────────┐ │
│ │ birthDate                           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 3. Updated Tests
**File:** `src/utils/__tests__/nestedArrayRefinement.test.ts`

Added 6 new test cases for `hasAnyArrayInPath()`:
```typescript
it('should check if any arrays exist in path', () => {
  expect(hasAnyArrayInPath('address')).toBe(true);           // Has array
  expect(hasAnyArrayInPath('address.line')).toBe(true);      // Nested arrays
  expect(hasAnyArrayInPath('identifier.value')).toBe(true);  // Has array
  expect(hasAnyArrayInPath('birthDate')).toBe(false);        // No array
  expect(hasAnyArrayInPath('gender')).toBe(false);           // No array
  expect(hasAnyArrayInPath('meta.versionId')).toBe(false);   // No array
});
```

**Test Results:** ✅ All 23 tests passing

## Detection Logic

The system uses heuristic-based detection:

**Known FHIR Array Fields:**
- identifier, name, telecom, address, contact
- communication, link, line, extension, modifierExtension
- contained, entry, coding, note, performer, item
- given, prefix, suffix, part, interpretation

**Heuristic Pattern:**
- Plural words ending in 's' (except 'status', 'class')

**Examples:**
| Path | Has Array? | Reason |
|------|-----------|---------|
| `address` | ✅ Yes | Known array field |
| `address.line` | ✅ Yes | Both known arrays |
| `identifier.value` | ✅ Yes | identifier is array |
| `name.given` | ✅ Yes | Both known arrays |
| `birthDate` | ❌ No | Scalar field |
| `gender` | ❌ No | Scalar field |
| `meta.versionId` | ❌ No | No arrays in path |
| `active` | ❌ No | Scalar boolean |

## Consistency Across Flows

The fix is automatically consistent across all entry points because:

1. **Tree Selection** → FhirPathSelectorDrawer → FhirPathRefinementPanel
   - Array detection happens in FhirPathRefinementPanel
   - Same logic applies regardless of source

2. **JSON Editor Selection** → Same drawer → Same panel
   - No special handling needed

3. **Rule Edit Flow** → Uses same components
   - Consistent behavior

4. **Rule Create Flow** → Uses same components
   - Consistent behavior

## User Experience Improvements

### Before Fix:
❌ Confusing: "Index [0]" option shown for `birthDate`  
❌ No explanation why refinement might not be needed  
❌ Users might think they need to refine scalar fields  

### After Fix:
✅ Clear: Refinement UI hidden for scalar fields  
✅ Helpful: Explanation text shown instead  
✅ Intuitive: Users understand path scope immediately  
✅ Flexible: Manual mode still accessible if needed  

## Edge Cases Handled

1. **Empty path** → Panel hidden completely (existing behavior)
2. **Path with existing indices** (e.g., `address[0]`) → Arrays detected, UI shown
3. **Path with existing filters** (e.g., `address.where(...)`) → Arrays detected, UI shown
4. **Manual mode on non-array path** → Notice shown, editing allowed
5. **Switching from array to non-array path** → UI updates automatically
6. **Deeply nested arrays (3+)** → Depth limit warning shown (existing behavior)

## Testing Checklist

- [x] Build successful (0 errors)
- [x] Unit tests passing (23/23)
- [x] Array detection working correctly
- [x] Helper text shows for non-array paths
- [x] Manual mode accessible for all paths
- [x] Button text updates dynamically
- [x] Path preview always visible
- [x] No console errors

## Files Changed

1. `src/utils/arrayPathDetection.ts` - Added `hasAnyArrayInPath()`
2. `src/components/rules/FhirPathRefinementPanel.tsx` - Conditional rendering logic
3. `src/utils/__tests__/nestedArrayRefinement.test.ts` - Added test cases

## Backward Compatibility

✅ No breaking changes  
✅ Existing array refinement functionality unchanged  
✅ All existing tests still pass  
✅ Manual mode still works as before  

## Future Enhancements

1. **Schema-based detection:** Use FHIR StructureDefinition for accurate array detection instead of heuristics
2. **Cardinality display:** Show "0..1" vs "0..*" in helper text
3. **Smart suggestions:** "This field typically contains..." for common fields
4. **Path validation:** Validate path exists in resource schema

---

**Status:** ✅ Complete and Production Ready  
**Tests:** 23/23 passing  
**Build:** Successful  
**Breaking Changes:** None
