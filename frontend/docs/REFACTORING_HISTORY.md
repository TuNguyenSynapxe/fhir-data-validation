# Refactoring History

Chronological record of all major frontend refactoring initiatives.

## Overview

This document tracks significant architectural changes, structural refactors, and UI improvements to the FHIR Processor V2 frontend. Each entry includes motivation, changes, and outcomes.

---

## Phase-3: Validation Context Introduction

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Safe Structural Refactor (Zero Behavior Change)

### Objective
Eliminate validation prop drilling through component hierarchy by introducing React Context API.

### Problem
After Phase-2B prop grouping, validation props still required drilling through:
- PlaygroundPage → RightPanelContainer → RightPanel → ValidationPanel/OverviewPanel/ValidationContextBar

This created unnecessary coupling and made validation state changes fragile.

### Solution
**`ProjectValidationContext`** (131 lines):
- Created Context Provider that receives validation values from parent
- Provider wraps validation subtree only (RightPanelContainer + children)
- Child components consume context via `useProjectValidationContext()` hook

**Pattern**:
```typescript
// PlaygroundPage.tsx (parent owns validation lifecycle)
const validationHook = useProjectValidation(projectId, {
  bundleJson,
  rulesJson,
  codeMasterJson
});

return (
  <ProjectValidationProvider value={validationHook}>
    <RightPanelContainer {...otherProps} />
  </ProjectValidationProvider>
);

// ValidationPanel.tsx (child consumes via context)
const { result, isValidating, runValidation } = useProjectValidationContext();
```

### Changes Made
**Files Created**:
- `contexts/project-validation/ProjectValidationContext.tsx` (131 lines)

**Files Modified**:
- `components/playground/Validation/ValidationPanel.tsx` - Uses context instead of props
- `components/common/ValidationContextBar.tsx` - Uses context for runValidation
- `components/playground/Overview/OverviewPanel.tsx` - Uses context for validationResult
- `components/common/RightPanel.tsx` - Removed validation prop
- `components/common/RightPanelContainer.tsx` - Removed validation prop
- `types/rightPanelProps.ts` - Updated NavigationProps, deprecated ValidationProps

### Results
✅ **100% elimination of validation prop drilling**  
✅ Zero behavior change confirmed  
✅ Build succeeds (595KB bundle)  
✅ TypeScript strict mode satisfied  

### Architecture Decision
**Why Provider receives values instead of calling hook internally**:
- Parent (PlaygroundPage) needs `validationResult` to compute derived state (`useValidationState`)
- Provider pattern allows parent to control lifecycle while children consume via context
- Avoids "rules of hooks" violations and duplicate state

---

## Phase-2B: Prop Grouping Refactor

**Date**: 19 December 2025  
**Status**: ✅ Complete  
**Type**: Safe Structural Refactor (Zero Behavior Change)

### Objective
Reduce prop explosion by 86% through semantic prop grouping.

### Problem
- RightPanelContainer received **70+ individual flat props**
- RightPanel forwarded **60+ individual flat props**
- Flat prop surface was fragile and difficult to maintain
- Changes propagated dangerously across 3 component layers
- Poor readability and unclear ownership boundaries

### Solution
Created **10 semantic prop group interfaces** in `types/rightPanelProps.ts`:

1. **ModeControlProps** (5 props) - Mode/tab navigation
2. **ValidationProps** (9 props) - Validation lifecycle
3. **RulesProps** (6 props) - Rules management
4. **CodeMasterProps** (5 props) - CodeMaster editor
5. **ValidationSettingsProps** (5 props) - Settings editor
6. **MetadataProps** (1 prop) - Project metadata
7. **BundleProps** (5 props) - FHIR bundle data
8. **NavigationProps** (2 props) - Navigation callbacks
9. **UIStateProps** (2 props) - UI state
10. **FeatureFlagsProps** (3 props) - Feature flags

### Changes Made
**Files Created**:
- `types/rightPanelProps.ts` (180 lines) - New type definitions

**Files Modified**:
- `components/common/RightPanelContainer.tsx` - Interface simplified to 10 grouped props
- `components/common/RightPanel.tsx` - Interface simplified to 10 grouped props
- `pages/PlaygroundPage.tsx` - Call site restructured with grouped objects

### Results
**Metrics**:
- **Before**: 70+ flat props across 3 layers
- **After**: 10 grouped prop objects
- **Reduction**: 86% fewer top-level props

