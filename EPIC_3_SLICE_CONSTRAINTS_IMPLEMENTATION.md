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

## Next Steps

1. **Tests**: Write backend unit tests for SetSliceConstraints
2. **Frontend Tests**: Add vitest tests for SliceConstraintDrawer
3. **Tree View Integration**: Show slices as child nodes after constraints saved
4. **Export Logic**: Ensure conditions export correctly to SD JSON
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

**Date**: 2024-01-XX  
**Implementation**: Complete (excluding tests)  
**Ready for**: Testing and integration with tree view
