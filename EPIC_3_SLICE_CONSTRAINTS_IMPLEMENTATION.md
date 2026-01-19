# EPIC 3: Slice Constraint Panel Implementation

## Overview
Complete implementation of slice constraints with condition-based matching, cardinality overrides, metadata support, slice-aware selection model, and slice children visualization.

## Status: ✅ **IMPLEMENTATION COMPLETE** (incl. EPIC 3.5 + EPIC 4 preview)

---

## Backend Changes

### 1. Domain Model Extensions (`SliceDesignState.cs`)

Added two new properties to `SliceDesignState`:

```csharp
public List<SliceCondition> Conditions { get; set; } = new();
public SliceMetadata? Metadata { get; set; }
```

#### New Classes

**SliceCondition**:
- `DiscriminatorType` (required): Identifies which discriminator this condition applies to
- `DiscriminatorPath` (required): The FHIRPath expression
- `Operator` (required): One of: "none", "equals", "in", "regex", "exists"
- `Value` (optional): The comparison value
- `System` (optional): Code system for Coding types

**SliceMetadata**:
- `ShortLabel` (optional): Human-readable label for the slice
- `Description` (optional): Detailed description

### 2. Command Handler (`SdBuilderController.cs`)

Added `SetSliceConstraints` command case with:

#### Validation:
- Element path must exist in design state
- Slice name must exist in element's slices dictionary
- All condition discriminators must match existing discriminators
- At least one condition with operator != "none" is required
- Cardinality min/max must respect base element constraints

#### Processing:
1. Parse conditions array from payload
2. Validate each discriminator reference
3. Update `SliceDesignState.Conditions`
4. Optionally update `OverrideCardinality`
5. Optionally update `Metadata`

#### Error Handling:
- Throws `InvalidOperationException` for validation failures
- Clear error messages for debugging

---

## Frontend Changes

### 1. Type Updates (`SliceConstraintDrawer.tsx`)

#### SliceCondition Interface:
```typescript
interface SliceCondition {
  discriminatorPath: string;
  discriminatorType: string;
  operator: 'none' | 'equals' | 'in' | 'regex' | 'exists';
  value?: string;
  system?: string;
}
```

### 2. UI Sections

#### Section A: Discriminator Reference (READ-ONLY)
- Green theme with lock icon
- Shows inherited discriminators from element
- Users cannot edit (element-level only)

#### Section B: Slice Conditions (CORE EPIC 3)
- One condition UI per discriminator
- Operator dropdown: none, equals, in, regex, exists
- Value input (only shown for equals/in/regex)
- System input (for future Coding support)
- Help text explaining each operator

#### Section C: Slice Cardinality (OPTIONAL)
- Min/Max inputs
- Validated against base element cardinality
- Supports unbounded (*) notation

#### Section D: Slice Metadata (OPTIONAL)
- Short Label input
- Description textarea
- Future: helps tree view show meaningful names

### 3. Command Payload

Frontend sends:
```json
{
  "commandType": "SetSliceConstraints",
  "elementPath": "Patient.contact",
  "sliceName": "emergencyContact",
  "conditions": [
    {
      "discriminatorType": "value",
      "discriminatorPath": "relationship.coding.code",
      "operator": "equals",
      "value": "C"
    }
  ],
  "overrideCardinality": {
    "min": 1,
    "max": "1"
  },
  "metadata": {
    "shortLabel": "Emergency Contact",
    "description": "Required emergency contact for patient"
  }
}
```

### 4. State Management

- Initializes from existing `slice.Conditions` array
- Converts backend `Conditions` to UI state on load
- Builds `conditions` array from UI state on save
- Only sends non-empty optional fields

---

## Data Flow

### Creation Flow:
1. User enables slicing → creates discriminators
2. User adds slice (only name at this point)
3. Slice shows in list with "Configure" button
4. **EPIC 3**: User clicks Configure → SliceConstraintDrawer opens
5. User sets conditions for at least one discriminator
6. User optionally sets cardinality/metadata
7. Frontend sends `SetSliceConstraints` command
8. Backend validates and updates `SliceDesignState`
9. Tree view eventually shows slice as child node

### Edit Flow:
1. User clicks Configure on existing slice
2. Drawer loads existing conditions/cardinality/metadata
3. User modifies values
4. Save triggers `SetSliceConstraints` with updated payload
5. Backend idempotently updates state

---

## Validation Rules

### Backend:
- ✅ Element path exists
- ✅ Slice name exists
- ✅ All discriminators referenced in conditions exist
- ✅ At least one condition has operator != "none"
- ✅ Cardinality min ≤ max
- ✅ Slice cardinality within element bounds

