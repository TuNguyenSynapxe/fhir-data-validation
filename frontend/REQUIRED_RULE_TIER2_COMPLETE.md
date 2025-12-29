# Required Rule Tier-2 Extension — IMPLEMENTATION COMPLETE

## Overview
Extended the RequiredConfigSection to support **TWO MODES** within the unified rule authoring architecture:
1. **Required Field** (existing): Validate field presence/non-empty
2. **Required Resource** (NEW): Validate resource existence with optional attribute constraints

**Key Point:** This is NOT a new rule type. Both modes share the same "Required" rule type but with different configuration parameters.

---

## Implementation Summary

### Files Modified

#### 1. **RequiredConfigSection.tsx** (Complete Rewrite)
**Path:** `frontend/src/components/playground/Rules/rule-types/required/RequiredConfigSection.tsx`

**New Capabilities:**
- ✅ Mode selector: Field | Resource (segmented control)
- ✅ Mode locked in edit mode (cannot switch)
- ✅ Field mode: FHIRPath selector (existing behavior preserved)
- ✅ Resource mode: Quantity controls (At least / Exactly)
- ✅ Resource mode: Optional attribute conditions (collapsible, AND semantics)
- ✅ Real-time validation with inline error messages
- ✅ Auto-generated human-readable summary
- ✅ Type-safe params interface with discriminated union

**Key Components:**
```typescript
export type RequiredConfigMode = 'field' | 'resource';

export interface AttributeCondition {
  path: string;      // e.g., "category.coding.code"
  operator: '=';     // Only '=' for now
  value: string;
}

export interface ResourceRequirement {
  min: number;
  max?: number;      // Optional; if absent => only min
  where?: AttributeCondition[];
}

export type RequiredFieldParams = { path: string };
export type RequiredResourceParams = { resourceRequirement: ResourceRequirement };
export type RequiredParams = RequiredFieldParams | RequiredResourceParams;
```

**Props Interface:**
```typescript
interface RequiredConfigSectionProps {
  mode: 'create' | 'edit';
  resourceType: string;
  initialParams?: RequiredParams;
  onParamsChange: (params: RequiredParams, isValid: boolean) => void;
  projectBundle?: object;
  hl7Samples?: any[];
}
```

#### 2. **RuleForm.tsx** (Integration Updates)
**Path:** `frontend/src/components/playground/Rules/RuleForm.tsx`

**Changes:**
- ✅ Import `RequiredParams` type and `composeInstanceScopedPath` utility
- ✅ Replace `fieldPath` state with `requiredParams` and `requiredParamsValid` for Required rule
- ✅ Update initialization logic to detect field vs resource mode from `initialRule.params`
- ✅ Pass new props to RequiredConfigSection: `mode`, `initialParams`, `onParamsChange`
- ✅ Update validation: check `requiredParamsValid` instead of `fieldPath`
- ✅ Update build logic:
  - Field mode → use existing `buildRequiredRule()`
  - Resource mode → construct rule with `params: { resourceRequirement: {...} }`

**Field Mode Build (unchanged):**
```typescript
if ('path' in requiredParams) {
  rule = buildRequiredRule({
    resourceType,
    instanceScope,
    fieldPath: requiredParams.path,
    severity,
    errorCode: 'FIELD_REQUIRED',
    userHint: userHint || undefined,
  });
}
```

**Resource Mode Build (NEW):**
```typescript
else {
  const fullPath = composeInstanceScopedPath(resourceType, instanceScope);
  rule = {
    id: mode === 'edit' && initialRule?.id ? initialRule.id : `rule-${Date.now()}`,
    type: 'Required',
    resourceType,
    path: fullPath,
    severity,
    errorCode: 'REQUIRED_RESOURCE_MISSING',
    userHint: userHint || undefined,
    params: { resourceRequirement: requiredParams.resourceRequirement },
    origin: 'manual',
    enabled: true,
    isMessageCustomized: false,
  };
}
```

---

## Data Contract

### Field Mode Params
```json
{
  "path": "gender"
}
```

**Stored in Rule:**
```json
{
  "type": "Required",
  "resourceType": "Patient",
  "path": "Patient.gender",
  "errorCode": "FIELD_REQUIRED",
  "params": {
    "path": "gender"
  }
}
```

### Resource Mode Params — At Least
```json
{
  "resourceRequirement": {
    "min": 2
  }
}
```

**Stored in Rule:**
```json
{
  "type": "Required",
  "resourceType": "Observation",
  "path": "Observation",
  "errorCode": "REQUIRED_RESOURCE_MISSING",
  "params": {
    "resourceRequirement": {
      "min": 2
    }
  }
}
```

