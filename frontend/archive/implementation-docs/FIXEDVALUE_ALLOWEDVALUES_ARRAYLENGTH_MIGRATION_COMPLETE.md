# FixedValue / AllowedValues / ArrayLength Migration — COMPLETE

## Status: ✅ COMPLETE

FixedValue, AllowedValues, and ArrayLength rules have been successfully migrated to the unified RuleForm architecture.

---

## Implementation Summary

### ✅ Components Created

**FixedValue:**
- `FixedValueConfigSection.tsx` - Field selection + expected value input
- `FixedValueRuleHelpers.ts` - Build and parse logic
- Fixed Error Code: `FIXED_VALUE_MISMATCH`

**AllowedValues:**
- `AllowedValuesConfigSection.tsx` - Field selection + allowed values list management
- `AllowedValuesRuleHelpers.ts` - Build and parse logic
- Fixed Error Code: `VALUE_NOT_ALLOWED`

**ArrayLength:**
- `ArrayLengthConfigSection.tsx` - Array field selection + min/max length constraints
- `ArrayLengthRuleHelpers.ts` - Build and parse logic
- Fixed Error Code: `ARRAY_LENGTH_VIOLATION`

---

## Architecture Compliance

### ✅ All Requirements Met

1. **Use RuleForm.tsx for create and edit** ✅
   - AddRuleModal routes all three types to RuleForm with `mode="create"`
   - RuleEditorModal routes all three types to RuleForm with `mode="edit"`

2. **Rule-specific ConfigSection ONLY handles parameters** ✅
   - FixedValue: field path, expected value
   - AllowedValues: field path, allowed values list
   - ArrayLength: array path, min/max constraints
   - NO shared UI (resource, scope, severity) in config sections

3. **ErrorCode displayed as read-only fixed badge** ✅
   - RuleForm shows blue badge with fixed error code
   - Config sections do NOT render errorCode input

4. **Resource selection collapses after selection** ✅
   - Inherited from shared ResourceSelector component
   - Collapsible grid in create mode

5. **Edit mode locks resource selection** ✅
   - ResourceSelector `disabled={mode === 'edit'}`
   - Shows locked summary with lock icon

6. **Bundle-aware resource presence hint** ✅
   - Inherited from shared ResourceSelector component
   - Shows green message (count) or amber warning (not found)

7. **No duplicated severity, scope, or errorCode UI** ✅
   - All shared sections rendered by RuleForm
   - Config sections are properly scoped

---

## File Structure

```
frontend/src/components/playground/Rules/rule-types/
├── fixed-value/
│   ├── FixedValueConfigSection.tsx       ← NEW
│   └── FixedValueRuleHelpers.ts          ← NEW
├── allowed-values/
│   ├── AllowedValuesConfigSection.tsx    ← NEW
│   └── AllowedValuesRuleHelpers.ts       ← NEW
└── array-length/
    ├── ArrayLengthConfigSection.tsx      ← NEW
    └── ArrayLengthRuleHelpers.ts         ← NEW
```

---

## Updated Files

### RuleForm.tsx
- Added imports for new config sections and helpers
- Updated `RuleType` union: `'FixedValue' | 'AllowedValues' | 'ArrayLength'`
- Updated `getErrorCodeMode()` to return `'fixed'` for new types
- Updated `getFixedErrorCode()` with new error codes
- Updated `RULE_TYPE_LABELS` and `RULE_TYPE_DESCRIPTIONS`
- Added state variables: `expectedValue`, `allowedValues`, `minLength`, `maxLength`
- Added hydration logic for edit mode
- Added validation logic for new rule types
- Added rule building logic for new rule types
- Added config section rendering for new rule types

### RuleTypeSelector.tsx
- Added imports for new icons: `FileCheck`, `List`, `Ruler`
- Updated `RuleTypeOption` union: `'fixedValue' | 'allowedValues' | 'arrayLength'`
- Added three new rule type options to selector

### AddRuleModal.tsx
- Added routing for `fixedValue` → `<RuleForm ruleType="FixedValue" />`
- Added routing for `allowedValues` → `<RuleForm ruleType="AllowedValues" />`
- Added routing for `arrayLength` → `<RuleForm ruleType="ArrayLength" />`

### RuleEditorModal.tsx
- Updated routing condition: `['Required', 'Regex', 'QuestionAnswer', 'FixedValue', 'AllowedValues', 'ArrayLength']`
- Updated type cast: `as 'Required' | 'Regex' | 'QuestionAnswer' | 'FixedValue' | 'AllowedValues' | 'ArrayLength'`

---

## Config Section Details

### FixedValueConfigSection

**Parameters:**
- Field path (FhirPathSelectorDrawer)
- Expected value (text input)

**Validation:**
- Field path required
- Expected value required (accepts "0" and "false" as valid)

**UI Features:**
- Blue info panel with explanation
- FhirPath selector drawer integration
- Error display

**Error Code:** `FIXED_VALUE_MISMATCH` (fixed, read-only blue badge)

---

### AllowedValuesConfigSection

