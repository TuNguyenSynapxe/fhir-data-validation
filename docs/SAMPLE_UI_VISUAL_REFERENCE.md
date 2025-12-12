# Sample Selector UI — Visual Reference

## Component Hierarchy

```
BundleTabs
└── Tab: "Load Sample" (Default)
    └── SampleSelector
        ├── Resource Type Dropdown
        │   └── [Patient ▼]
        ├── Sample List (scrollable)
        │   ├── Patient — Complex Example [HL7]
        │   ├── Patient — Example [HL7]
        │   ├── Patient Full (custom)
        │   └── ... (201 total samples)
        └── Selected Sample Info Panel
            └── Source: HL7 FHIR R4 Specification
```

## Sample List Item Examples

### HL7 Official Sample
```
┌─────────────────────────────────────────────────────┐
│ Hl7 Patient Example       [HL7]                   │
│ Official HL7 FHIR R4 example                       │
└─────────────────────────────────────────────────────┘
    ↑                          ↑
    Display name               Badge (blue, small)
```

### Custom Sample
```
┌─────────────────────────────────────────────────────┐
│ Patient Full                                       │
│ Project-specific sample                            │
└─────────────────────────────────────────────────────┘
    ↑
    Display name (no badge)
```

## Badge Specifications

### Visual Appearance
```css
Background: #EFF6FF (blue-50)
Text Color: #1D4ED8 (blue-700)
Border: 1px solid #BFDBFE (blue-200)
Padding: 2px 8px
Font Size: 0.75rem (12px)
Font Weight: 500 (medium)
Border Radius: 0.25rem (4px)
```

### Badge Text
- Content: "HL7"
- Always uppercase
- No icon needed

### Tooltip (on hover)
```
┌─────────────────────────────────────┐
│ Official HL7 FHIR R4 example        │
│ Source: HL7 FHIR R4 Specification   │
└─────────────────────────────────────┘
```

## Sample Info Panel (After Loading)

### HL7 Sample Loaded
```
┌─────────────────────────────────────────────────────┐
│ 📄 Loaded: Hl7 Patient Example                    │
│    Source: HL7 FHIR R4 Specification               │
└─────────────────────────────────────────────────────┘
```

### Custom Sample Loaded
```
┌─────────────────────────────────────────────────────┐
│ 📄 Loaded: Patient Full                            │
│    Source: Project Sample                          │
└─────────────────────────────────────────────────────┘
```

## Interaction Flow

```
1. User opens Playground
   ↓
2. Default tab: "Load Sample" is active
   ↓
3. User selects resource type (e.g., "Patient")
   ↓
4. Sample list loads (24 Patient samples)
   ↓
5. User sees badges on HL7 samples
   ↓
6. User hovers over [HL7] badge
   ↓
7. Tooltip appears: "Official HL7 FHIR R4 example..."
   ↓
8. User clicks sample
   ↓
9. Sample loads, info panel shows source
   ↓
10. Tab auto-switches to "Tree View"
```

## Sample Count Display

```
┌─────────────────────────────────────────────────────┐
│ Resource Type                                       │
│ ┌─────────────────────────────────┐                │
│ │ Patient ▼                       │                │
│ └─────────────────────────────────┘                │
│                                                     │
│ Sample (24 available)                              │
│ ┌─────────────────────────────────────────────┐   │
│ │ Hl7 Patient Example       [HL7]          ↓  │   │
│ │ Hl7 Patient Example A     [HL7]             │   │
│ │ Hl7 Patient Example B     [HL7]             │   │
│ │ Patient Full                                 │   │
│ │ Patient Minimal                              │   │
│ │ ... (scrollable)                             │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Tab Layout

```
┌───────────────────────────────────────────────────────────┐
│ [Load Sample] [Tree View] [JSON Editor]      [Save Bundle]│
├───────────────────────────────────────────────────────────┤
│                                                           │
│  (Sample Selector Component)                             │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## Color Palette

### HL7 Badge Colors
- Background: `bg-blue-50` (#EFF6FF)
- Text: `text-blue-700` (#1D4ED8)
- Border: `border-blue-200` (#BFDBFE)

### Selected Sample (in list)
- Background: `bg-blue-50` (#EFF6FF)
- Text: `text-blue-900` (#1E3A8A)

### Hover State
- Background: `hover:bg-gray-50` (#F9FAFB)

## Responsive Behavior

- Sample list: Max height 384px (24rem), scrollable
- Dropdown: Full width of container
- Badge: Inline, right-aligned in list item
- Tooltip: Appears on hover, auto-positioned

## Accessibility

- All buttons have clear labels
- Tooltips provide context without blocking workflow
- Loading states visible with spinner icons
- Error states shown with clear messaging
- Keyboard navigation supported

---

**Implementation Status**: ✅ Complete
**Files Created**: 3 new components + 1 type definition
**Lines of Code**: ~300 lines
**Zero Backend Changes**: ✅ Confirmed