### Resource Mode Params — Exactly with Conditions
```json
{
  "resourceRequirement": {
    "min": 1,
    "max": 1,
    "where": [
      {
        "path": "category.coding.code",
        "operator": "=",
        "value": "vital-signs"
      }
    ]
  }
}
```

**Stored in Rule:**
```json
{
  "type": "Required",
  "resourceType": "Observation",
  "path": "Observation",
  "errorCode": "REQUIRED_RESOURCE_MISSING",
  "params": {
    "resourceRequirement": {
      "min": 1,
      "max": 1,
      "where": [
        {
          "path": "category.coding.code",
          "operator": "=",
          "value": "vital-signs"
        }
      ]
    }
  }
}
```

---

## Architecture Compliance

### ✅ Unified Architecture Maintained
- **NO separate edit form** — both create and edit use RuleForm + RequiredConfigSection
- **NO duplicated resource/scope/severity UI** — all handled by RuleForm shared sections
- **NO mode-based UX branching** — mode selector is disabled in edit with semantic reason ("Mode cannot be changed when editing")
- **ErrorCode handling remains centralized** in RuleForm:
  - Field mode → fixed `FIELD_REQUIRED`
  - Resource mode → fixed `REQUIRED_RESOURCE_MISSING`

### ✅ Backward Compatibility
- Existing Required Field rules continue to work unchanged
- Field path selection via FhirPathSelectorDrawer preserved
- Build logic for field mode uses existing `buildRequiredRule()` helper
- All validation patterns consistent with other rule types

---

## Manual QA Steps

### Test 1: Create Required Field Rule
**Steps:**
1. Open Rules panel → Add Rule
2. Select "Required" rule type
3. Select resource: Patient
4. In RequiredConfigSection, verify "Field" mode is selected by default
5. Click "Click to select a field"
6. Select path: `gender`
7. Verify summary shows: "Field 'gender' must be present and not empty"
8. Set severity: Error
9. Add user hint: "Patient gender required"
10. Click "Create Rule"

**Expected Result:**
- Rule created with `type: "Required"`, `path: "Patient.gender"`, `errorCode: "FIELD_REQUIRED"`
- Params: `{ path: "gender" }`

---

### Test 2: Create Required Resource Rule — At Least
**Steps:**
1. Open Rules panel → Add Rule
2. Select "Required" rule type
3. Select resource: Observation
4. In RequiredConfigSection, click "Resource" mode button
5. Select "At least" radio
6. Enter minimum: 2
7. Verify summary shows: "At least 2 Observation resource(s) required"
8. Set severity: Error
9. Click "Create Rule"

**Expected Result:**
- Rule created with `type: "Required"`, `path: "Observation"`, `errorCode: "REQUIRED_RESOURCE_MISSING"`
- Params: `{ resourceRequirement: { min: 2 } }`

---

### Test 3: Create Required Resource Rule — Exactly with Conditions
**Steps:**
1. Open Rules panel → Add Rule
2. Select "Required" rule type
3. Select resource: Observation
4. In RequiredConfigSection, click "Resource" mode button
5. Select "Exactly" radio
6. Enter exact count: 1
7. Click "Advanced: Add Attribute Conditions" to expand
8. Click "Add condition"
9. Enter path: `category.coding.code`
10. Operator: `=` (default)
11. Enter value: `vital-signs`
12. Verify summary shows: "Exactly 1 Observation resource(s) where category.coding.code = \"vital-signs\""
13. Click "Create Rule"

**Expected Result:**
- Rule created with:
  - `type: "Required"`
  - `path: "Observation"`
  - `errorCode: "REQUIRED_RESOURCE_MISSING"`
  - Params: `{ resourceRequirement: { min: 1, max: 1, where: [{ path: "category.coding.code", op: "=", value: "vital-signs" }] } }`

---

### Test 4: Edit Required Field Rule
**Steps:**
1. Click Edit on an existing Required Field rule (e.g., Patient.gender)
2. Verify mode selector shows "Field" selected and is DISABLED
3. Verify field path is populated: `gender`
4. Change field path to `name.family`
5. Verify summary updates: "Field 'name.family' must be present and not empty"
6. Click "Save Changes"

**Expected Result:**
- Rule updated with new path: `Patient.name.family`
- Mode remains "Field" (cannot be changed)
- Rule ID preserved

---

### Test 5: Edit Required Resource Rule
**Steps:**
1. Click Edit on an existing Required Resource rule
2. Verify mode selector shows "Resource" selected and is DISABLED
3. Verify quantity mode and value are populated (e.g., "At least 2")
4. Change to "Exactly" and set value to 3
5. Add a new condition: `status = final`
6. Verify summary updates: "Exactly 3 Observation resource(s) where status = \"final\""
7. Click "Save Changes"