**Validation**:
✅ TypeScript compilation: PASSED  
✅ Vite build: SUCCESS (595KB bundle)  
✅ Behavior change: ZERO  
✅ Regression risk: LOW  

### Benefits
- Clearer ownership boundaries (validation vs rules vs bundle)
- Improved maintainability (changes isolated to semantic groups)
- Better readability (grouped interfaces reveal intent)
- Reduced fragility (fewer prop changes across layers)

---

## Phase-1B: ValidationPanel Controlled Component

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Safe Structural Refactor (Zero Behavior Change)

### Objective
Convert ValidationPanel from stateful component to controlled component, eliminating duplicate validation logic.

### Problem
- ValidationPanel maintained local validation state (`result`, `isValidating`, `error`)
- ValidationPanel made direct API calls to `/api/projects/:id/validate`
- PlaygroundPage also maintained validation state via `useProjectValidation` hook
- **Duplicate state = potential desync** between parent and child

### Solution
Removed all internal state and API calls from ValidationPanel:
- Deleted 75 lines (local state + useEffect + API integration)
- Converted to fully controlled component receiving props:
  - `validationResult` (from parent)
  - `isValidating` (from parent)
  - `validationError` (from parent)
  - `onRunValidation` (callback to parent's hook)

### Changes Made
**Files Modified**:
- `components/playground/Validation/ValidationPanel.tsx` - Removed 75 lines, now controlled
- `components/common/RightPanel.tsx` - Updated props interface
- `components/common/RightPanelContainer.tsx` - Updated props interface
- `pages/PlaygroundPage.tsx` - Passes validation state from `useProjectValidation` hook

### Results
✅ **Single source of truth** for validation state (PlaygroundPage's `useProjectValidation` hook)  
✅ No more duplicate validation logic  
✅ Eliminated desync risk  
✅ Cleaner separation of concerns  
✅ Zero behavior change  

---

## Phase-1A: Bundle Analysis Service & Validation Hook

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Safe Structural Refactor (Zero Behavior Change)

### Objective
Extract bundle analysis logic and validation lifecycle into reusable, testable modules.

### Problem
- Bundle analysis logic embedded in RulesPanel component (UI + business logic mixed)
- Validation lifecycle scattered across multiple components
- No single source of truth for validation state
- Difficult to test business logic (coupled to React components)

### Solution

#### 1. Bundle Analysis Service
Created `services/bundleAnalysisService.ts` (120 lines):
- **Pure functions** for FHIR bundle analysis
- Zero dependencies (fully testable)
- Key functions:
  - `analyzeFhirBundle()` - Extracts resource types, counts, paths
  - `isRulePathObserved()` - Checks if rule path exists in bundle
  - `collectPathsFromResource()` - Recursively collects all paths

**Unit Tests**: `services/__tests__/bundleAnalysisService.test.ts` (12 test cases)

#### 2. Validation Lifecycle Hook
Created `contexts/project-validation/useProjectValidation.ts` (186 lines):
- **Centralized validation lifecycle** management
- API integration: `POST /api/projects/:id/validate`
- State: `result`, `isValidating`, `error`, `trigger`
- Actions: `runValidation()`, `setResult()`, `clearError()`, `triggerValidation()`

**Used by**: PlaygroundPage (single source of truth for validation)

### Changes Made
**Files Created**:
- `services/bundleAnalysisService.ts` (120 lines)
- `services/__tests__/bundleAnalysisService.test.ts` (12 test cases)
- `contexts/project-validation/useProjectValidation.ts` (186 lines)

**Files Modified**:
- `components/playground/Rules/RulesPanel.tsx` - Uses bundleAnalysisService
- `pages/PlaygroundPage.tsx` - Integrated useProjectValidation hook

### Results
✅ Business logic separated from UI  
✅ 100% test coverage for bundle analysis  
✅ Single source of truth for validation  
✅ Reusable across components  
✅ Zero behavior change  

---

## Validation Labeling Refactor

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Frontend-Only UI Improvement (Zero Backend Change)

### Objective
Eliminate user confusion between validation sources through clear, consistent labeling.

### Problem
- Reference errors labeled "Project Rule" → users thought they created them
- HL7 advisories looked blocking → users treated them as errors
- No clear way to distinguish "Did I create this?"
- Inconsistent terminology ("rule" used for non-rules)

### Solution
Updated validation source metadata in `utils/validationLayers.ts`:

| Source | Display Label | Badge Color | Blocking |
|--------|---------------|-------------|----------|
| LINT | Lint (Best-effort) | Yellow | NO |
| SPEC_HINT | HL7 Advisory | Blue | NO |
| FHIR | FHIR Structural Validation | Red | YES |
| Reference | Reference Validation | Rose | YES |
| PROJECT | Project Rule | Purple | YES |
| CodeMaster | Code System Validation | Orange | YES |

### Changes Made
**Files Modified**:
- `utils/validationLayers.ts` - Updated all source metadata with clear labels
- `components/playground/Validation/ValidationLayerInfo.tsx` - Added tooltip legend
- `components/playground/Validation/GroupedErrorCard.tsx` - Updated header format to `[Label] — [Error Code] ([Count])`

**Existing Components (Already Correct)**:
- `ErrorCard.tsx` - Already displays blocking indicators
- `ValidationPanel.tsx` - Already has ValidationLayerInfo icon

### Results
✅ Each validation source has distinct, clear label  
✅ Reference validation explicitly states "This is not a rule"  
✅ Blocking status always visible (YES/NO badges)  
✅ Group headers lead with source label  
✅ Help tooltip explains all sources with examples  
✅ Zero backend changes  

---

## Rule Editor Alignment with Backend

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Frontend-Backend Alignment

### Objective
Align Rule Editor UI with backend `FhirPathRuleEngine` to prevent misconfigured rules.

### Problem
- UI offered rule types NOT supported by backend (Pattern, ValueSet, Range, Length, Custom)
- No parameter input fields for rule types requiring parameters
- Users could save incomplete rules (missing required params)
- Backend would silently skip misconfigured rules
- Mismatch between UI rule type names and backend expectations

### Solution
Strict frontend-backend alignment:
1. **Rule types list matches backend exactly** (casing, naming)
2. **Conditional parameter fields** render based on rule type
3. **Frontend validation** prevents saving invalid rules
4. **Save button disabled** when required params missing
5. **Inline error messages** guide users to fix issues

### Changes Made
**Files Modified**:
- `components/playground/Rules/RuleEditorModal.tsx` - Complete refactor

**Rule Types Aligned**:
- ✅ Required
- ✅ FixedValue (+ parameter: expectedValue)
- ✅ AllowedValues (+ parameter: allowedValues[])
- ✅ Regex (+ parameter: pattern)
- ✅ ArrayLength (+ parameters: min, max)
- ✅ CodeSystem (+ parameter: systemUri)
- ✅ CustomFHIRPath (+ parameter: expression)

**Removed** (not supported by backend):
- ❌ Pattern
- ❌ ValueSet
- ❌ Range
- ❌ Length
- ❌ Custom

### Results
✅ UI exactly matches backend capabilities  
✅ Users cannot create misconfigured rules  
✅ Frontend validation prevents incomplete rules  
✅ Clear error messages guide correct usage  

---

## Validation State Machine Implementation

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Centralized State Model

### Objective
Introduce central ValidationState model for validation readiness lifecycle.

### Solution
Created `types/validationState.ts` with state machine:

**States**:
- `NoBundle` - No bundle data present
- `NotValidated` - Bundle exists but not validated (or changed since validation)
- `Validated` - Validation passed (no blocking errors)
- `Failed` - Validation failed (has blocking errors)

**Transitions**:
```
NoBundle → NotValidated (bundle loaded)
NotValidated → Validated (validation passes)
NotValidated → Failed (validation fails)
Validated → NotValidated (bundle/rules change)
Failed → NotValidated (bundle/rules change)
```

### Implementation
**Files Created**:
- `types/validationState.ts` - State constants and metadata interface
- `hooks/useValidationState.ts` - Derivation logic and React hook

**Key Function**:
```typescript
const { state, metadata } = useValidationState(
  bundleJson,
  validationResult,
  bundleChanged,
  rulesChanged
);
```

**Used By**:
- ValidationPanel (display logic based on state)
- PlaygroundPage (derived state for UI decisions)

### Results
✅ Single authoritative source for validation status  
✅ Clear state transitions  
✅ Metadata includes error counts, breakdown by source  
✅ Simplifies UI logic  

---

## Tree-Based Rule Creation

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Major Feature Implementation

### Objective
Enable visual, tree-based rule creation with path navigation and observed value suggestions.

### Features Implemented
1. **Tree view of FHIR bundle structure**
2. **Expandable nodes** with observed values
3. **Intent-based rule creation** (Required, ArrayLength, CodeSystem, AllowedCodes)
4. **Preview before apply** workflow
5. **Observed value badges** (green indicators)
6. **Path navigation** from tree to bundle

### Components Created
- `components/playground/Rules/TreeRuleCreation/` (multiple components)
- Intent system with preview/apply workflow
- Integration with bundleAnalysisService for observed paths

### Results
✅ Intuitive visual rule creation  
✅ Data-driven suggestions  
✅ Prevents invalid rule configurations  
✅ Smooth UX with preview step  

---

## Terminology Rules Implementation

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Feature Enhancement

### Objective
Allow users to constrain coding fields based on observed values in sample data.

### Rule Types Added
- **CODE_SYSTEM** - Constrain `coding.system` to specific URI
- **ALLOWED_CODES** - Constrain `coding.code` to list of allowed codes

### Core Principle
> "Terminology rules are inferred from data but enforced by intent."

### Workflow
```
Backend analyzes bundle
  ↓
Extracts terminology values
  ↓
Frontend displays in tree nodes
  ↓
User selects constraints
  ↓
Creates RuleIntent
  ↓
Preview → Apply
  ↓
Backend generates Draft rule
```

### Results
✅ Observed terminology values presented to users  
✅ Intent-first design prevents misconfiguration  
✅ Backend validation ensures correctness  

---

## Non-Blocking Warnings Implementation

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Validation Enhancement

### Objective
Separate blocking errors from non-blocking warnings in validation results.

### Changes
- Added `blocking: boolean` flag to validation errors
- Updated UI to distinguish errors vs warnings
- Validation state considers only blocking errors for `Failed` state

### Results
✅ Users can proceed with non-blocking warnings  
✅ Clear visual distinction (red vs yellow borders)  
✅ Blocking status shown on each error card  

---

## Array Length Validation

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Feature Enhancement

### Objective
Enable validation of array lengths with min/max constraints.

### Implementation
- Rule type: `ArrayLength`
- Parameters: `min`, `max` (optional)
- Frontend UI: Number inputs for min/max
- Backend validation: Checks array lengths against constraints

### Results
✅ Users can enforce cardinality rules  
✅ Clear error messages when violated  

---

## Validated State Enhancements

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: State Management Enhancement

### Objective
Improve validation state persistence and change detection.

### Changes
- Track original bundle/rules JSON for change detection
- Persist validation results in localStorage
- Clear "stale" results when bundle/rules change

### Results
✅ Accurate change detection  
✅ Validation results survive page refresh  
✅ Users always know if validation is current  

---

## Coverage Demo

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Demo/Prototype Page

### Objective
Demonstrate validation coverage visualization.

### Implementation
- Route: `/coverage-demo`
- Component: `pages/CoverageDemo.tsx`
- Registered in `AppRouter.tsx`

### Results
✅ Standalone demo page for coverage visualization  
✅ Not intended for production use  

---

## Lint Demo

**Date**: December 2025  
**Status**: ✅ Complete  
**Type**: Demo/Prototype Page

### Objective
Demonstrate lint explainability panel.

### Implementation
- Route: `/lint-demo`
- Component: `pages/LintDemoPage.tsx`
- Registered in `AppRouter.tsx`

### Results
✅ Standalone demo page for lint UI  
✅ Not intended for production use  

---

## Summary

**Total Major Refactors**: 13  
**Total Lines Added**: ~1000 (new services, hooks, types)  
**Total Lines Removed**: ~150 (duplicate logic, old patterns)  
**Net Impact**: More maintainable, testable, and type-safe codebase  

**Key Principles Across All Refactors**:
1. **Zero behavior change** (unless explicitly adding features)
2. **Separation of concerns** (UI vs business logic)
3. **Single source of truth** (centralized state)
4. **Type safety** (strict TypeScript)
5. **Testability** (pure functions, clear interfaces)
6. **Progressive enhancement** (backwards compatible)

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Current frontend structure
- [VALIDATION_FLOW.md](./VALIDATION_FLOW.md) - Validation pipeline details
- [features/](./features/) - Feature-specific implementation guides