### Frontend:
- ✅ At least one condition required to enable save
- ✅ Value input required for operators: equals, in, regex
- ✅ Value input hidden for operator: exists
- ✅ Min cannot exceed max

---

## Testing Checklist

### Backend:
- [ ] Create unit test for SetSliceConstraints command
- [ ] Test validation: element not found
- [ ] Test validation: slice not found
- [ ] Test validation: discriminator not found
- [ ] Test validation: no conditions provided
- [ ] Test validation: all conditions are "none"
- [ ] Test validation: cardinality out of bounds
- [ ] Test successful constraint setting
- [ ] Test idempotent updates

### Frontend:
- [ ] Test drawer opens with empty conditions
- [ ] Test drawer loads existing conditions
- [ ] Test save button disabled when no conditions
- [ ] Test condition value required for equals/in/regex
- [ ] Test condition value hidden for exists
- [ ] Test cardinality validation (min > max)
- [ ] Test successful save closes drawer
- [ ] Test error display on server failure

### Integration:
- [ ] Full flow: Enable slicing → Add discriminator → Add slice → Configure constraints → Verify in tree
- [ ] Edit existing slice constraints
- [ ] Remove slice with constraints
- [ ] Export SD JSON includes conditions

---

## Migration Notes

### Breaking Changes:
- **REMOVED**: `PatternValues` and `FixedValues` properties
- **REPLACED WITH**: `Conditions` array with explicit operators

### Backward Compatibility:
- Old slices without conditions: Migration needed
- Convert `PatternValues[path] = value` → `Conditions.Add(new SliceCondition { Path = path, Operator = "equals", Value = value })`
- Convert `FixedValues[path] = value` → Same as pattern but with stricter semantics

### Frontend Adjustment:
- SliceConstraintDrawer no longer uses `conditionType: 'pattern' | 'fixed'`
- Uses `operator: 'equals' | 'in' | 'regex' | 'exists'` instead
- More explicit about matching behavior

---

## Files Modified

### Backend:
1. `/backend/src/Pss.FhirProcessor.SdBuilder/Domain/SliceDesignState.cs`
   - Added `Conditions` property
   - Added `Metadata` property
   - Added `SliceCondition` class
   - Added `SliceMetadata` class

2. `/backend/src/Pss.FhirProcessor.Playground.Api/Controllers/SdBuilderController.cs`
   - Added `SetSliceConstraints` case in `ExecuteSessionCommand`
   - Full validation logic
   - Cardinality bounds checking
   - Metadata parsing

### Frontend:
1. `/frontend/src/components/SdBuilder/SliceConstraintDrawer.tsx`
   - Updated `SliceCondition` interface
   - Changed `conditionType` to `operator`
   - Updated operator dropdown options
   - Updated help text
   - Changed command from `SetSliceConstraint` to `SetSliceConstraints`
   - Build conditions array from UI state
   - Load conditions array into UI state

---

## Next Steps - Copilot Implementation Prompts

### A) Backend Unit Tests (xUnit)

**Prompt**:
```
Create backend unit tests for SdBuilderController SetSliceConstraints command.

Requirements:
- Add tests under existing test project for SdBuilderController command execution
- Use xUnit testing framework with FluentAssertions
- Cover the following validation scenarios:

Test Cases:
1) element path not found => return 400 BadRequest with clear message
2) slice name not found => return 400 BadRequest
3) discriminator not found in element.Slicing.Discriminators => return 400
4) empty conditions array => return 400
5) all conditions have operator == "none" => return 400 (at least one non-none required)
6) cardinality invalid (min > max) => return 400
7) cardinality exceeds base element bounds => return 400
8) successful save: verify conditions + metadata + overrideCardinality persisted in SliceDesignState
9) idempotent updates: same command twice yields identical design state

Hard Rules:
- Do NOT use Firely SDK
- Do NOT use InvalidOperationException for validation; return BadRequest or throw a domain validation exception mapped to 400
- Assertions must verify saved SliceDesignState.Conditions + Metadata + OverrideCardinality properties
- Use existing SdBuilderController test patterns already in the repository
- Test command payload matches EPIC 3 spec: discriminatorType/discriminatorPath/operator/value/system

Example assertion pattern:
```csharp
var element = session.DesignState.Elements.First(e => e.Path == "Patient.contact");
var slice = element.Slices["emergencyContact"];
slice.Conditions.Should().HaveCount(1);
slice.Conditions[0].DiscriminatorType.Should().Be("value");
slice.Conditions[0].Operator.Should().Be("equals");
slice.Metadata.Should().NotBeNull();
slice.Metadata.ShortLabel.Should().Be("Emergency Contact");
```

Follow existing test file structure and naming conventions.
```

