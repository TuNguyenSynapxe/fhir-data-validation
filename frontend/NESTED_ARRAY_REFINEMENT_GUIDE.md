# Nested Array Path Refinement - Implementation Guide

## Overview

The Path Refinement UX now supports nested arrays (e.g., `address[].line[]`), allowing users to configure refinement for each array level independently with a stacked scope selector interface.

## Features Implemented

### 1. Array Layer Detection

**Utility Module:** `src/utils/arrayPathDetection.ts`

Detects array segments in FHIRPath expressions using:
- Known FHIR array fields (identifier, name, telecom, address, line, etc.)
- Heuristic pattern matching (plural words)

**Functions:**
- `detectArrayLayers(basePath)` - Returns array of detected layers
- `hasNestedArrays(basePath)` - Boolean check for nested arrays
- `getArrayNestingDepth(basePath)` - Returns nesting depth
- `exceedsMaxNestingDepth(basePath)` - Checks if depth > 2

**Example:**
```typescript
const path = "Patient.address.line.extension";
const layers = detectArrayLayers(path);
// Returns: [
//   { segment: "address", position: 0, pathToArray: "address", remainingPath: "line.extension" },
//   { segment: "line", position: 1, pathToArray: "address.line", remainingPath: "extension" }
// ]
```

### 2. Extended Type System

**Type Module:** `src/types/fhirPathRefinement.ts`

**New Types:**
```typescript
interface ArrayLayerRefinement {
  segment: string;           // "address", "line", etc.
  mode: RefinementMode;      // 'first' | 'all' | 'index' | 'filter'
  indexValue?: number;       // For 'index' mode
  filterCondition?: FilterCondition; // For 'filter' mode
}

interface NestedArrayRefinementConfig {
  layers: ArrayLayerRefinement[]; // Parent-to-child order
}
```

### 3. Nested Array FHIRPath Builder

**Function:** `buildNestedArrayRefinedPath(basePath, config)`

Generates valid FHIRPath with per-layer refinement applied sequentially.

**Examples:**

```typescript
// Example 1: Filter parent, all children
basePath = "address.line"
config = {
  layers: [
    { segment: "address", mode: "filter", filterCondition: { property: "use", operator: "equals", value: "home" } },
    { segment: "line", mode: "all" }
  ]
}
// Output: "address.where(use='home').line[*]"

// Example 2: Index parent, filter child
basePath = "address.line"
config = {
  layers: [
    { segment: "address", mode: "index", indexValue: 0 },
    { segment: "line", mode: "filter", filterCondition: { property: "text", operator: "contains", value: "Street" } }
  ]
}
// Output: "address[0].line.where(text.contains('Street'))"

// Example 3: All parent, index child
basePath = "address.line"
config = {
  layers: [
    { segment: "address", mode: "all" },
    { segment: "line", mode: "index", indexValue: 1 }
  ]
}
// Output: "address[*].line[1]"
```

### 4. Human-Readable Intent Generator

**Function:** `generateNestedArrayIntent(config)`

Converts technical refinement config into natural language.

**Examples:**
```typescript
// "Applies to all lines for home addresses"
// "Applies to first line of all addresses"
// "Applies to second address only"
// "Applies to lines where text contains 'Street' for work addresses"
```

### 5. Nested Array Refinement UI

**Component:** `NestedArrayRefinementBuilder.tsx`

Stacked scope selector with:
- One collapsible section per array level
- Top-down order (parent first)
- Parent-to-child resolution constraint
- Per-layer mode selector (all/index/filter)
- Conditional inputs (index value, filter builder)

**Constraints Enforced:**
- ✅ Parent must be resolved before child (not 'first' mode)
- ✅ Disabled child sections until parent configured
- ✅ Each level has exactly one mode
- ✅ No skipping levels

### 6. Enhanced FhirPathRefinementPanel

**Component:** `FhirPathRefinementPanel.tsx`

**Enhancements:**
- Automatic nested array detection
- Switches between single-array and nested-array UI
- Depth limit detection (max 2 levels)
- Human-readable intent preview (green box)
- Show/Hide raw FHIRPath toggle
- Manual mode fallback for complex cases

**UI Modes:**

**Standard Mode (Single Array):**
- Base path display
- Mode selector (first/all/index/filter)
- Conditional inputs

**Nested Mode (2 Array Levels):**
- Base path display
- Blue notice: "Nested Array Detected"
- Stacked scope selector
- Intent preview (green box)
- Optional raw FHIRPath display

**Manual Mode (Depth > 2):**
- Warning banner: "Nesting Too Deep"
- Builder disabled
- Manual textarea input
- No validation

### 7. Toggle Features

**Show Raw Path:**
- Hidden by default to reduce cognitive load
- Toggle button: "Show Raw Path" / "Hide Raw Path"
- Displays generated FHIRPath in gray box
- Only visible in builder mode (not manual)

**Manual Mode:**
- Toggle button: "Manual Mode →" / "← Back to Builder"
- Forced on when nesting depth > 2
- Allows direct FHIRPath editing
- No validation or assistance

## Usage Examples

### Example 1: Simple Nested Array (Patient.address.line)

**Scenario:** User selects path `Patient.address.line` from tree view

**UI Flow:**
1. Base path displayed: `address.line`
2. Blue notice: "Nested Array Detected - This path contains 2 array levels"
3. Two stacked sections appear:
   - **Parent Array: address** (expanded by default)
   - **Child Array: line** (collapsed, disabled until parent resolved)

