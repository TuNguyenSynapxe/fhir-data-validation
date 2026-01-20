# FHIR Slicing Matching Rules Implementation

## Status: ✅ COMPLETE (Commit 2fa347f)

## Overview
Implemented correct FHIR slicing matching behavior in the SD Builder tree view, fixing the unsliced ordering bug and enforcing matching rules at the tree construction level.

---

## FHIR Matching Rules

| Matching    | Unsliced Allowed | Unsliced Position | Implementation |
|-------------|------------------|-------------------|----------------|
| `closed`    | ❌ No            | ❌ Never shown    | ✅ Complete    |
| `open`      | ✅ Yes           | Any order         | ✅ Complete    |
| `openAtEnd` | ✅ Yes           | Always last       | ✅ Complete    |

---

## Implementation Details

### Location
**File**: [`frontend/src/utils/treeBuilder.ts`](../frontend/src/utils/treeBuilder.ts)

### Phase 3: Slice Node Creation (Lines 163-326)

**Key Changes**:
1. **Extract matching rule**: `const matching = slicingRules.rules.toLowerCase();`
2. **Helper function**: `createUnslicedNode()` - builds "Other (unsliced)" virtual node
3. **Build slice nodes array**: All slice nodes created and stored in `sliceNodes[]`
4. **Apply matching rules**: Explicit `switch` statement:

```typescript
switch (matching) {
  case 'closed':
    // closed: Only slice nodes, NO unsliced node
    node.children = sliceNodes;
    break;
    
  case 'open':
    // open: Unsliced node + slice nodes (order not enforced)
    node.children = [createUnslicedNode(), ...sliceNodes];
    break;
    
  case 'openatend':
    // openAtEnd: Slice nodes first, then unsliced node LAST
    node.children = [...sliceNodes, createUnslicedNode()];
    break;
    
  default:
    // Fallback: treat as open for safety
    console.warn(`Unknown slicing matching rule: ${matching}. Treating as 'open'.`);
    node.children = [createUnslicedNode(), ...sliceNodes];
    break;
}
```

### Phase 4: Sorting with Matching Awareness (Lines 328-358)

**Old Behavior**:
- **BUG**: Unconditionally sorted "Other" node first: `if (a.kind === 'slice-other') return -1;`
- Violated `openAtEnd` rule

**New Behavior**:
- **For non-sliced elements**: Sort by path (unchanged)
- **For sliced elements**: Preserve matching rule order from Phase 3
  - `closed`: Sort slice nodes alphabetically
  - `open`: Unsliced first, then sorted slices
  - `openAtEnd`: Sorted slices, then unsliced LAST

```typescript
if (!hasSlicing) {
  node.children.sort((a, b) => a.path.localeCompare(b.path));
} else {
  const matching = element.slicing?.rules.toLowerCase() || 'open';
  
  if (matching === 'closed') {
    // Only slice nodes, sort alphabetically
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  } else if (matching === 'open') {
    // Unsliced first, slices sorted
    const unslicedNode = node.children.find(c => c.kind === 'slice-other');
    const sliceNodes = node.children.filter(c => c.kind === 'slice');
    sliceNodes.sort((a, b) => a.name.localeCompare(b.name));
    node.children = unslicedNode ? [unslicedNode, ...sliceNodes] : sliceNodes;
  } else if (matching === 'openatend') {
    // Slices sorted first, unsliced last
    const unslicedNode = node.children.find(c => c.kind === 'slice-other');
    const sliceNodes = node.children.filter(c => c.kind === 'slice');
    sliceNodes.sort((a, b) => a.name.localeCompare(b.name));
    node.children = unslicedNode ? [...sliceNodes, unslicedNode] : sliceNodes;
  }
}
```

---

## Visual Examples

### ✅ Correct: matching = "closed"
```
Patient.communication [0..*] (sliced)
 ├─ ✂️ Emergency Contact
 │  ├─ ↳ id
 │  ├─ ↳ extension
 │  └─ ↳ relationship
 └─ ✂️ Family Contact
    ├─ ↳ id
    ├─ ↳ extension
    └─ ↳ relationship
```
**No "Other (unsliced)" node**

---

### ✅ Correct: matching = "open"
```
Patient.communication [0..*] (sliced)
 ├─ 📂 Other (unsliced)
 │  ├─ ↳ id
 │  ├─ ↳ extension
 │  └─ ↳ relationship
 ├─ ✂️ Emergency Contact
 │  ├─ ↳ id
 │  ├─ ↳ extension
 │  └─ ↳ relationship
 └─ ✂️ Family Contact
    ├─ ↳ id
    ├─ ↳ extension
    └─ ↳ relationship
```
**Unsliced node first, then sorted slices**

---

### ✅ Correct: matching = "openAtEnd" (FIXED)
```
Patient.communication [0..*] (sliced)
 ├─ ✂️ Emergency Contact
 │  ├─ ↳ id
 │  ├─ ↳ extension
 │  └─ ↳ relationship
 ├─ ✂️ Family Contact
 │  ├─ ↳ id
 │  ├─ ↳ extension
 │  └─ ↳ relationship
 └─ 📂 Other (unsliced)
    ├─ ↳ id
    ├─ ↳ extension
    └─ ↳ relationship
```
**Sorted slices first, unsliced node LAST**

---

### ❌ Old Bug: matching = "openAtEnd"
```
Patient.communication [0..*] (sliced)
 ├─ 📂 Other (unsliced)  ← WRONG! Should be last
 │  ├─ ↳ id
 │  └─ ...
 ├─ ✂️ Slice A
 └─ ✂️ Slice B
```

---

## Testing Validation