**Expected Result:**
- Rule updated with new requirement: `{ min: 3, max: 3, where: [{ path: "status", op: "=", value: "final" }] }`
- Mode remains "Resource" (cannot be changed)
- Rule ID preserved

---

### Test 6: Validation — Empty Field Path
**Steps:**
1. Create Required rule → Field mode
2. Do NOT select a field path
3. Try to click "Create Rule"

**Expected Result:**
- Save blocked
- Error message: "Required configuration is incomplete or invalid"

---

### Test 7: Validation — Partial Condition
**Steps:**
1. Create Required rule → Resource mode
2. Expand "Advanced: Add Attribute Conditions"
3. Click "Add condition"
4. Enter path: `status` but leave value empty
5. Try to click "Create Rule"

**Expected Result:**
- Save blocked
- Inline error on condition row: "Both path and value are required"

---

### Test 8: Validation — Multiple Conditions (AND Semantics)
**Steps:**
1. Create Required rule → Resource mode → Exactly 1
2. Expand conditions
3. Add condition 1: `category.coding.code = vital-signs`
4. Add condition 2: `status = final`
5. Verify summary shows: "Exactly 1 Observation resource(s) where category.coding.code = \"vital-signs\" AND status = \"final\""
6. Click "Create Rule"

**Expected Result:**
- Rule created with both conditions in `where` array
- Conditions applied with AND semantics (all must match)

---

### Test 9: Mode Cannot Be Changed in Edit
**Steps:**
1. Edit an existing Required Field rule
2. Verify "Resource" button is disabled with tooltip: "Mode cannot be changed when editing"
3. Edit an existing Required Resource rule
4. Verify "Field" button is disabled with same tooltip

**Expected Result:**
- Mode selector is disabled in edit mode
- Clear explanation shown: "Mode cannot be changed when editing"
- Semantic reason (changing mode would break rule semantics, not arbitrary UI restriction)

---

### Test 10: Remove Condition
**Steps:**
1. Create Required rule → Resource mode
2. Add 2 conditions
3. Click trash icon on first condition
4. Verify condition is removed
5. Verify summary updates to reflect remaining condition only

**Expected Result:**
- Condition removed from list
- Summary auto-updates
- Remaining conditions preserved

---

## Backend Integration Notes

**Required for Full Functionality:**

The backend `FhirPathRuleEngine` needs to handle Resource mode validation:

1. **Detect resourceRequirement in params:**
```csharp
if (rule.Params != null && rule.Params.ContainsKey("resourceRequirement"))
{
    return await ValidateResourceRequirement(bundle, rule, cancellationToken);
}
```

2. **Validation Logic:**
- Count resources of specified type in bundle
- If `where` conditions exist, apply filters (FHIRPath evaluation on each resource)
- Compare count against `min` and `max` constraints
- Return violations if count doesn't match requirement

3. **Error Structure:**
```json
{
  "errorCode": "REQUIRED_RESOURCE_MISSING",
  "severity": "error",
  "message": "Expected exactly 1 Observation resource matching conditions, found 0",
  "path": "Observation",
  "details": {
    "required": { "min": 1, "max": 1 },
    "actual": 0,
    "conditions": [
      { "path": "category.coding.code", "op": "=", "value": "vital-signs" }
    ]
  }
}
```

---

## Benefits

### ✅ Unified Experience
- Single RequiredConfigSection handles both field and resource requirements
- Consistent UX patterns (mode selector, validation, summary)
- No separate components or forms

### ✅ Type Safety
- Discriminated union for `RequiredParams` ensures type-safe handling
- Compile-time checking for field vs resource mode
- No runtime type confusion

### ✅ Extensible
- Easy to add more operators (`in`, `!=`, `contains`, etc.)
- Can add more quantity modes (e.g., "Between")
- Attribute conditions architecture ready for complex filters

### ✅ Backward Compatible
- Existing Required Field rules continue to work
- No breaking changes to rule data structure
- Incremental backend adoption (field mode works without backend changes)

---

## Future Enhancements

1. **Advanced Condition Operators:**
   - `in` (value in list)
   - `!=` (not equal)
   - `contains` (substring match)
   - `matches` (regex)

2. **Condition Builder Drawer:**
   - Replace text input with FHIRPath picker for condition paths
   - Add value suggestions based on field type
   - Show live preview of matching resources

3. **OR Semantics:**
   - Allow grouping conditions with OR logic
   - UI: Add "Add condition group" button

4. **Range Quantity Mode:**
   - Add "Between" option for `min` and `max` range
   - UI: Two inputs (min, max)

---

**Status:** ✅ IMPLEMENTATION COMPLETE  
**Build Status:** ✅ Frontend builds successfully (0 errors)  
**Backend Status:** ⏳ Resource mode validation not yet implemented  
**Date:** 29 December 2025  
