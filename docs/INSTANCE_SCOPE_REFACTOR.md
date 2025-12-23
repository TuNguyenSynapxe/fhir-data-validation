# Instance Scope Refactor - Phase 4

**Status:** ✅ Complete  
**Date:** 23 December 2025  
**Commit:** `5547865`

## Overview

Refactored instance scope selection from simple FHIRPath node picker to a structured, drawer-based selector with smart filtering capabilities.

## Architecture

### Previous Approach (Phase 3)
- Radio buttons: All instances [*] / First only [0]
- FhirPathPicker node mode for direct path selection
- Manual path composition

### New Approach (Phase 4)
- **Structured model** - Discriminated union type system
- **Smart filtering** - Auto-detect patterns from sample bundle
- **Drawer-based UX** - Best-practice guided selection
- **No free-text** - Visual selection only (default)

## New Components

### 1. InstanceScope.types.ts
Structured type system for instance scoping:

```typescript
type InstanceScope =
  | { kind: 'first' }
  | { kind: 'all' }
  | { kind: 'filter'; filter: FilterSpec };

type FilterSpec =
  | { type: 'code'; code: string }
  | { type: 'systemCode'; system: string; code: string }
  | { type: 'identifier'; system: string; value: string }
  | { type: 'custom'; fhirPath: string };
```

### 2. InstanceScope.utils.ts
Utilities for FHIRPath composition and validation:

```typescript
// Generate FHIRPath from scope
composeInstanceScopedPath(resourceType, instanceScope)
// Examples:
// - first → Patient[0]
// - all → Patient[*]
// - filter(code) → Patient.where(code.coding.code='HS')

// Get human-readable summary
getInstanceScopeSummary(resourceType, instanceScope)
// Returns: { text: "All Patient resources", fhirPath: "Patient[*]" }

// Validate filter specs
validateFilterSpec(resourceType, filter)
```

### 3. BundleAnalysis.utils.ts
Smart bundle analysis for filter suggestions:

```typescript
detectFilterOptions(bundle, resourceType)
// Auto-detects:
// - code.coding.code patterns
// - code.coding.system + code patterns
// - identifier.system + value patterns
// Returns: DetectedFilterOption[]
```

**Example Output:**
```typescript
[
  {
    id: "code-HEARING",
    label: "Code = \"HEARING\"",
    description: "Filter by code.coding.code (3 instances)",
    filterSpec: { type: 'code', code: 'HEARING' },
    count: 3
  },
  {
    id: "systemcode-http://...-HS",
    label: "http://loinc.org#HS",
    description: "Filter by system + code (2 instances)",
    filterSpec: { type: 'systemCode', system: '...', code: 'HS' },
    count: 2
  }
]
```

### 4. InstanceScopeDrawer.tsx
Reusable drawer component for instance scope selection.

**Features:**
- Radio options: First only, All instances, Filter
- Default: All instances
- Smart filter suggestions from bundle
- Custom filter via FhirPathPicker (filter mode)
- Live preview of FHIRPath
- Auto-reset on resource type change

**Props:**
```typescript
interface InstanceScopeDrawerProps {
  isOpen: boolean;
  resourceType: string;
  bundle: any;
  value?: InstanceScope;
  onChange: (scope: InstanceScope) => void;
  onClose: () => void;
}
```

## Updated Components

### RequiredRuleForm.tsx
- Replaced `scopePath` string with `instanceScope` structured type
- Added `useEffect` to reset scope on resource type change
- Shows summary: "All Patient resources" / "First Observation only"
- Displays FHIRPath: `Patient[*]` / `Observation[0]`

### RequiredRuleHelpers.ts
- Updated `RequiredRuleData` interface to use `InstanceScope`
- Uses `composeInstanceScopedPath()` utility
- Supports all scope types: first/all/filter

## User Flow

### 1. Default State
User opens RequiredRuleForm:
- Instance Scope: **All Patient resources** (`Patient[*]`)
- Click to change

### 2. Open Drawer
User clicks "All Patient resources" button:
- Drawer slides in from right
- Shows 3 radio options:
  - ✅ All instances (default)
  - ⚪ First instance only
  - ⚪ Filter by condition

### 3. Change to First Only
User selects "First instance only":
- Preview updates: "First Patient only" (`Patient[0]`)
- Click Apply
- Summary updates in form