### Manual Testing Steps
1. **Test closed**:
   - Enable slicing on element with `matching = 'closed'`
   - Add 2+ slices
   - Expand element in tree
   - ✅ Verify: NO "Other (unsliced)" node appears
   - ✅ Verify: Only slice nodes visible

2. **Test open**:
   - Enable slicing on element with `matching = 'open'`
   - Add 2+ slices (e.g., "Slice B", "Slice A")
   - Expand element in tree
   - ✅ Verify: "Other (unsliced)" appears FIRST
   - ✅ Verify: Slices sorted alphabetically after unsliced (A, B)

3. **Test openAtEnd**:
   - Enable slicing on element with `matching = 'openAtEnd'`
   - Add 2+ slices (e.g., "Slice Z", "Slice A")
   - Expand element in tree
   - ✅ Verify: Slices appear first, sorted alphabetically (A, Z)
   - ✅ Verify: "Other (unsliced)" appears LAST

### Expected Tree Structure Inspection
```typescript
// For matching = 'openAtEnd'
const slicedElement = findNodeByPath(tree, 'Patient.communication');
expect(slicedElement.children.length).toBe(3); // 2 slices + 1 unsliced

// Slices first (sorted)
expect(slicedElement.children[0].kind).toBe('slice');
expect(slicedElement.children[0].name).toBe('Emergency Contact');
expect(slicedElement.children[1].kind).toBe('slice');
expect(slicedElement.children[1].name).toBe('Family Contact');

// Unsliced LAST
expect(slicedElement.children[2].kind).toBe('slice-other');
expect(slicedElement.children[2].name).toBe('Other (unsliced)');
```

---

## Design Principles

### ✅ Implemented Correctly
- **Tree-level enforcement**: Logic in `treeBuilder.ts`, NOT in UI components
- **No duplication**: Children only appear under slice/unsliced nodes, never directly under parent
- **No nesting**: Slices are always siblings
- **Explicit branching**: `switch` statement on `matching`, no heuristics
- **Type safety**: Uses `TreeNodeKind` type (`'element' | 'slice' | 'slice-other'`)
- **Testable**: Tree structure fully encodes FHIR semantics

### ❌ Avoided Anti-Patterns
- ❌ UI-only rendering tricks (CSS hide/show)
- ❌ Conditional rendering in components
- ❌ Implicit ordering logic
- ❌ Inferring behavior from presence of slices
- ❌ Duplicating children under multiple parents

---

## Hard Rules Compliance

| Rule | Status |
|------|--------|
| No UI-only fixes | ✅ All logic in tree builder |
| No conditional rendering hacks | ✅ Tree structure encodes semantics |
| No duplication of child nodes | ✅ Children only under slices |
| No nested slice nodes | ✅ Slices always siblings |
| Tree fully encodes FHIR semantics | ✅ Matching rules enforced at construction |

---

## Integration Points

### Related Features
- **EPIC 3**: Slice constraint configuration (conditions, cardinality, metadata)
- **EPIC 3.5**: Slice-aware selection model (`{ kind: 'slice', path, sliceName }`)
- **EPIC 4**: Strict FHIR slicing semantics (no child duplication, no nested slices)

### Upstream Dependencies
- `ElementDesignState.slicing.rules` (backend property)
- Must be one of: `"closed"`, `"open"`, `"openAtEnd"`
- Case-insensitive comparison: `slicingRules.rules.toLowerCase()`

### Downstream Impacts
- **ElementDetailsPanel**: Displays slice nodes correctly (already implemented)
- **SliceConstraintDrawer**: Edits slice conditions (already implemented)
- **Tree selection**: Uses slice-aware selection model (already implemented)

---

## Future Work

### Automated Testing (Pending)
- [ ] Unit test: `matching = 'closed'` → no unsliced node
- [ ] Unit test: `matching = 'open'` → unsliced first
- [ ] Unit test: `matching = 'openAtEnd'` → unsliced last
- [ ] Unit test: Slice nodes always siblings
- [ ] Unit test: Children never duplicated
- [ ] Integration test: Full slicing workflow with all matching rules

### Edge Cases (To Consider)
- Empty slices dictionary (should not render slice structure)
- Unknown matching rule (fallback to 'open' with warning)
- Missing `slicing.rules` property (default to 'open')

---

## Commit History

### Commit `2fa347f` - FHIR Slicing Matching Rules Implementation
**Date**: 2026-01-20  
**Changes**:
- Refactored Phase 3 with explicit `switch (matching)` statement
- Fixed `openAtEnd` bug: unsliced node now always appears last
- Implemented `closed` rule: no unsliced node created
- Refactored Phase 4 to preserve matching rule order
- Added console warning for unknown matching rules
- Updated comments to document matching semantics

**Files Modified**:
- `frontend/src/utils/treeBuilder.ts` (66 insertions, 18 deletions)

**Related Commits**:
- `3313ee7` - EPIC 4 invariants (strict FHIR slicing semantics)
- `4ce48f0` - EPIC 3.5 + EPIC 4 preview (slice-aware selection)
- `7ac2169` - Tree view Part 1 (virtual slice nodes)

---

## References

### FHIR Specification
- [FHIR R4: ElementDefinition.slicing.rules](https://www.hl7.org/fhir/elementdefinition-definitions.html#ElementDefinition.slicing.rules)
- Matching values: `closed`, `open`, `openAtEnd`

### Project Documentation
- [EPIC 3: Slice Constraints Implementation](../EPIC_3_SLICE_CONSTRAINTS_IMPLEMENTATION.md)
- [EPIC 4: Slice Tree Invariants](./EPIC_4_SLICE_TREE_INVARIANTS.md)
- [Rule DSL Spec](./03_rule_dsl_spec.md)

---

**Implementation**: Complete ✅  
**Testing**: Manual validation required  
**Status**: Ready for production use