**User Action 1:** Set address to "Filter where use='home'"
- Child section becomes enabled
- Intent preview: "Applies to first line for addresses where use='home'"

**User Action 2:** Set line to "All elements [*]"
- Intent preview: "Applies to all lines for addresses where use='home'"
- Generated path: `address.where(use='home').line[*]`

### Example 2: Index-Based Selection (Patient.name.given)

**Scenario:** User wants "First given name of second name entry"

**UI Flow:**
1. Base path: `name.given`
2. Parent Array: name → Set to "Index [1]" (second name)
3. Child Array: given → Set to "Index [0]" (first given name)
4. Intent: "Applies to 0th given for 1st name"
5. Generated: `name[1].given[0]`

### Example 3: Depth Limit Exceeded (Patient.entry.resource.address.line)

**Scenario:** Path has 3+ array levels

**UI Flow:**
1. Orange warning banner: "Nesting Too Deep - This path has 3 nested array levels. The builder supports up to 2 levels."
2. Manual mode forced on
3. Builder disabled
4. User must edit FHIRPath directly in textarea

## API Reference

### Array Path Detection

```typescript
import {
  detectArrayLayers,
  hasNestedArrays,
  getArrayNestingDepth,
  exceedsMaxNestingDepth,
} from '../utils/arrayPathDetection';

// Detect layers
const layers = detectArrayLayers('address.line');
// [{ segment: 'address', ... }, { segment: 'line', ... }]

// Check if nested
hasNestedArrays('address.line'); // true
hasNestedArrays('address'); // false

// Get depth
getArrayNestingDepth('address.line'); // 2
getArrayNestingDepth('address.line.extension'); // 3

// Check limit
exceedsMaxNestingDepth('address.line'); // false
exceedsMaxNestingDepth('address.line.extension'); // true
```

### FHIRPath Building

```typescript
import {
  buildNestedArrayRefinedPath,
  generateNestedArrayIntent,
} from '../types/fhirPathRefinement';

const config: NestedArrayRefinementConfig = {
  layers: [
    { 
      segment: 'address', 
      mode: 'filter', 
      filterCondition: { property: 'use', operator: 'equals', value: 'home' } 
    },
    { 
      segment: 'line', 
      mode: 'all' 
    }
  ]
};

const path = buildNestedArrayRefinedPath('address.line', config);
// "address.where(use='home').line[*]"

const intent = generateNestedArrayIntent(config);
// "Applies to all lines for addresses where use='home'"
```

## Testing Scenarios

### Test Case 1: Parent-Child Constraint
1. Select nested path `address.line`
2. Verify child section is disabled
3. Set parent to "All elements"
4. Verify child section becomes enabled
5. Configure child
6. Verify path generation correct

### Test Case 2: Mode Switching
1. Select nested path
2. Set parent to "Index [0]"
3. Change parent to "Filter where use='home'"
4. Verify path updates correctly
5. Verify intent updates

### Test Case 3: Depth Limit
1. Select path with 3+ array levels
2. Verify warning banner appears
3. Verify builder is disabled
4. Verify manual mode is forced
5. Verify textarea is editable

### Test Case 4: Intent Preview
1. Configure nested refinement
2. Verify intent box appears (green)
3. Verify intent text is human-readable
4. Change configuration
5. Verify intent updates in real-time

### Test Case 5: Raw Path Toggle
1. Configure refinement
2. Click "Show Raw Path"
3. Verify FHIRPath appears in gray box
4. Click "Hide Raw Path"
5. Verify box disappears

### Test Case 6: Manual Override
1. Configure nested refinement
2. Click "Manual Mode →"
3. Verify builder disappears
4. Verify textarea appears with current path
5. Edit path manually
6. Click "← Back to Builder"
7. Verify builder reappears

## Known Limitations

1. **Array Detection Heuristic:** Uses known FHIR fields + plural patterns. May not detect all arrays or may false-positive on non-arrays ending in 's'.

2. **Max Depth 2:** Builder disabled for paths with 3+ array levels. Users must use manual mode.

3. **No Schema Validation:** Generated FHIRPath is not validated against FHIR schema. Invalid paths may be accepted.

4. **Single Filter Per Layer:** Each layer supports only one filter condition (no AND/OR logic).

5. **Property Autocomplete Limited:** Filter property field is free text with suggestions from bundle, not schema-driven.

## Future Enhancements

- Schema-based array detection (via FHIR StructureDefinition)
- Support for 3+ nesting levels with scrollable UI
- Multiple filter conditions per layer (AND/OR logic)
- FHIRPath syntax validation
- Property autocomplete from schema
- Visual array hierarchy diagram
- Undo/redo for refinement changes
- Preset refinement templates

## Architecture Notes

### Pure Function Design
All FHIRPath generation is done via pure functions:
- No API calls
- No side effects
- No validation
- Deterministic output
- String transformation only

### State Management
- Nested array layers stored as array of `ArrayLayerRefinement`
- Parent-to-child order maintained
- Each layer has independent state (mode, index, filter)
- State resets when base path changes

### UI Constraints
- Parent resolution enforced via `isParentResolved()`
- Disabled sections have gray background
- Expanded state tracked per layer
- First layer expanded by default

### Error Handling
- No validation errors (pure transformation)
- Depth limit checked proactively
- Manual mode as escape hatch
- No blocking errors, only warnings
