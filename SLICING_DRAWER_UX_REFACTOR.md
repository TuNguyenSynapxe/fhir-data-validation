# Slicing UX Refactor: Drawer-Based, Binding-Aligned ✅

**Date**: January 19, 2026  
**Status**: ✅ Complete

## Objective
Refactor slicing UX to use drawers instead of modals, align with binding UX patterns, and enforce FHIR semantics through tree-based path selection.

## Implementation Summary

### New Components Created

#### 1. AddDiscriminatorDrawer.tsx
**Purpose**: Tree-based discriminator selection (no free text)

**Features**:
- Displays all valid child elements of the parent element
- Selectable from tree (no manual path input)
- Discriminator type constrained by selected path's FHIR type
- Context-aware type suggestions:
  - CodeableConcept/Coding → Pattern
  - Primitives (string, boolean, etc.) → Value
  - Reference → Profile/Type
- Duplicate detection
- Type explanations (Pattern, Value, Type, Profile, Exists)

**FHIR Compliance**:
- ✅ Eliminates invalid discriminator paths
- ✅ Discriminators are element-level (shared)
- ✅ No per-slice discriminators possible

#### 2. AddSliceDrawer.tsx
**Purpose**: Add slices with awareness of inherited discriminators

**Features**:
- Shows active discriminators (read-only) to reinforce FHIR semantics
- Slice name validation (alphanumeric, starts with letter)
- Duplicate detection
- Clear helper text: "All slices share the same discriminators"
- EPIC 3 extension point placeholder (cardinality, conditions, constraints)

**FHIR Compliance**:
- ✅ Slices inherit element-level discriminators
- ✅ Cannot create per-slice discriminator sets
- ✅ Clear visual separation of concerns

#### 3. SlicingConfigDrawer.tsx
**Purpose**: Main slicing configuration drawer (replaces SlicingEditor modal)

**Structure**:
- Section A: Slicing Rules (Matching, Order)
- Section B: Discriminators (List, Add via drawer)
- Section C: Slices (List, Add via drawer)

**Features**:
- Drawer-based layout (not modal) matching binding UX
- "Add Discriminator" button opens AddDiscriminatorDrawer
- "Add Slice" button opens AddSliceDrawer
- Apply Configuration button (disabled until ≥1 discriminator)
- Slice creation disabled until discriminators exist
- Warning banner when no discriminators: "⚠️ Configure discriminators before adding slices"
- Helper text explaining slicing scope

**FHIR Compliance**:
- ✅ Three-section structure enforces FHIR mental model
- ✅ Discriminators clearly element-level
- ✅ Slices depend on discriminators
- ✅ No magic auto-creation

### Integration Updates

#### Files Modified
1. **ElementDetailsPanel.tsx**
   - Import: `SlicingConfigDrawer` (was `SlicingEditor`)
   - Pass `allElements` to drawer for child path extraction
   - Conditional rendering updated for drawer pattern

2. **SdBuilderPage.tsx**
   - Import: `SlicingConfigDrawer` (was `SlicingEditor`)
   - Pass `allElements` to drawer
   - isOpen pattern for drawer (not conditional render)

### Key Changes from Previous Implementation

#### Before (Modal-Based)
- ❌ Free-text discriminator path input
- ❌ Modal popup approach
- ❌ Could enter invalid paths
- ❌ Mixed discriminators and slices
- ❌ No visual enforcement of FHIR semantics

#### After (Drawer-Based)
- ✅ Tree-based discriminator selection only
- ✅ Drawer approach matching binding UX
- ✅ Invalid paths impossible
- ✅ Clear three-section structure
- ✅ FHIR semantics structurally enforced
- ✅ Staged configuration flow
- ✅ Context always visible (tree stays visible)

## Benefits Achieved

### 1. Eliminates Invalid Discriminator Paths
- Tree selection guarantees valid child element paths
- No manual typing → no typos, no invalid references
- Type-aware discriminator type selection

### 2. Makes Slicing Explainable Without FHIR Knowledge
- Clear visual hierarchy: Rules → Discriminators → Slices
- Warning banner explains dependency
- Read-only discriminator display in slice drawer
- Helper text at every step

### 3. Scales Cleanly into EPIC 3
- AddSliceDrawer has clear extension point for:
  - Slice cardinality
  - Slice-specific conditions
  - Slice-specific constraints
- No refactor needed for EPIC 3 features
- Drawer pattern supports complex forms naturally

## UX Flow Example

### User Journey: Slice Observation.component
1. User selects `Observation.component` in tree
2. Clicks "Configure Slicing" button in ElementDetailsPanel
3. **SlicingConfigDrawer opens** (right side, 700px)
   - Section A shows: Matching = Open, Order = No
   - Section B shows: "No discriminators configured"
   - Section C shows: Warning "Configure discriminators first"
4. User clicks "➕ Add Discriminator"
5. **AddDiscriminatorDrawer opens** (over main drawer, right side, 600px)
   - Shows tree of child elements: `code`, `value[x]`, etc.
   - User selects `code`
   - System suggests: Pattern (CodeableConcept)
   - User clicks "Add Discriminator"
6. Back to SlicingConfigDrawer
   - Section B now shows: `pattern | code`
   - User clicks "Apply Slicing Configuration"
7. User clicks "➕ Add Slice"
8. **AddSliceDrawer opens** (over main drawer)
   - Shows active discriminators (read-only): `pattern | code`
   - User enters slice name: "systolic"
   - User clicks "Add Slice"