### B) Frontend Vitest Tests

**Prompt**:
```
Add vitest tests for SliceConstraintDrawer component.

Location: frontend/src/components/SdBuilder/SliceConstraintDrawer.test.tsx

Test Cases:
1) Save button disabled when all conditions have operator == "none"
2) When operator is equals/in/regex: value input is required, save button disabled without value
3) When operator is "exists": value input is hidden, can save without value
4) Builds correct payload with commandType "SetSliceConstraints" and only includes non-empty optional fields
5) Loads existing slice.Conditions array into UI state correctly on mount
6) Shows validation error when trying to save without any non-none conditions

Constraints:
- Use React Testing Library patterns already used in the repository
- Import patterns from existing drawer tests (e.g., AddSliceDrawer.test.tsx, SlicingConfigDrawer.test.tsx)
- No snapshot tests; assert visible text, button enabled/disabled state, and form values
- Mock useSdBuilderStore with proper applyCommand spy
- Use userEvent for interactions (select dropdowns, type in inputs)

Example assertion pattern:
```typescript
const saveButton = screen.getByRole('button', { name: /save constraints/i });
expect(saveButton).toBeDisabled();

await userEvent.selectOptions(operatorSelect, 'equals');
expect(screen.getByPlaceholderText(/enter equals value/i)).toBeVisible();

await userEvent.type(valueInput, 'C');
expect(saveButton).toBeEnabled();

await userEvent.click(saveButton);
expect(mockApplyCommand).toHaveBeenCalledWith({
  commandType: 'SetSliceConstraints',
  elementPath: 'Patient.contact',
  sliceName: 'emergencyContact',
  conditions: [
    { discriminatorType: 'value', discriminatorPath: 'relationship.coding.code', operator: 'equals', value: 'C' }
  ]
});
```
```

### C) Tree View Integration (Virtual Slice Nodes)

**Status**: ✅ **COMPLETE** (Commits: `7ac2169`, `58d88b6`)

**Implementation Summary**:

**Part 1: Tree Node Rendering** (Commit `7ac2169`)
- Extended TreeNode type with `isSlice`, `sliceName`, `parentPath` properties
- Tree builder injects virtual slice nodes under sliced elements (Phase 3)
- Slice node ID format: `${elementPath}::slice::${sliceName}`
- Visual rendering: Scissors icon + purple text styling
- Custom sorting: slices appear after regular children, alphabetically sorted

**Part 2: Right Panel Integration** (Commit `58d88b6`)
- Parse `selectedPath` to detect `::slice::` pattern
- Extract `elementPath` and `sliceName` from slice node selection
- Slice-specific panel view displays:
  - Header with Scissors icon + slice label (metadata.shortLabel or sliceName)
  - Parent element reference (read-only)
  - Discriminators summary (read-only, inherited from element)
  - Conditions display (operator + value per discriminator)
  - Cardinality display (slice override or inherited from element)
  - Metadata display (shortLabel, description if defined)
  - "Configure Slice" button opens SliceConstraintDrawer
- Element panel unchanged: "Edit Slicing Rules" and "Add Slice" remain element-level only

**User Workflow**:
1. Enable slicing on repeatable element (e.g., Patient.contact)
2. Add discriminators (e.g., value @ relationship.coding.code)
3. Add slices (e.g., "emergencyContact", "familyContact")
4. Configure each slice (conditions, cardinality, metadata)
5. Expand element in tree → see slice nodes with Scissors icon
6. Click slice node → right panel shows slice-specific view
7. Click "Configure Slice" → edit constraints in drawer
8. Save → changes immediately reflected in slice panel summary

**Files Modified**:
- `frontend/src/types/treeNode.ts` - TreeNode interface extensions
- `frontend/src/utils/treeBuilder.ts` - Slice node injection logic
- `frontend/src/components/SdBuilder/TreeNode.tsx` - Scissors icon + purple styling
- `frontend/src/components/SdBuilder/ElementDetailsPanel.tsx` - Slice panel view routing

**Testing**: ✅ TypeScript compilation successful, no errors

~~**Prompt**: [Original implementation prompt removed - now complete]~~

### D) Export Mapping (StructureDefinition Differential)