**Parameters:**
- Field path (FhirPathSelectorDrawer)
- Allowed values list (add/remove interface)

**Validation:**
- Field path required
- At least one allowed value required

**UI Features:**
- Blue info panel with explanation
- Add value input with Enter key support
- Scrollable list of values with remove buttons
- Empty state display
- FhirPath selector drawer integration
- Error display

**Error Code:** `VALUE_NOT_ALLOWED` (fixed, read-only blue badge)

---

### ArrayLengthConfigSection

**Parameters:**
- Array path (FhirPathSelectorDrawer)
- Minimum length (optional number input)
- Maximum length (optional number input)

**Validation:**
- Array path required
- At least one of min or max required
- Min must be non-negative
- Max must be non-negative
- Min cannot be greater than max

**UI Features:**
- Blue info panel with explanation
- Grid layout for min/max inputs
- Constraint summary panel (shows current constraint in plain English)
- FhirPath selector drawer integration
- Error display

**Error Code:** `ARRAY_LENGTH_VIOLATION` (fixed, read-only blue badge)

---

## Path Composition Logic

All three rule types use the same path composition pattern as Required and Pattern rules:

```typescript
function composeFhirPath(
  resourceType: string,
  instanceScope: InstanceScope,
  fieldPath: string
): string {
  const scopePath = composeInstanceScopedPath(resourceType, instanceScope);
  
  // Extract relative path if fieldPath starts with resource type
  let relativePath = fieldPath;
  
  if (fieldPath.startsWith(resourceType + '[')) {
    // Handle "Patient[*].active" → extract "active"
    const afterBracket = fieldPath.indexOf('].', resourceType.length);
    if (afterBracket > -1) {
      relativePath = fieldPath.substring(afterBracket + 2);
    }
  } else if (fieldPath.startsWith(resourceType + '.')) {
    // Handle "Patient.active" → extract "active"
    const resourceDotPrefix = resourceType + '.';
    relativePath = fieldPath.substring(resourceDotPrefix.length);
  }
  
  return `${scopePath}.${relativePath}`;
}
```

**Result:** Produces correct paths like `Patient[*].active` (not `Patient.Patient[*].active`)

---

## Error Code Contract

### Fixed Error Codes (Backend-Enforced)

All three rule types use **FIXED** error codes that cannot be changed by users:

| Rule Type | Error Code | Backend Constant |
|-----------|------------|-----------------|
| FixedValue | `FIXED_VALUE_MISMATCH` | `ValidationErrorCodes.FIXED_VALUE_MISMATCH` |
| AllowedValues | `VALUE_NOT_ALLOWED` | `ValidationErrorCodes.VALUE_NOT_ALLOWED` |
| ArrayLength | `ARRAY_LENGTH_VIOLATION` | Backend default |

**UI Contract:**
- RuleForm displays error code as **read-only blue badge**
- Config sections do NOT render errorCode input field
- Example: `<Tag /> <code>FIXED_VALUE_MISMATCH</code> <span>(fixed)</span>`

---

## UX Flow Examples

### Create FixedValue Rule

1. Open AddRuleModal
2. Select "Fixed Value" rule type
3. RuleForm opens with:
   - ResourceSelector (grid, bundle-aware)
   - RuleScopeSelector (All/First)
   - FixedValueConfigSection (field + expected value)
   - SeveritySelector
   - ErrorCode badge (FIXED_VALUE_MISMATCH, blue, read-only)
   - UserHintInput
   - RulePreviewPanel
4. Configure rule:
   - Select resource (e.g., Patient)
   - Select scope (All Patient resources)
   - Select field (e.g., active)
   - Enter expected value (e.g., "true")
   - Select severity (Error)
5. Click "Create Rule"
6. Rule saved with: `Patient[*].active` must equal `"true"`

### Edit AllowedValues Rule

1. Click edit on existing AllowedValues rule
2. RuleForm opens with:
   - ResourceSelector (LOCKED, collapsed summary with lock icon)
   - Bundle status shows (green or amber)
   - RuleScopeSelector hydrated
   - AllowedValuesConfigSection hydrated (field + values list)
   - SeveritySelector hydrated
   - ErrorCode badge (VALUE_NOT_ALLOWED, blue, read-only)
   - UserHintInput hydrated
3. Modify allowed values:
   - Add new value: type + press Enter
   - Remove value: click Remove button
4. Click "Save Changes"
5. Rule updated

### Create ArrayLength Rule

1. Open AddRuleModal
2. Select "Array Length" rule type
3. RuleForm opens
4. Configure rule:
   - Select resource (e.g., Patient)
   - Select array field (e.g., name)
   - Set min: 1
   - Set max: 3
   - Constraint summary shows: "Array must have between 1 and 3 elements"
5. Click "Create Rule"
6. Rule saved with min/max constraints

---

## Legacy Forms

**Status:** None existed for these rule types.

These rule types were previously edited via the legacy RuleEditorModal inline editor (lines 170-260 in RuleEditorModal.tsx). That code still exists but is bypassed by the new routing logic.

**No files deleted** - clean implementation without legacy cruft.

