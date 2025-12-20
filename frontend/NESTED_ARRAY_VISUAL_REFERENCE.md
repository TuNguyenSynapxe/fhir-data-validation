# Nested Array Refinement - Visual Reference

## UI Component Hierarchy

```
FhirPathRefinementPanel
├─ Header
│  ├─ Title: "Path Refinement"
│  ├─ "Show Raw Path" toggle (optional)
│  └─ "Manual Mode →" toggle
│
├─ Depth Limit Warning (conditional)
│  └─ ⚠️ "Nesting Too Deep" banner
│
├─ Manual Override Mode (conditional)
│  └─ Textarea for direct FHIRPath editing
│
├─ Structured Refinement Mode (conditional)
│  ├─ Base Path Display (gray box)
│  ├─ Nested Array Notice (blue box, conditional)
│  │
│  ├─ NestedArrayRefinementBuilder (for nested arrays)
│  │  ├─ Layer 0 (Parent Array)
│  │  │  ├─ Header: "Parent Array: address"
│  │  │  ├─ Summary: "All items [*]" / "Index [n]" / "Filter"
│  │  │  └─ Content (collapsible)
│  │  │     ├─ RefinementModeSelector
│  │  │     ├─ IndexRefinementInput (conditional)
│  │  │     └─ FilterRefinementBuilder (conditional)
│  │  │
│  │  └─ Layer 1 (Child Array)
│  │     ├─ Header: "Child Array: line"
│  │     ├─ Summary: "All items [*]" / "Index [n]" / "Filter"
│  │     ├─ Disabled Notice: "Resolve parent array first" (conditional)
│  │     └─ Content (collapsible, disabled if parent unresolved)
│  │        ├─ RefinementModeSelector
│  │        ├─ IndexRefinementInput (conditional)
│  │        └─ FilterRefinementBuilder (conditional)
│  │
│  └─ Single Array Builder (for non-nested arrays)
│     ├─ RefinementModeSelector
│     ├─ IndexRefinementInput (conditional)
│     └─ FilterRefinementBuilder (conditional)
│
├─ Human-Readable Intent Preview (green box, nested only)
│  └─ "Applies to all lines for home addresses"
│
├─ Raw FHIRPath Display (gray box, collapsible)
│  └─ "Generated FHIRPath: address.where(use='home').line[*]"
│
└─ Final Path Preview (always visible)
   └─ FhirPathPreview component
```

## State Flow Diagram

```
Path Selected
     │
     ↓
Detect Array Layers ─────→ No Arrays → Single Field Mode
     │                                  (no refinement needed)
     ↓
     ├─ 1 Array Layer ──→ Single Array Mode
     │                    (legacy UI)
     │
     ├─ 2 Array Layers ─→ Nested Array Mode
     │                    (stacked scope selector)
     │
     └─ 3+ Array Layers → Force Manual Mode
                          (builder disabled)

Nested Array Mode Flow:
     │
     ↓
Initialize Layers
(all set to 'first' mode)
     │
     ↓
User Configures Parent Layer ──→ Child Layer Enabled
     │                             │
     │                             ↓
     │                        User Configures Child Layer
     │                             │
     │←─────────────────────────────┘
     │
     ↓
Generate FHIRPath
     │
     ↓
Generate Intent
     │
     ↓
Update Preview
```

## Color Coding System

| Color | Usage | Example |
|-------|-------|---------|
| **Gray** (`bg-gray-100`) | Base path display, raw FHIRPath | Base Path: `address.line` |
| **Blue** (`bg-blue-50`) | Nested array notices, info messages | "Nested Array Detected" |
| **Green** (`bg-green-50`) | Human-readable intent preview | "Applies to all lines..." |
| **Orange** (`bg-amber-50`) | Warnings, depth limit exceeded | "Nesting Too Deep" |
| **White** (`bg-white`) | Active, enabled sections | Expanded layer content |
| **Light Gray** (`bg-gray-50`) | Disabled, inactive sections | Unresolved child layers |

## Icon Usage

| Icon | Component | Usage |
|------|-----------|-------|
| `ChevronDownIcon` | Layer header | Expanded state indicator |
| `ChevronRightIcon` | Layer header | Collapsed state indicator |
| `ExclamationTriangleIcon` | Warning banner | Depth limit warning |

## Interaction States

### Layer Section States

```
┌─────────────────────────────────────────────┐
│ 🔽 Parent Array: address     All items [*] │  ← EXPANDED
├─────────────────────────────────────────────┤
│ How should this array be refined?          │
│ ○ First element (default)                  │
│ ● All elements [*]                          │
│ ○ Index [n]                                 │
│ ○ Filter (where)                            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ▶ Child Array: line          First item    │  ← COLLAPSED, ENABLED
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ▶ Child Array: line          First item    │  ← COLLAPSED, DISABLED
│ Resolve parent array level first           │
└─────────────────────────────────────────────┘
```

