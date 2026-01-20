# Slice-Scoped State Isolation Implementation

## Status: ✅ COMPLETE (Commit c4b345b)

## Overview
Fixed critical state isolation bugs where slice nodes shared UI state with parent elements. Each slice now has independent expand/collapse state and proper identity.

---

## Problem Statement

### ❌ Before (Broken)

**Issue 1: Shared Expand State**
```
User expands "Patient.communication::slice::systolic"
Bug: Parent element "Patient.communication" also expands
Root cause: expandedPaths keyed by element.path, not node.id
```

**Issue 2: Cascading Collapse**
```
User collapses parent "Patient.communication"
Bug: All slices (systolic, diastolic) also collapse
Root cause: All nodes with same path share one expand state
```

**Issue 3: Ambiguous Node Identity**
```typescript
// Both parent and slice use same key
expandedPaths.has('Patient.communication') // ???
// Which one? Element or slice?
```

### ✅ After (Fixed)

**Each node has unique identity**:
- Element: `Patient.communication`
- Slice systolic: `Patient.communication::slice::systolic`
- Slice diastolic: `Patient.communication::slice::diastolic`
- Slice child: `Patient.communication::slice::systolic::child::valueQuantity`

**Independent UI state**:
- Expanding a slice does NOT expand parent
- Collapsing parent does NOT collapse slices
- Each node remembered separately

---

## Implementation

### Node ID Format (Already Implemented in EPIC 4)

From `treeBuilder.ts`:
```typescript
// Element nodes
node.id = element.path; // e.g., "Patient.communication"

// Slice nodes
node.id = `${element.path}::slice::${sliceName}`; 
// e.g., "Patient.communication::slice::systolic"

// Slice child nodes
node.id = `${sliceParent.id}::child::${sourceNode.name}`;
// e.g., "Patient.communication::slice::systolic::child::valueQuantity"
```

### Store Changes

**File**: [`useSdBuilderStore.ts`](../frontend/src/stores/useSdBuilderStore.ts)

#### 1. Renamed State Property

```typescript
// BEFORE ❌
expandedPaths: Set<string>; // Keyed by element.path

// AFTER ✅
expandedNodes: Set<string>; // Keyed by node.id (includes slices)
```

#### 2. Updated toggleExpand Signature

```typescript
// BEFORE ❌
toggleExpand: (path: string) => void;

// AFTER ✅
toggleExpand: (nodeId: string) => void; // Accepts unique node ID
```

**Implementation**:
```typescript
toggleExpand: (nodeId: string) => {
  set((state) => {
    const newExpanded = new Set(state.expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId); // Toggle by node ID
    } else {
      newExpanded.add(nodeId);
    }
    return { expandedNodes: newExpanded };
  });
},
```

#### 3. Fixed expandAll to Include Slices

```typescript
// BEFORE ❌
expandAll: () => {
  const { design } = get();
  if (!design) return;
  
  const allPaths = new Set(design.elements.map(e => e.path));
  // Only expanded element paths, missed slice nodes!
  set({ expandedPaths: allPaths });
},

// AFTER ✅
expandAll: () => {
  const { design } = get();
  if (!design) return;

  // Build tree and traverse to collect ALL node IDs
  const tree = buildTree(design.elements);
  const allNodeIds = new Set<string>();
  
  const collectNodeIds = (nodes: any[]) => {
    nodes.forEach(node => {
      allNodeIds.add(node.id); // Includes slices + slice children
      if (node.children.length > 0) {
        collectNodeIds(node.children);
      }
    });
  };
  
  collectNodeIds(tree);
  set({ expandedNodes: allNodeIds }); // Expands everything
},
```

#### 4. Updated collapseAll

```typescript
// BEFORE ❌
collapseAll: () => {
  set({ expandedPaths: new Set<string>() });
},

// AFTER ✅
collapseAll: () => {
  set({ expandedNodes: new Set<string>() });
},
```