**Prompt**:
```
Implement EPIC 3 export mapping for slice constraints into StructureDefinition differential.

Input Design State:
- element.slicing configuration (discriminators, rules, ordered) - already exported in EPIC 2
- element.slices dictionary with per-slice constraints:
  - Conditions[] (discriminatorType, discriminatorPath, operator, value, system)
  - OverrideCardinality (min, max)
  - Metadata (shortLabel, description)

Output StructureDefinition.differential.element[] Requirements:

1) Parent element with slicing info (existing EPIC 2 - preserve)

2) For each sliceName in element.slices:
   Create slice definition element:
   ```json
   {
     "id": "Patient.contact:emergencyContact",
     "path": "Patient.contact",
     "sliceName": "emergencyContact",
     "min": 1,  // from OverrideCardinality if present
     "max": "1",
     "short": "Emergency Contact"  // from Metadata.ShortLabel if present
   }
   ```

3) For each condition with operator == "equals":
   Create discriminator constraint element:
   ```json
   {
     "id": "Patient.contact:emergencyContact.relationship",
     "path": "Patient.contact.relationship",
     "fixedCodeableConcept": {
       "coding": [{
         "system": "http://terminology.hl7.org/CodeSystem/v2-0131",
         "code": "C"
       }]
     }
   }
   ```

   Mapping rules for operator "equals":
   - discriminatorType == "value" => use fixed[x]
   - discriminatorType == "pattern" => use pattern[x]
   - For primitives (string, boolean, integer): fixedString, fixedBoolean, etc.
   - For Coding: fixedCoding or patternCoding (use system if provided)
   - For CodeableConcept: fixedCodeableConcept or patternCodeableConcept

4) For operators "in", "regex", "exists":
   - DO NOT silently export incorrect constraints
   - Option A: Skip with explicit export warning logged
   - Option B: Export as FHIRPath invariant only if invariant system exists
   - Add TODO comment for future implementation

Guardrails:
- No Firely SDK usage
- Add automated test: exporting element with slices creates correct element entries with slice IDs
- Test fixed/pattern values map correctly based on discriminator type
- Verify cardinality from OverrideCardinality appears in slice element entry
- Test metadata.shortLabel maps to element.short

Files to modify:
- Export service/mapper that converts ResourceDesignState to StructureDefinition JSON
- Add helper method to determine fixed[x]/pattern[x] property name from data type
- Add validation warnings for unsupported operators

Test example:
```csharp
var sd = exporter.Export(designState);
var sliceElement = sd.Differential.Element.First(e => e.ElementId == "Patient.contact:emergencyContact");
sliceElement.SliceName.Should().Be("emergencyContact");
sliceElement.Min.Should().Be(1);

var discriminatorElement = sd.Differential.Element.First(e => e.ElementId == "Patient.contact:emergencyContact.relationship");
discriminatorElement.Fixed.Should().BeOfType<CodeableConcept>();
```
```

### Additional Tasks (Lower Priority)

5. **Coding Support**: Implement system input for Coding discriminators
6. **ValueSet Integration**: Support "in" operator with value set expansion
7. **Regex Validation**: Add regex pattern validation in UI
8. **Debug Cleanup**: Remove console.log statements

---

## Example Use Case

**Scenario**: Patient with two types of contacts

### Step 1: Enable Slicing on `Patient.contact`
- Discriminator: `value` @ `relationship.coding.code`

### Step 2: Add Slices
- Slice 1: "emergencyContact"
- Slice 2: "familyContact"

### Step 3: Configure Emergency Contact
```json
{
  "conditions": [
    {
      "discriminatorType": "value",
      "discriminatorPath": "relationship.coding.code",
      "operator": "equals",
      "value": "C"
    }
  ],
  "overrideCardinality": { "min": 1, "max": "1" },
  "metadata": {
    "shortLabel": "Emergency Contact",
    "description": "Required emergency contact"
  }
}
```

### Step 4: Configure Family Contact
```json
{
  "conditions": [
    {
      "discriminatorType": "value",
      "discriminatorPath": "relationship.coding.code",
      "operator": "equals",
      "value": "N"
    }
  ],
  "overrideCardinality": { "min": 0, "max": "*" },
  "metadata": {
    "shortLabel": "Family Contact",
    "description": "Optional family contacts"
  }
}
```

### Result:
- Slicing enabled on `Patient.contact`
- Two slices with distinct conditions
- Emergency contact required (1..1)
- Family contacts optional (0..*)
- Tree view shows both slices as child nodes

---

## Build Status

