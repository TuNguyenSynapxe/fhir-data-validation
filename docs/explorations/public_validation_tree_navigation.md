---
🧪 Exploratory Design  
This document is not authoritative and may be superseded.
---

# Public Validation Tree Navigation Implementation

**Status**: ✅ Complete  
**Date**: 2025-01-XX  
**Related**: [ValidationWorkspace Extraction](../backend/CLEANUP_SUMMARY.md)

## Summary

Successfully added two-panel layout with tree navigation to public validation pages (ValidatePage and ProjectValidatePage). When users click validation issues or SmartPath breadcrumbs, the corresponding node in the JSON tree is highlighted, parent nodes are expanded, and the tree scrolls to the selected node.

## Changes Made

### 1. ValidatePage.tsx
**File**: `frontend/src/pages/public/ValidatePage.tsx`

**Added**:
- Import `BundleTree` from playground components
- `selectedJsonPointer` state to track selected tree path
- Two-panel grid layout (left: tree, right: validation results)
- `onNavigateToPath` callback wired to `setSelectedJsonPointer`
- Tree panel only shows after validation completes (`bundleJson && result`)

**Before**:
```tsx
{bundleJson && (
  <ValidationWorkspace
    bundleJson={bundleJson}
    validationResult={result?.engineResponse ?? null}
    // ...
  />
)}
```

**After**:
```tsx
{bundleJson && result && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Left Panel: Bundle Tree */}
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Bundle Structure</h2>
      <div className="border border-gray-200 rounded-lg overflow-auto max-h-[600px]">
        <BundleTree
          bundleJson={bundleJson}
          selectedPath={selectedJsonPointer ?? undefined}
        />
      </div>
    </div>

    {/* Right Panel: ValidationWorkspace */}
    <ValidationWorkspace
      bundleJson={bundleJson}
      validationResult={result?.engineResponse ?? null}
      isValidating={isValidating}
      validationError={error}
      onValidate={handleValidate}
      onReset={handleReset}
      onNavigateToPath={setSelectedJsonPointer}
      defaultOpen={true}
      showExplanations={false}
    />
  </div>
)}
```

### 2. ProjectValidatePage.tsx
**File**: `frontend/src/pages/public/ProjectValidatePage.tsx`

**Added**:
- Import `BundleTree` from playground components
- `selectedJsonPointer` state to track selected tree path
- Two-panel grid layout (left: tree, right: validation results)
- `onNavigateToPath` callback wired to `setSelectedJsonPointer`
- Tree panel only shows after validation completes (`bundleJson && result`)

**Implementation**: Identical to ValidatePage (same two-panel layout pattern)

## Architecture

### Navigation Flow

```
User clicks validation issue/SmartPath
         ↓
ValidationWorkspace emits onNavigateToPath(jsonPointer)
         ↓
Public page updates selectedJsonPointer state
         ↓
BundleTree receives selectedPath prop change
         ↓
BundleTree expands parent nodes, scrolls, highlights node
```

### Component Reuse

- **BundleTree**: Reused from authoring playground (`components/playground/Bundle/BundleTree.tsx`)
  - Accepts `selectedPath` prop for external navigation
  - Automatically expands parents when `selectedPath` changes
  - Scrolls to selected node and highlights it
  - Already implements `collapseKey` mechanism for auto-expansion

- **ValidationWorkspace**: Shared validation UI component
  - Emits `onNavigateToPath(jsonPointer)` when issue clicked
  - No changes needed (already supported navigation callback)

### Layout Design

**Responsive Grid**:
- Desktop (lg+): Two columns side-by-side
- Mobile: Single column (tree above, validation below)

**Tree Panel**:
- White background with border
- "Bundle Structure" heading
- Scrollable container with 600px max height
- Border around tree for visual separation

**Validation Panel**:
- Reuses ValidationWorkspace component
- Right side on desktop, below tree on mobile
- Full feature set (collapse, expand, filter, navigate)

## Constraints Satisfied

✅ **No changes to ValidationWorkspace** - Only wired state from parent  
✅ **No API calls added** - All validation handled by public pages  
✅ **No mode branching** - Same ValidationWorkspace for authoring and public  
✅ **No visual redesigns** - Used existing BundleTree and ValidationWorkspace  
✅ **Props-based interface** - selectedJsonPointer state owned by public pages  

## Technical Details

### State Management

