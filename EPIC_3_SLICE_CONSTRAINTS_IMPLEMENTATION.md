# EPIC 3: Slice Constraint Panel Implementation

## Overview
Complete implementation of slice constraints with condition-based matching, cardinality overrides, and metadata support.

## Status: ✅ **IMPLEMENTATION COMPLETE**

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

**Prompt**:
```
Implement tree view support for rendering virtual slice nodes under sliced elements.

Behavior:
- If an element has element.slicing configured AND element.slices has entries:
  - Render child nodes for each slice with:
    - id: `${element.path}:${sliceName}` (use colon separator for slice identification)
    - label: metadata.shortLabel if present, fallback to sliceName
    - icon: distinct slice indicator icon (not the binding icon)
    - cardinality badge: show slice.overrideCardinality if present, else inherit from parent element

Selection Handling:
- Clicking a slice node sets active selection to `{ path: element.path, sliceName: sliceName }`
- ElementDetailsPanel must detect slice selection and show:
  - Section title: "Slice: {sliceName}" (or shortLabel if present)
  - Read-only discriminator summary
  - Conditions summary (show operator and value per discriminator)
  - Optional cardinality override display
  - "Configure Slice Constraints" button that opens SliceConstraintDrawer

Implementation Constraints:
- Do NOT duplicate base element children under slice nodes (EPIC 3 scope limitation)
- Keep existing selection behavior for normal element nodes working
- Update tree node rendering logic to check for slices and render them as children
- Ensure slice nodes are visually distinct (different icon, possibly indented)
- Add minimal unit test: tree renders slice nodes when element.slicing exists and slices.length > 0

Files to modify:
- Tree rendering component (likely SdBuilderTree.tsx or similar)
- ElementDetailsPanel.tsx to detect and display slice selection
- Add slice icon to icon set

Example tree structure output:
```
Patient
  └─ contact [0..*] (sliced)
      ├─ emergencyContact [1..1] (slice)
      └─ familyContact [0..*] (slice)
```
```

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
⚠️ Tests pending
⚠️ Tree view integration pending

---

**Date**: 2026-01-19  
**Implementation**: Core complete (backend + frontend UI)  
**Status**: Ready for testing and export integration  
**Commit**: `8d95afe`
