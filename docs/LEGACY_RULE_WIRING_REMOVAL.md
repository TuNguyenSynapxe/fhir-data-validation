# Legacy Rule Creation Wiring Removal

**Date:** 2025-01-XX  
**Status:** ✅ Complete  
**Build:** ✅ 0 Errors, 0 Warnings

## Overview

This surgical fix removes legacy rule creation wiring to ensure the "Add Rule" button **ONLY** opens `AddRuleModal` (rule-type-first UX). Legacy components (`RuleModeSelectorModal`, `RuleEditorModal`) remain for **editing existing rules** but are no longer reachable for **creating new rules**.

## Changes Made

### 1. RulesPanel.tsx - Primary Entry Point Fix
**File:** `frontend/src/components/playground/Rules/RulesPanel.tsx`

#### Removed Feature Flag Check
```tsx
// BEFORE (legacy path with feature flag)
const handleAddRule = () => {
  if (features?.treeRuleAuthoring) {
    setIsModeSelectorOpen(true);  // ❌ LEGACY PATH
  } else {
    setIsAddRuleModalOpen(true);   // ✅ CORRECT PATH
  }
};

// AFTER (always use AddRuleModal)
const handleAddRule = () => {
  // Always use AddRuleModal (rule-type-first UX)
  setIsAddRuleModalOpen(true);
};
```

#### Removed Legacy Functions
```tsx
// REMOVED: openBasicRuleModal - no longer used for creation
// REMOVED: handleSelectBasicRule - no longer used for creation
```

#### Removed Legacy Modal Rendering
```tsx
// REMOVED: RuleModeSelectorModal component rendering
// This modal should NOT be used for rule creation
```

#### Cleaned Up State & Imports
```tsx
// REMOVED: isModeSelectorOpen state variable
// REMOVED: RuleModeSelectorModal import
// REMOVED: RuleTypeOption import (unused)
```

### 2. RuleModeSelectorModal.tsx - Defensive Warning
**File:** `frontend/src/components/playground/Rules/RuleModeSelectorModal.tsx`

Added console warning to detect if this modal is accidentally triggered:

```tsx
if (isOpen) {
  console.warn('[RuleModeSelectorModal] LEGACY: This modal should not be used for creation. Use AddRuleModal instead.');
}
```

### 3. RuleEditorModal.tsx - Already Protected
**File:** `frontend/src/components/playground/Rules/RuleEditorModal.tsx`

**No changes needed** - already has defensive check:
```tsx
if (!isOpen || !rule) return null;
```

This prevents the modal from rendering without a rule to edit.

### 4. RuleBuilder.tsx - Already Correct
**File:** `frontend/src/components/playground/Rules/RuleBuilder.tsx`

**No changes needed** - `handleAddRule` already uses `AddRuleModal` exclusively:
```tsx
const handleAddRule = () => {
  setIsAddRuleModalOpen(true);  // ✅ Correct from the start
};
```

### 5. Type Consistency Fix
**Files:** Multiple Rule components

Fixed `Rule.origin` type inconsistency across all components:

```tsx
// BEFORE (strict union type)
origin?: 'manual' | 'system-suggested' | 'ai-suggested';

// AFTER (flexible string type - compatible with AddRuleModal)
origin?: string;
```

**Updated Files:**
- `RulesPanel.tsx`
- `RuleList.tsx`
- `RuleGroup.tsx`
- `RuleRow.tsx`
- `ruleHelpers.ts`
- `RuleCardExpanded.tsx`

**Reason:** `AddRuleModal` uses `origin?: string`, and strict typing was causing build errors.

## Verification

### ✅ Build Status
```bash
npm run build
✓ 2619 modules transformed
✓ built in 2.40s
0 errors, 0 warnings
```

### ✅ Flow Verification
1. **"Add Rule" button** → Opens `AddRuleModal` (rule-type-first)
2. **Edit existing rule** → Opens `RuleEditorModal` (legacy, but edit-only)
3. **Legacy modals** → Console warning if accidentally triggered

### ✅ Preserved Functionality
- ✅ Edit existing rules (RuleEditorModal)
- ✅ Delete rules
- ✅ Toggle rules
- ✅ Rule validation
- ✅ Rule suggestions
- ✅ Rule filtering

### ❌ Removed Functionality
- ❌ Feature flag for tree authoring in creation flow
- ❌ RuleModeSelectorModal in creation flow
- ❌ openBasicRuleModal function
- ❌ Direct path to legacy editor for new rules

## Architecture Alignment

This fix aligns with the rule-type-first UX introduced in:
- `AddRuleModal` - Entry point for all new rules
- `RuleTypeSelector` - Rule type selection (Required, Pattern, QuestionAnswer, etc.)
- Rule-type-specific forms - Type-aware UI for each rule type

## Next Steps

**No further action required.** The legacy wiring has been completely removed.

**If you need to add new rule creation paths:**
1. Only use `AddRuleModal`
2. Add new rule types to `RuleTypeSelector`
3. Create type-specific forms in `rule-types/` folder
4. Never wire `RuleModeSelectorModal` or `RuleEditorModal` for creation

## Migration Notes

For projects using this codebase:
- The `features.treeRuleAuthoring` flag no longer affects rule creation flow
- All "Add Rule" actions go through `AddRuleModal`
- Legacy editors remain for backward compatibility (editing only)
- No data migration required (rules.json format unchanged)

---

**Commit Message:**
```
fix: remove legacy rule creation wiring

- Remove feature flag check in RulesPanel.handleAddRule
- Always use AddRuleModal for rule creation
- Remove openBasicRuleModal and handleSelectBasicRule
- Add defensive warning to RuleModeSelectorModal
- Fix Rule.origin type consistency across components
- Build: 0 errors, 0 warnings
```