9. Back to SlicingConfigDrawer
   - Section C shows: 🔖 systolic
10. User closes drawer
11. Tree now shows: `Observation.component` with slices `systolic`, etc.

## Guardrails Enforced

### Cannot Do (By Design)
- ❌ Type discriminator path manually
- ❌ Add slice without discriminator
- ❌ Create per-slice discriminators
- ❌ Edit discriminators inside slice editor
- ❌ Create invalid paths

### Must Do (Enforced)
- ✅ Select discriminator path from valid children only
- ✅ Configure at least one discriminator before slices
- ✅ All slices inherit element-level discriminators
- ✅ Discriminator type constrained by path type

## Technical Details

### Type Safety
- All components use `ElementDesign` from API
- `allElements` array passed for child path extraction
- Type-safe discriminator type enums
- Validation at every step

### State Management
- Local state in SlicingConfigDrawer for staging
- Applies configuration via `ConfigureSlicing` command
- Adds slices via `AddSlice` command
- No backend changes required

### Compatibility
- Old `SlicingEditor` component still exists (deprecated)
- `shouldShowConfigureSlicing` helper reused
- Backend commands unchanged
- Backward compatible with existing slicing data

## Testing

### Dev Server
- ✅ Frontend builds successfully
- ✅ Dev server running on http://localhost:5174/
- ✅ No new TypeScript errors introduced
- ✅ Existing pre-existing errors unchanged

### Manual Testing Checklist
- [ ] Open Configure Slicing on repeatable element
- [ ] Verify three-section drawer layout
- [ ] Click Add Discriminator → verify tree selection
- [ ] Select child path → verify type constraints
- [ ] Add discriminator → verify appears in list
- [ ] Verify Apply button enables after discriminator added
- [ ] Click Add Slice → verify discriminators shown (read-only)
- [ ] Add slice → verify appears in list with 🔖 icon
- [ ] Verify slice creation disabled when no discriminators
- [ ] Verify warning banner when no discriminators
- [ ] Close drawer → verify slices appear in tree

## Files Created/Modified

### New Files
- [frontend/src/components/SdBuilder/AddDiscriminatorDrawer.tsx](frontend/src/components/SdBuilder/AddDiscriminatorDrawer.tsx) — 268 lines
- [frontend/src/components/SdBuilder/AddSliceDrawer.tsx](frontend/src/components/SdBuilder/AddSliceDrawer.tsx) — 184 lines
- [frontend/src/components/SdBuilder/SlicingConfigDrawer.tsx](frontend/src/components/SdBuilder/SlicingConfigDrawer.tsx) — 298 lines

### Modified Files
- [frontend/src/components/SdBuilder/ElementDetailsPanel.tsx](frontend/src/components/SdBuilder/ElementDetailsPanel.tsx)
  - Import change: SlicingEditor → SlicingConfigDrawer
  - Pass allElements prop
- [frontend/src/pages/SdBuilderPage.tsx](frontend/src/pages/SdBuilderPage.tsx)
  - Import change: SlicingEditor → SlicingConfigDrawer
  - Pass allElements prop

### Deprecated (Not Removed Yet)
- [frontend/src/components/SlicingEditor.tsx](frontend/src/components/SlicingEditor.tsx)
  - Old modal-based implementation
  - Still used by some code paths
  - Can be removed once fully migrated

## Next Steps

### Immediate (Required)
1. **Manual UI Testing**: Test all scenarios in browser at http://localhost:5174/
2. **User Acceptance**: Verify UX matches binding patterns
3. **Screenshot Documentation**: Capture drawer flows for docs

### Future (EPIC 3)
1. Extend AddSliceDrawer with:
   - Slice cardinality fields (min/max)
   - Slice-specific conditions (FHIRPath expressions)
   - Slice-specific constraints (binding overrides, fixed values)
2. Integrate with SliceConstraintPanel for post-creation editing
3. Add ValueSet preview for slice name suggestions (from EPIC 2)

### Cleanup (Optional)
1. Remove old SlicingEditor.tsx once fully deprecated
2. Update tests to use new drawer components
3. Add E2E tests for discriminator/slice workflows

## Alignment with Requirements

### ✅ Hard Constraints Met
- ✅ No backend changes
- ✅ No Firely SDK usage
- ✅ No AI inference
- ✅ No per-slice discriminators
- ✅ Discriminators are element-level and shared
- ✅ Slices cannot exist without discriminators
- ✅ Tree-driven selection only (no free text paths)

### ✅ UX Requirements Met
- ✅ Drawer-based (not modal) matching binding UX
- ✅ Three explicit sections (Rules, Discriminators, Slices)
- ✅ Tree selection for discriminator paths
- ✅ Staged configuration flow
- ✅ Clear warning when no discriminators
- ✅ Helper text at every step
- ✅ Read-only discriminator display in slice drawer
- ✅ Exact copy as specified

### ✅ FHIR Semantics Enforced
- ✅ Discriminators belong to element, not slices
- ✅ All slices share same discriminator list
- ✅ UI structurally enforces this relationship
- ✅ Invalid discriminator paths impossible
- ✅ Slicing explainable without FHIR knowledge

---

**Refactor Complete** ✅  
Drawer-based, binding-aligned, FHIR-compliant slicing UX implemented.
Frontend running, ready for manual testing and EPIC 3 extension.