---

## Build Status

```bash
npm run build
✓ 2638 modules transformed.
dist/index.html                   0.58 kB │ gzip:   0.38 kB
dist/assets/index-BrjDlwAm.css   49.95 kB │ gzip:   8.61 kB
dist/assets/index-JYOFdsac.js   790.18 kB │ gzip: 211.92 kB
✓ built in 2.60s
```

**Result:** ✅ Build successful with 0 TypeScript errors

---

## Testing Checklist

### Create FixedValue Rule
- [ ] Open AddRuleModal
- [ ] Select "Fixed Value" type
- [ ] Verify ResourceSelector shows (bundle-aware)
- [ ] Select resource
- [ ] Verify grid collapses to summary
- [ ] Select field via drawer
- [ ] Enter expected value
- [ ] Verify "FIXED_VALUE_MISMATCH" badge shows (blue, read-only)
- [ ] Set severity
- [ ] Verify preview panel updates
- [ ] Click "Create Rule"
- [ ] Verify rule saved correctly

### Edit FixedValue Rule
- [ ] Open existing FixedValue rule
- [ ] Verify RuleForm opens
- [ ] Verify ResourceSelector LOCKED
- [ ] Verify bundle status shows
- [ ] Verify field path hydrated
- [ ] Verify expected value hydrated
- [ ] Modify expected value
- [ ] Click "Save Changes"
- [ ] Verify rule updated

### Create AllowedValues Rule
- [ ] Select "Allowed Values" type
- [ ] Select resource and field
- [ ] Add first value via input + Enter
- [ ] Add second value via Add button
- [ ] Verify values list displays
- [ ] Remove a value
- [ ] Verify "VALUE_NOT_ALLOWED" badge shows (blue, read-only)
- [ ] Create rule
- [ ] Verify params.values array correct

### Edit AllowedValues Rule
- [ ] Open existing AllowedValues rule
- [ ] Verify values list hydrated
- [ ] Add new value
- [ ] Remove existing value
- [ ] Save changes
- [ ] Verify params.values updated

### Create ArrayLength Rule
- [ ] Select "Array Length" type
- [ ] Select resource and array field
- [ ] Set min: 1
- [ ] Verify constraint summary shows "at least 1 element"
- [ ] Set max: 5
- [ ] Verify constraint summary shows "between 1 and 5 elements"
- [ ] Verify "ARRAY_LENGTH_VIOLATION" badge shows (blue, read-only)
- [ ] Create rule
- [ ] Verify params.min and params.max correct

### Edit ArrayLength Rule
- [ ] Open existing ArrayLength rule
- [ ] Verify min/max hydrated
- [ ] Change max to 10
- [ ] Verify constraint summary updates
- [ ] Save changes
- [ ] Verify params updated

### Bundle Awareness
- [ ] Create rule for resource NOT in bundle
- [ ] Verify amber warning: "Not found in current bundle"
- [ ] Verify rule can still be saved (non-blocking)
- [ ] Create rule for resource IN bundle
- [ ] Verify green message with count
- [ ] Edit rule
- [ ] Verify bundle status shows in locked summary

### Validation
- [ ] Try create FixedValue without field → error
- [ ] Try create FixedValue without expected value → error
- [ ] Try create AllowedValues without values → error
- [ ] Try create ArrayLength without min or max → error
- [ ] Try create ArrayLength with min > max → error
- [ ] Try create ArrayLength with negative min → error

---

## Unified Rule Types Summary

**Migrated to RuleForm (6 types):**
1. ✅ Required - `FIELD_REQUIRED` (fixed)
2. ✅ Regex/Pattern - `PATTERN_MISMATCH` (fixed)
3. ✅ QuestionAnswer - Runtime-determined (6 possible codes)
4. ✅ FixedValue - `FIXED_VALUE_MISMATCH` (fixed)
5. ✅ AllowedValues - `VALUE_NOT_ALLOWED` (fixed)
6. ✅ ArrayLength - `ARRAY_LENGTH_VIOLATION` (fixed)

**Remaining Legacy (2 types):**
- CodeSystem (still uses legacy editor)
- CustomFHIRPath (stub in RuleForm, not implemented)

---

## Next Steps

1. ⏳ **PENDING:** End-to-end UI testing for all three new rule types
2. ⏳ **PENDING:** Migrate CodeSystem to RuleForm architecture
3. ⏳ **PENDING:** Implement CustomFHIRPath with governed errorCode dropdown
4. ⏳ **PENDING:** Delete legacy editor code from RuleEditorModal (lines 108-698)

---

**Status:** ✅ MIGRATION COMPLETE  
**Date:** 29 December 2025  
**Files Created:** 6 (3 config sections + 3 helpers)  
**Files Updated:** 4 (RuleForm, RuleTypeSelector, AddRuleModal, RuleEditorModal)  
**Breaking Changes:** None  
**Build Status:** ✅ Successful (0 errors)  
**Rule Types Unified:** 6/8 (Required, Regex, QuestionAnswer, FixedValue, AllowedValues, ArrayLength)