### 4. Select Filter
User selects "Filter by condition":
- Drawer analyzes sample bundle
- Shows detected patterns:
  - ⚪ Code = "HEARING" (3 instances)
  - ⚪ http://loinc.org#HS (2 instances)
- User selects pattern
- Preview shows: "Patient filtered by code = HEARING"
- FHIRPath: `Patient.where(code.coding.code='HEARING')`

### 5. Custom Filter
User clicks "Create custom filter":
- FhirPathPicker opens in filter mode
- User selects field from tree
- User enters operator and value
- Returns to drawer with custom filter
- Apply updates form

### 6. Resource Type Change
User changes resource type from Patient to Observation:
- Instance scope **auto-resets** to "All Observation resources"
- Any filter is cleared
- Prevents invalid cross-resource filters

## FHIRPath Composition Examples

| Scope | Resource | Field | Final FHIRPath |
|-------|----------|-------|----------------|
| All | Patient | name.given | `Patient[*].name.given` |
| First | Patient | name.given | `Patient[0].name.given` |
| Filter (code) | Observation | value[x] | `Observation.where(code.coding.code='HEARING').value[x]` |
| Filter (custom) | Patient | identifier | `Patient.where(...).identifier` |

## Benefits

✅ **Best-practice UX** - Default to "all instances" with clear options  
✅ **Bundle-guided** - Auto-detect common filter patterns  
✅ **No free-text** - Visual selection prevents syntax errors  
✅ **Type-safe** - Discriminated unions catch errors at compile time  
✅ **Reusable** - Works for all rule types  
✅ **Smart defaults** - Auto-reset on resource type change  
✅ **Backward compatible** - No backend changes required  

## Technical Details

### Type Safety
All scope types are discriminated unions:
```typescript
function handleScope(scope: InstanceScope) {
  switch (scope.kind) {
    case 'first':
      // TypeScript knows: no filter property
      return `${resourceType}[0]`;
    case 'all':
      return `${resourceType}[*]`;
    case 'filter':
      // TypeScript knows: filter property exists
      return composeFilter(scope.filter);
  }
}
```

### Bundle Analysis
Pattern detection counts instances:
```typescript
// Sample: 3 Observations with code = "HEARING"
// Detection: { code: "HEARING", count: 3 }
// UI: "Filter by code = HEARING (3 instances)"
// FHIRPath: "Observation.where(code.coding.code='HEARING')"
```

### Validation
Filters are validated before saving:
```typescript
validateFilterSpec(resourceType, filter)
// - Code filters must have code value
// - SystemCode filters must have both system and code
// - Identifier filters must have both system and value
// - Custom filters must start with "where("
```

## Migration Path

### Existing Rules
No changes needed - backend contract unchanged.  
Rules still use `rule.fhirPath` string.

### Other Rule Types
Pattern/Regex/QuestionAnswer rules can adopt InstanceScopeDrawer:
```typescript
// Same component, different rule type
<InstanceScopeDrawer
  resourceType="Observation"
  bundle={projectBundle}
  value={instanceScope}
  onChange={handleScopeChange}
  onClose={onClose}
/>
```

## Files Created

1. `InstanceScope.types.ts` (47 lines) - Type definitions
2. `InstanceScope.utils.ts` (166 lines) - Utilities
3. `BundleAnalysis.utils.ts` (179 lines) - Bundle analysis
4. `InstanceScopeDrawer.tsx` (310 lines) - Drawer component

**Total:** 702 lines of new code

## Files Modified

1. `RequiredRuleForm.tsx` - Uses InstanceScopeDrawer
2. `RequiredRuleHelpers.ts` - Updated to InstanceScope model

## Testing Checklist

- [x] TypeScript compilation successful
- [ ] Manual testing: All instances (default)
- [ ] Manual testing: First instance only
- [ ] Manual testing: Filter with auto-detected pattern
- [ ] Manual testing: Custom filter
- [ ] Manual testing: Resource type change resets scope
- [ ] Integration: Rule creation with each scope type
- [ ] Edge case: Empty bundle (no patterns detected)
- [ ] Edge case: Invalid filter spec

## Next Steps

1. **Manual UI testing** - Verify drawer UX
2. **Bundle analysis testing** - Verify pattern detection
3. **Filter validation testing** - Ensure invalid filters are caught
4. **Other rule types** - Migrate Pattern/Regex rules
5. **Documentation** - Update user guide

---

**Status:** ✅ Build successful, ready for testing