### Component Changes

#### SdTreeView Component

**File**: [`SdTreeView.tsx`](../frontend/src/components/SdBuilder/SdTreeView.tsx)

```typescript
// BEFORE ❌
const expandedPaths = useSdBuilderStore((state) => state.expandedPaths);

<TreeNode
  isExpanded={expandedPaths.has(node.path)} // Wrong: uses path
  ...
/>

// AFTER ✅
const expandedNodes = useSdBuilderStore((state) => state.expandedNodes);

<TreeNode
  isExpanded={expandedNodes.has(node.id)} // Correct: uses unique ID
  ...
/>
```

#### TreeNode Component

**File**: [`TreeNode.tsx`](../frontend/src/components/SdBuilder/TreeNode.tsx)

**Props Interface**:
```typescript
// BEFORE ❌
interface TreeNodeProps {
  onToggleExpand: (path: string) => void;
  expandedPaths: Set<string>;
}

// AFTER ✅
interface TreeNodeProps {
  onToggleExpand: (nodeId: string) => void; // Use node ID
  expandedNodes: Set<string>; // Node IDs (includes slices)
}
```

**Chevron Click Handler**:
```typescript
// BEFORE ❌
const handleChevronClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (node.isExpandable) {
    onToggleExpand(node.path); // Wrong: path not unique for slices
  }
};

// AFTER ✅
const handleChevronClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (node.isExpandable) {
    onToggleExpand(node.id); // Correct: unique ID
  }
};
```

**Recursive Children Rendering**:
```typescript
// BEFORE ❌
{node.children.map(child => (
  <TreeNode
    key={child.id}
    node={child}
    isExpanded={expandedPaths.has(child.path)} // Wrong
    ...
  />
))}

// AFTER ✅
{node.children.map(child => (
  <TreeNode
    key={child.id}
    node={child}
    isExpanded={expandedNodes.has(child.id)} // Correct
    ...
  />
))}
```

---

## Behavior Examples

### Example 1: Independent Slice Expansion

**Tree Structure**:
```
Patient.communication [0..*] (collapsed)
```

**User Action**: Click chevron on slice node "systolic"

**Before ❌**:
```
Patient.communication [0..*] (expanded) ← Bug: parent also expanded
 ├─ systolic (expanded)
 │  └─ valueQuantity
 └─ diastolic (collapsed)
```

**After ✅**:
```
Patient.communication [0..*] (collapsed) ← Correct: parent unchanged
 ├─ systolic (expanded)
 │  └─ valueQuantity
 └─ diastolic (collapsed)
```

### Example 2: Parent Collapse Doesn't Affect Slices

**Tree Structure**:
```
Patient.communication [0..*] (expanded)
 ├─ systolic (expanded)
 │  └─ valueQuantity
 └─ diastolic (expanded)
     └─ valueQuantity
```

**User Action**: Click chevron on parent element

**Before ❌**:
```
Patient.communication [0..*] (collapsed)
 ├─ systolic (collapsed) ← Bug: slices also collapsed
 └─ diastolic (collapsed) ← Bug: slices also collapsed
```

**After ✅**:
```
Patient.communication [0..*] (collapsed) ← Parent collapsed
 ├─ systolic (expanded) ← Correct: slice state preserved
 │  └─ valueQuantity
 └─ diastolic (expanded) ← Correct: slice state preserved
     └─ valueQuantity
```

### Example 3: expandAll Includes Slices

**User Action**: Click "Expand All" button

**Before ❌**:
```typescript
// Only element paths expanded
expandedPaths = Set([
  'Patient',
  'Patient.communication',
  'Patient.name',
  // Missing: 'Patient.communication::slice::systolic'
  // Missing: 'Patient.communication::slice::diastolic'
])

// Result: Slices remain collapsed ❌
```

