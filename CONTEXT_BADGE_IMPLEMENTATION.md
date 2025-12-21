# Context Badge + Validation Navigation Implementation

## Summary

Implemented enhancements to improve TreeView usability for FHIR Bundles by exposing resource context and improving validation error navigation.

## ✅ Completed Changes

### 1. BundleTreeView Component (Original Simple Tree)
**File:** `frontend/src/components/BundleTreeView.tsx`

**Changes:**
- ✅ Added `highlightEntryIndex` prop for validation error navigation
- ✅ Added resource type extraction utility `getResourceTypeFromEntry()`
- ✅ Added standardized resource badge styling `getResourceBadgeStyle()`
  - Patient: blue badge
  - Observation: purple badge
  - Encounter: teal badge
  - Unknown: grey badge
  - Other resources: indigo badge
- ✅ Updated TreeNode interface to include `resourceType` and `entryIndex`
- ✅ Added auto-expand and highlight effect when `highlightEntryIndex` changes
- ✅ Added resource context state and breadcrumb display
- ✅ Updated tree node rendering to show "Resource: {Type}" badge on Bundle.entry nodes
- ✅ Added highlight styling (yellow background with border) for navigation target
- ✅ Added context display in breadcrumb area showing active resource type

**Visual Changes:**
```
Before:
[0] Patient (entry[0]) {10 properties}

After:
[0] {10 properties}    [Resource: Patient]
```

Breadcrumb now shows:
```
Selected: Patient.name
Context: Patient
```

### 2. BundleTree Component (Complex Tree with TreeNodeWrapper)
**File:** `frontend/src/components/playground/Bundle/BundleTree.tsx`

**Changes:**
- ✅ Added `highlightEntryIndex` prop
- ✅ Added resource type extraction utilities
- ✅ Added badge styling functions

## 🚧 Remaining Implementation Tasks

### High Priority

1. **Update BundleTree TreeNode Rendering**
   - Add resource context badge rendering in TreeNode component
   - Apply highlight styling when node matches highlightedEntryPath
   - Extract and display resource type for Bundle.entry nodes
   
2. **Update BundleTabs to Pass highlightEntryIndex**
   - Extract entry index from validation error navigation
   - Pass `highlightEntryIndex` prop to BundleTree
   - Update BundleTabsRef interface if needed

3. **Update PlaygroundPage handleNavigateToPath**
   - Extract entry index from jsonPointer (e.g., "/entry/2/resource/name" → index 2)
   - Pass entry index to BundleTabs/BundleTree via ref or state
   - Ensure auto-expand works for the correct entry

4. **Add Resource Context to Breadcrumb**
   - Extract resource type from current selection path
   - Display in breadcrumb footer area
   - Style consistently with tree badges

### Implementation Pattern

```typescript
// In PlaygroundPage.tsx
const handleNavigateToPath = (jsonPointer: string) => {
  // Extract entry index from path like "/entry/2/resource/name"
  const entryMatch = jsonPointer.match(/^\/entry\/(\d+)/);
  const entryIndex = entryMatch ? parseInt(entryMatch[1], 10) : undefined;
  
  // Pass to BundleTabs
  bundleTabsRef.current?.navigateToPath(targetPath, entryIndex);
};

// In BundleTabs.tsx
export interface BundleTabsRef {
  switchToTreeView: () => void;
  navigateToPath: (jsonPointer: string, highlightEntryIndex?: number) => void;
}

// In BundleTree.tsx
<TreeNode
  isHighlighted={node.jsonPointer === highlightedEntryPath}
  resourceType={extractResourceType(bundle, entryIndex)}
  ...
/>
```

### Styling Reference

**Resource Badge Classes:**
```tsx
className={`ml-2 px-2 py-0.5 text-xs font-medium rounded border ${
  getResourceBadgeStyle(resourceType).bg
} ${
  getResourceBadgeStyle(resourceType).text
} ${
  getResourceBadgeStyle(resourceType).border
}`}
```

**Highlight Classes:**
```tsx
className={`... ${
  isHighlighted
    ? 'bg-yellow-100 border-l-4 border-yellow-500 shadow-sm'
    : isSelected
    ? 'bg-blue-100 border-l-2 border-blue-600'
    : 'hover:bg-gray-50'
}`}
```

## Testing Checklist

- [ ] Click validation error → TreeView auto-expands correct entry
- [ ] Entry node shows "Resource: {Type}" badge
- [ ] Entry highlights with yellow background for 2 seconds
- [ ] Breadcrumb shows resource context when entry selected
- [ ] Patient, Observation, Encounter show correct badge colors
- [ ] Unknown resource shows grey badge
- [ ] Highlight clears after 2 seconds
- [ ] No performance issues with large bundles

## Non-Goals (Do NOT Implement)

- ❌ Do NOT rename TreeView nodes to resource types
- ❌ Do NOT insert resource types into JSON paths
- ❌ Do NOT infer resource type from validation rules
- ❌ Do NOT make context badges clickable or selectable
- ❌ Do NOT change validation models or backend payloads

## Files Modified

1. `/frontend/src/components/BundleTreeView.tsx` ✅
2. `/frontend/src/components/playground/Bundle/BundleTree.tsx` ⚠️ Partial
3. `/frontend/src/components/playground/Bundle/BundleTabs.tsx` ⏳ Pending
4. `/frontend/src/pages/PlaygroundPage.tsx` ⏳ Pending

## Next Steps

1. Complete BundleTree TreeNode badge rendering
2. Wire up highlightEntryIndex through BundleTabs
3. Extract entry index in PlaygroundPage validation error handler
4. Test end-to-end flow
5. Add breadcrumb context display