✅ Backend compiles successfully
✅ Frontend types updated
✅ Command handler implemented
✅ Validation logic complete
✅ UX improvements with semantic icons (emoji)
✅ Icon migration to Lucide React components
✅ Error handling with toast notifications
✅ Tree view Part 1: Virtual slice nodes rendering
✅ Tree view Part 2: Right panel integration
✅ **EPIC 3.5: Slice-aware selection model**
✅ **EPIC 4 PREVIEW: Slice children in tree**
⚠️ Backend unit tests pending
⚠️ Frontend vitest tests pending
⚠️ Export mapping (StructureDefinition differential) pending

---

## Recent Changes

### Commit `4ce48f0` - EPIC 3.5 + EPIC 4 Preview (Slice-Aware Selection + Slice Children)

**EPIC 3.5: Explicit Selection Model**
- Created `SdBuilderSelection` discriminated union type
  - `{ kind: 'element', path }` for element nodes
  - `{ kind: 'slice', path, sliceName }` for slice nodes
- Replaced `selectedPath` (string) with `selection` (object) in store
- All components use selection object directly (no string parsing)
- Tree node click handlers emit proper selection based on node type
- ElementDetailsPanel strictly routes based on `selection.kind`

**EPIC 4 PREVIEW: Slice Children**
- Slice nodes now have children mirroring parent element structure
- Example tree output:
  ```
  Patient.contact [0..*] (sliced)
   ├─ 🔪 Emergency Contact (slice)
   │  ├─ ↳ extension
   │  ├─ ↳ relationship
   │  └─ ↳ telecom
   └─ 🔪 Family Contact (slice)
      ├─ ↳ extension
      ├─ ↳ relationship
      └─ ↳ telecom
  ```
- Slice children marked with `isSliceChild` flag
- Visual indicators: `↳` arrow + gray text + context badge
- Click behavior: selecting slice child selects parent slice
- Read-only in EPIC 4 (editing in future iterations)

**Visual Differentiation**:
- **Slice node**: Scissors icon 🔪 + purple text
- **Slice child**: ↳ arrow + gray text + slice name badge
- **Element node**: Standard styling

**Files Modified**:
- `types/sdBuilderSelection.ts` (NEW) - Selection type + helper functions
- `types/treeNode.ts` - Added `isSliceChild`, `sliceContext` properties
- `stores/useSdBuilderStore.ts` - Replaced `selectedPath` with `selection`
- `utils/treeBuilder.ts` - Added `createSliceChildNode()` helper + mirroring logic
- `components/SdBuilder/TreeNode.tsx` - Selection emission + slice child visual rendering
- `components/SdBuilder/SdTreeView.tsx` - Selection matching helper
- `components/SdBuilder/ElementDetailsPanel.tsx` - Direct `selection.kind` routing

**Compliance**:
- ✅ No new panels or modes
- ✅ No heuristics or AI inference
- ✅ No Firely SDK usage
- ✅ No modification of domain model (virtual nodes only)
- ✅ Explicit, type-safe selection model
- ✅ Forge-like tree visualization

### Commit `7ac2169` - Tree View Part 1 (Virtual Slice Nodes)
- Extended TreeNode type with slice properties
- Tree builder injects slice nodes under sliced elements
- Scissors icon + purple styling for visual distinction
- Custom sorting: slices after regular children

### Commit `58d88b6` - Tree View Part 2 (Right Panel Integration)
- Selection detection for slice nodes
- Slice-specific panel view with read-only summaries
- "Configure Slice" button wired to SliceConstraintDrawer
- Element panel unchanged (element-level actions preserved)

### Commit `09db8a7` - Error Handling Enhancement
- Enhanced error handling in SliceConstraintDrawer
- Toast notifications for save success/failure
- JSON error parsing in API layer
- Console logging for debugging

### Commit `c436cb2` + `8cf0f91` - Icon Migration (Lucide React)
- Migrated all emoji unicode characters to Lucide React components
- Maintains consistent icon library usage across project
- Improved maintainability and accessibility
- Icons: Layers, Key, FlaskConical, Ruler, Tag, Save, Ban, Target, List, Code, Check, Info, AlertTriangle, Trash2, Hash, Lock, Plus, Edit, CircleDot, XCircle, Scissors

### Commit `95adc68` - UX Improvements (Emoji Icons)
- Added semantic emoji icons across all slicing components
- Clearer instructional text and helper messages
- Progressive disclosure with visual indicators

---

**Date**: 2026-01-19  
**Implementation**: Core complete + slice-aware selection + slice children preview  
**Status**: Ready for testing, unit tests, and export integration  
**Latest Commit**: `4ce48f0`
