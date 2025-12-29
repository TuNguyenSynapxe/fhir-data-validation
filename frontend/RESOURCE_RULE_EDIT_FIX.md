# Resource Rule Edit Mode Fix

## Issue
Resource rule editing was not routed to the unified RuleForm, causing edit mode to show outdated UI instead of the new refactored UI with ResourceSelector and ResourceFilterDrawer.

## Root Cause
RuleEditorModal.tsx line 83 was missing 'Resource' in the list of rule types that should be routed to RuleForm for edit mode.

## Fix Applied

**File:** `RuleEditorModal.tsx`

**Before:**
```typescript
if (rule && ['Required', 'Regex', 'QuestionAnswer', 'FixedValue', 'AllowedValues', 'ArrayLength', 'CustomFHIRPath', 'RequiredResources'].includes(rule.type)) {
```

**After:**
```typescript
if (rule && ['Required', 'Regex', 'QuestionAnswer', 'FixedValue', 'AllowedValues', 'ArrayLength', 'CustomFHIRPath', 'RequiredResources', 'Resource'].includes(rule.type)) {
```

Also updated the type cast:
```typescript
ruleType={rule.type as 'Required' | 'Regex' | 'QuestionAnswer' | 'FixedValue' | 'AllowedValues' | 'ArrayLength' | 'CustomFHIRPath' | 'RequiredResources' | 'Resource'}
```

## Result ✅

- Edit mode now uses RuleForm with mode="edit"
- Shows same UI as create mode (ResourceSelector icon grid, ResourceFilterDrawer, summary chips, bundle awareness)
- Hydration works via parseResourceRule (existing requirements are loaded correctly)
- No UI differences between create and edit (consistent with unified architecture)
- Build succeeds with 0 errors

## Architecture Compliance

✅ **Create & Edit use SAME experience**  
✅ **No mode-specific UI branching** (only semantic locking, e.g., resource type immutable)  
✅ **All rules routed through unified RuleForm**  

## Files Changed
1. `/frontend/src/components/playground/Rules/RuleEditorModal.tsx` - Added 'Resource' to unified routing

## Testing
1. Create a Resource rule → Save
2. Edit the saved Resource rule
3. Verify UI shows:
   - ResourceSelector (icon-based, collapsed with Change button)
   - Summary chips ("Exactly 3 Observation · filter details")
   - Bundle awareness ("In bundle: X")
   - ResourceFilterDrawer for filter editing (not inline form)
4. Verify changes save correctly

## Date
29 December 2025