**After ✅**:
```typescript
// All node IDs collected via tree traversal
expandedNodes = Set([
  'Patient',
  'Patient.communication',
  'Patient.communication::slice::systolic', // ✅ Included
  'Patient.communication::slice::systolic::child::valueQuantity', // ✅ Included
  'Patient.communication::slice::diastolic', // ✅ Included
  'Patient.communication::slice::diastolic::child::valueQuantity', // ✅ Included
  'Patient.name',
])

// Result: Everything expands ✅
```

---

## Technical Details

### Node Identity Requirements

| Node Type | ID Format | Example |
|-----------|-----------|---------|
| Element | `{path}` | `Patient.communication` |
| Slice | `{path}::slice::{sliceName}` | `Patient.communication::slice::systolic` |
| Slice Other | `{path}::slice::other` | `Patient.communication::slice::other` |
| Slice Child | `{sliceId}::child::{name}` | `Patient.communication::slice::systolic::child::valueQuantity` |

### State Isolation Guarantees

✅ **Guaranteed**:
- Each slice has unique node ID
- Expand/collapse state keyed by node ID
- No shared state between parent and slices
- Slice children inherit slice context, not parent

❌ **Prevented**:
- Path-based keying (ambiguous for slices)
- Shared expand state via common path
- Parent mutations from slice UI
- Cascading expand/collapse bugs

### Data Flow

```
User clicks chevron on slice node
  ↓
handleChevronClick(e)
  ↓
onToggleExpand(node.id) // "Patient.communication::slice::systolic"
  ↓
Store.toggleExpand(nodeId)
  ↓
expandedNodes.add("Patient.communication::slice::systolic")
  ↓
Re-render: isExpanded={expandedNodes.has(child.id)}
  ↓
Slice expands, parent unchanged ✅
```

---

## Testing Validation

### Manual Test Cases

**Test 1: Independent Slice Expansion**
1. Load session with sliced element (e.g., Patient.communication with systolic/diastolic slices)
2. Ensure parent is collapsed
3. Click chevron on "systolic" slice
4. ✅ Verify: Slice expands, parent remains collapsed
5. ✅ Verify: Other slice (diastolic) remains collapsed

**Test 2: Parent Collapse Preserves Slice State**
1. Expand parent element
2. Expand multiple slices under it
3. Collapse parent element
4. Re-expand parent element
5. ✅ Verify: Slices retain their individual expand states

**Test 3: expandAll Works**
1. Collapse all nodes
2. Click "Expand All" button
3. ✅ Verify: All elements expanded
4. ✅ Verify: All slices expanded
5. ✅ Verify: All slice children visible

**Test 4: collapseAll Works**
1. Expand all nodes (including slices)
2. Click "Collapse All" button
3. ✅ Verify: All nodes collapsed (elements + slices)

### Automated Test Scenarios (Future)

```typescript
describe('Slice-scoped expand/collapse', () => {
  it('expanding slice does not expand parent', () => {
    const store = useSdBuilderStore.getState();
    
    // Parent collapsed, slice collapsed
    expect(store.expandedNodes.has('Patient.communication')).toBe(false);
    expect(store.expandedNodes.has('Patient.communication::slice::systolic')).toBe(false);
    
    // Expand slice
    store.toggleExpand('Patient.communication::slice::systolic');
    
    // Slice expanded, parent still collapsed
    expect(store.expandedNodes.has('Patient.communication::slice::systolic')).toBe(true);
    expect(store.expandedNodes.has('Patient.communication')).toBe(false);
  });
  
  it('collapsing parent does not collapse slices', () => {
    const store = useSdBuilderStore.getState();
    
    // Both expanded
    store.toggleExpand('Patient.communication');
    store.toggleExpand('Patient.communication::slice::systolic');
    
    // Collapse parent
    store.toggleExpand('Patient.communication');
    
    // Parent collapsed, slice still expanded
    expect(store.expandedNodes.has('Patient.communication')).toBe(false);
    expect(store.expandedNodes.has('Patient.communication::slice::systolic')).toBe(true);
  });
  
  it('expandAll includes all node types', () => {
    const store = useSdBuilderStore.getState();
    store.expandAll();
    
    // Check all node types present
    expect(store.expandedNodes.has('Patient.communication')).toBe(true);
    expect(store.expandedNodes.has('Patient.communication::slice::systolic')).toBe(true);
    expect(store.expandedNodes.has('Patient.communication::slice::diastolic')).toBe(true);
    expect(store.expandedNodes.has('Patient.communication::slice::systolic::child::valueQuantity')).toBe(true);
  });
});
```