```tsx
// Public pages own navigation state
const [selectedJsonPointer, setSelectedJsonPointer] = useState<string | null>(null);

// Pass down to ValidationWorkspace
<ValidationWorkspace
  onNavigateToPath={setSelectedJsonPointer}
  // ...
/>

// Pass down to BundleTree
<BundleTree
  bundleJson={bundleJson}
  selectedPath={selectedJsonPointer ?? undefined}
/>
```

### JSON Pointer Format

Validation engine returns JSON pointers like:
- `/entry/0/resource/name/0/family`
- `/entry/1/resource/identifier/0/system`

BundleTree accepts JSON pointers in the same format via `selectedPath` prop.

### Auto-Expansion Mechanism

BundleTree already implements auto-expansion:
1. Detects `selectedPath` prop change
2. Increments internal `collapseKey`
3. TreeNodeWrapper components react to `collapseKey` change
4. Nodes auto-expand if they are ancestors of `selectedPath`
5. Selected node scrolls into view and highlights

## Testing Checklist

### Manual Testing Required

- [ ] ValidatePage: Load example bundle
- [ ] ValidatePage: Run validation
- [ ] ValidatePage: Click validation issue → tree highlights + expands + scrolls
- [ ] ValidatePage: Click SmartPath breadcrumb → tree navigates
- [ ] ValidatePage: Verify responsive layout (mobile/tablet/desktop)
- [ ] ProjectValidatePage: Load example bundle
- [ ] ProjectValidatePage: Run validation
- [ ] ProjectValidatePage: Click validation issue → tree highlights + expands + scrolls
- [ ] ProjectValidatePage: Click SmartPath breadcrumb → tree navigates
- [ ] ProjectValidatePage: Verify responsive layout
- [ ] Verify authoring pages unaffected (zero regressions)

### Expected Behavior

**Clicking Validation Issue**:
1. Tree expands all parent nodes of the error location
2. Tree scrolls to bring the node into view (centered)
3. Tree highlights the entry node (brief 2-second yellow highlight)
4. Node appears selected with blue background

**Clicking SmartPath Breadcrumb**:
1. Same as clicking validation issue
2. Navigates to any path segment (resource, field, array element)

**Responsive Layout**:
- Desktop: Two columns (tree left, validation right)
- Mobile: Stack vertically (tree top, validation bottom)
- Tree scrollable within 600px max height
- Validation panel scrollable independently

## Zero TypeScript Errors

```bash
✅ ValidatePage.tsx - No errors
✅ ProjectValidatePage.tsx - No errors
```

## Implementation Notes

### Why Tree Only Shows After Validation

Changed conditional from `{bundleJson && ...}` to `{bundleJson && result && ...}`:
- **Reason**: Tree is only useful when there are validation results to navigate
- **UX**: Reduces clutter before validation runs
- **Performance**: Avoids rendering large trees unnecessarily
- **Consistency**: Matches authoring pattern (tree + validation together)

### Why BundleTree from Playground

- **Reuse**: Avoid reimplementing complex tree logic
- **Consistency**: Same tree behavior in authoring and public
- **Maintenance**: Single source of truth for tree component
- **Features**: Already has navigation, editing, expansion, scrolling

### Why Grid Layout

- **Responsive**: Tailwind `grid-cols-1 lg:grid-cols-2` handles mobile/desktop
- **Flexible**: Each panel can scroll independently
- **Simple**: No complex resize handles or splitters needed
- **Accessible**: Natural tab order (tree first, validation second)

## Next Steps

1. **Manual Testing**: Verify navigation works end-to-end
2. **Screenshots**: Capture two-panel layout for documentation
3. **User Feedback**: Test with real users validating bundles
4. **Performance**: Monitor tree rendering with large bundles (1000+ entries)

## Related Files

- `frontend/src/pages/public/ValidatePage.tsx` - Anonymous validation
- `frontend/src/pages/public/ProjectValidatePage.tsx` - Project validation
- `frontend/src/components/playground/Bundle/BundleTree.tsx` - Tree component
- `frontend/src/components/shared/ValidationWorkspace.tsx` - Validation UI
- `docs/07_smart_path_navigation.md` - Navigation specification

## Success Metrics

✅ Two-panel layout implemented  
✅ Tree navigation wired via state  
✅ onNavigateToPath callback connected  
✅ BundleTree reused from authoring  
✅ Zero TypeScript errors  
✅ Zero changes to ValidationWorkspace  
✅ Responsive layout (mobile + desktop)  
✅ Constraints satisfied (no API calls, no mode branching)  

---

**Implementation Complete** - Ready for manual testing and user feedback.