## FHIRPath Generation Examples

### Example 1: All Parent, All Child
```
Input:  address.line
Config: [
  { segment: 'address', mode: 'all' },
  { segment: 'line', mode: 'all' }
]
Output: address[*].line[*]
```

### Example 2: Filter Parent, Index Child
```
Input:  address.line
Config: [
  { segment: 'address', mode: 'filter', filterCondition: { property: 'use', operator: 'equals', value: 'home' } },
  { segment: 'line', mode: 'index', indexValue: 0 }
]
Output: address.where(use='home').line[0]
```

### Example 3: Index Parent, Filter Child
```
Input:  name.given
Config: [
  { segment: 'name', mode: 'index', indexValue: 1 },
  { segment: 'given', mode: 'filter', filterCondition: { property: 'text', operator: 'contains', value: 'John' } }
]
Output: name[1].given.where(text.contains('John'))
```

### Example 4: First Parent, All Child
```
Input:  identifier.extension
Config: [
  { segment: 'identifier', mode: 'first' },
  { segment: 'extension', mode: 'all' }
]
Output: identifier.extension[*]
```

## Intent Generation Patterns

| Configuration | Generated Intent |
|---------------|------------------|
| `address[*].line[*]` | "Applies to all lines for all addresses" |
| `address[0].line[*]` | "Applies to all lines for 0th address" |
| `address[*].line[0]` | "Applies to 0th line for all addresses" |
| `address.where(use='home').line[*]` | "Applies to all lines for addresses where use='home'" |
| `name[1].given[0]` | "Applies to 0th given for 1st name" |
| `identifier.where(system='MRN').extension[*]` | "Applies to all extensions for identifiers where system='MRN'" |

## Constraint Enforcement

### Parent-Child Resolution
```
┌─ Parent Array: address ────────────┐
│ Mode: First element (default) ❌   │  ← UNRESOLVED
└─────────────────────────────────────┘

┌─ Child Array: line ────────────────┐
│ 🔒 DISABLED                         │  ← BLOCKED
│ Resolve parent array first         │
└─────────────────────────────────────┘

      User selects "All elements [*]"
                    ↓

┌─ Parent Array: address ────────────┐
│ Mode: All elements [*] ✅           │  ← RESOLVED
└─────────────────────────────────────┘

┌─ Child Array: line ────────────────┐
│ 🔓 ENABLED                          │  ← UNBLOCKED
│ (User can now configure)           │
└─────────────────────────────────────┘
```

### Mode Exclusivity
Each layer can have ONLY ONE mode active:
- ✅ All elements `[*]`
- ✅ Index `[n]`
- ✅ Filter `.where(...)`
- ✅ First (no modification)

Cannot mix modes at same layer (e.g., `[*]` AND `.where(...)`).

## Toggle States

### Show/Hide Raw FHIRPath
```
Default State:
┌───────────────────────────────────┐
│ [Show Raw Path]                  │
└───────────────────────────────────┘
(Raw path hidden)

After Click:
┌───────────────────────────────────┐
│ [Hide Raw Path]                  │
│                                  │
│ Generated FHIRPath:              │
│ address.where(use='home').line[*]│
└───────────────────────────────────┘
```

### Builder/Manual Mode Toggle
```
Builder Mode:
┌───────────────────────────────────┐
│ [Manual Mode →]                   │
│                                  │
│ (Stacked scope selector UI)      │
└───────────────────────────────────┘

Manual Mode:
┌───────────────────────────────────┐
│ [← Back to Builder]               │
│                                  │
│ Manual FHIRPath:                 │
│ ┌─────────────────────────────┐  │
│ │ address.where(use='home')   │  │
│ │   .line[*]                  │  │
│ └─────────────────────────────┘  │
└───────────────────────────────────┘
```

## Responsive Behavior

- **Desktop:** Full stacked layout, side-by-side toggles
- **Tablet:** Stacked layout maintained, buttons wrap if needed
- **Mobile:** Vertical stacking, full-width inputs

## Accessibility Features

- **Keyboard Navigation:** Tab through all interactive elements
- **ARIA Labels:** Descriptive labels for screen readers
- **Focus States:** Clear visual indicators
- **Color Contrast:** WCAG AA compliant
- **Semantic HTML:** Proper heading hierarchy

## Animation & Transitions

- **Layer Expand/Collapse:** 200ms ease-in-out
- **Button Hover:** 150ms color transition
- **Disabled State:** Reduced opacity (0.6)
- **Focus Ring:** 2px blue outline (ring-2 ring-blue-500)