---

## Related Fixes Needed (NOT IN THIS COMMIT)

### Cardinality Override Isolation (Next PR)

**Problem**: Editing slice child cardinality may write to wrong element

**Root Cause**: CardinalityPresets component needs slice-aware logic

**Solution**:
```typescript
// In CardinalityPresets or cardinality editing logic
const handleCardinalityChange = (min: number, max: string) => {
  if (node.isSliceChild && node.sliceContext) {
    // Slice child: update slice design, not base element
    applyCommand({
      commandType: 'SetSliceChildCardinality',
      path: node.parent.parentPath,
      sliceName: node.sliceContext,
      childPath: node.path,
      cardinality: { min, max },
    });
  } else if (node.kind === 'slice') {
    // Slice node: update slice override
    applyCommand({
      commandType: 'SetSliceConstraints',
      path: node.parentPath,
      sliceName: node.sliceName,
      overrideCardinality: { min, max },
    });
  } else {
    // Regular element: update element override
    applyCommand({
      commandType: 'SetCardinalityOverride',
      elementPath: node.path,
      cardinality: { min, max },
    });
  }
};
```

**Status**: ⚠️ Pending separate PR

---

## Compliance Checklist

| Requirement | Status |
|------------|--------|
| No parent mutation from slice UI | ✅ Yes |
| Each slice has unique identity | ✅ Yes (`node.id` with `::slice::` marker) |
| Expand state scoped by node ID | ✅ Yes (`expandedNodes` keyed by `node.id`) |
| No shared object references | ✅ Yes (each node has own expand state) |
| Tree is single source of truth | ✅ Yes (node IDs generated in tree builder) |
| No nested slices | ✅ Yes (maintained from EPIC 4) |
| Deterministic node identity | ✅ Yes (ID format explicit and stable) |

---

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `useSdBuilderStore.ts` | Renamed `expandedPaths` → `expandedNodes`, updated `toggleExpand`, `expandAll`, `collapseAll` | ~40 |
| `SdTreeView.tsx` | Use `expandedNodes` state, check `node.id` | ~5 |
| `TreeNode.tsx` | Updated props, use `node.id` in chevron handler and children | ~10 |

**Total**: 3 files, ~55 lines modified

---

## Commits

**Commit c4b345b**: fix: slice-scoped state isolation for expand/collapse UI

**Previous Related Commits**:
- `2fa347f` - feat: FHIR slicing matching rules (closed/open/openAtEnd)
- `3313ee7` - feat: EPIC 4 strict FHIR slicing semantics
- `4ce48f0` - feat: EPIC 3.5 slice-aware selection model

---

## Next Steps

1. **Cardinality override isolation** (separate PR)
   - Ensure slice cardinality edits don't mutate parent
   - Add slice-aware logic to CardinalityPresets component

2. **Backend unit tests** (from EPIC 3 checklist)
   - Test SetSliceConstraints command
   - Validate cardinality bounds checking

3. **Frontend vitest tests**
   - Test expand/collapse isolation
   - Test expandAll includes slices
   - Test slice cardinality editing

4. **Export mapping** (from EPIC 3 checklist)
   - Map slices to StructureDefinition differential
   - Include slice IDs in element paths

---

**Status**: ✅ Complete  
**Date**: 2026-01-20  
**Impact**: High - fixes critical UX bugs  
**Risk**: Low - no breaking changes, improves existing behavior
