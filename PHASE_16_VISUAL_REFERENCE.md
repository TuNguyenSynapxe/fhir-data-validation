# Phase 16: Layout Refactoring - Visual Reference

## Before (3-column cramped layout)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Questions                                               [+ New Question] │
├────────────┬────────────────────────────┬──────────────────────────────┤
│            │                            │                              │
│ QUESTIONS  │  Edit Question             │  Preview                     │
│            │  ┌──────────────────────┐  │  ┌────────────────────────┐ │
│ ┌────────┐ │  │ Question Details     │  │  │ Question               │ │
│ │HEIGHT  │ │  │                      │  │  │ Body height            │ │
│ │Body... │ │  │ System *             │  │  │                        │ │
│ └────────┘ │  │ [http://...] [Browse]│  │  │ Code                   │ │
│            │  │                      │  │  │ HEIGHT                 │ │
│ ┌────────┐ │  │ Code *               │  │  │                        │ │
│ │WEIGHT  │ │  │ [HEIGHT]             │  │  │ Answer Type            │ │
│ │Body... │ │  │                      │  │  │ Quantity - Measured    │ │
│ └────────┘ │  │ Display *            │  │  │                        │ │
│            │  │ [Body height]        │  │  │ Unit                   │ │
│            │  │                      │  │  │ cm (cm)                │ │
│            │  │ Answer Type *        │  │  │                        │ │
│            │  │ [Quantity - ...]     │  │  │ Range                  │ │
│            │  │                      │  │  │ 0 to 300               │ │
│            │  │ Description          │  │  └────────────────────────┘ │
│            │  │ [..................  │  │                              │
│            │  │  .................]  │  │                              │
│            │  │                      │  │                              │
│            │  │ Unit Code *          │  │                              │
│            │  │ [cm]        [Browse] │  │                              │
│            │  │                      │  │                              │
│            │  │ Min Value            │  │                              │
│            │  │ [0]                  │  │                              │
│            │  │                      │  │                              │
│            │  │ Max Value            │  │                              │
│            │  │ [300]                │  │                              │
│            │  └──────────────────────┘  │                              │
│            │                            │                              │
│            │  [Cancel]  [Save Question] │                              │
└────────────┴────────────────────────────┴──────────────────────────────┘

❌ PROBLEMS:
- Preview always visible (wastes space)
- Form cramped between list and preview
- Fields lack visual grouping
- Difficult to read on 13-14" laptops
- Horizontal scrolling on smaller screens
```

---

## After (2-column comfortable layout)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Questions                                               [+ New Question] │
├────────────┬──────────────────────────────────────────────────────────┤
│            │  Edit Question                     [👁 Preview]           │
│ QUESTIONS  │                                                            │
│            │  ┌──────────────────────────────────────────────────────┐ │
│ ┌────────┐ │  │ Question Identity                                    │ │
│ │HEIGHT  │ │  │                                                      │ │
│ │Body... │ │  │ System *                                             │ │
│ └────────┘ │  │ [http://example.org/questions] [Browse]              │ │
│            │  │ You may enter local or provisional codes...          │ │
│ ┌────────┐ │  │                                                      │ │
│ │WEIGHT  │ │  │ Code *                                               │ │
│ │Body... │ │  │ [HEIGHT]                                             │ │
│ └────────┘ │  │                                                      │ │
│            │  │ Display *                                            │ │
│            │  │ [Body height]                                        │ │
│            │  │                                                      │ │
│            │  │ Description                                          │ │
│            │  │ [Additional context or help text for this question   │ │
│            │  │  .................................................]   │ │
│            │  └──────────────────────────────────────────────────────┘ │
│            │                                                            │
│            │  ┌──────────────────────────────────────────────────────┐ │
│            │  │ Answer Definition                                    │ │
│            │  │                                                      │ │
│            │  │ Answer Type *                                        │ │
│            │  │ [Quantity - Measured or calculated value]            │ │
│            │  │                                                      │ │
│            │  │ Unit Code *                                          │ │
│            │  │ [cm]                            [Browse]             │ │
│            │  │                                                      │ │
│            │  │ Min Value                                            │ │
│            │  │ [0]                                                  │ │
│            │  │                                                      │ │
│            │  │ Max Value                                            │ │
│            │  │ [300]                                                │ │
│            │  └──────────────────────────────────────────────────────┘ │
│            │                                                            │
│            │                                  [Cancel]  [Save Question] │
└────────────┴──────────────────────────────────────────────────────────┘

✅ IMPROVEMENTS:
- More horizontal space for form (max-width: 720px)
- Fields grouped into logical sections
- Preview on-demand via button → drawer
- Comfortable on 13-14" laptop screens
- No horizontal scrolling
- Clear visual hierarchy
```

---

## Preview Drawer (Opened)

```
┌──────────────────────────────────────────────────────┬────────────────┐
│ Questions                        [+ New Question]     │ Preview     [X]│
├────────────┬─────────────────────────────────────────┼────────────────┤
│            │  Edit Question          [👁 Preview]    │                │
│ QUESTIONS  │                                          │ Question       │
│            │  ┌────────────────────────────────────┐ │ Body height    │
│ ┌────────┐ │  │ Question Identity                 │ │                │
│ │HEIGHT  │ │  │                                   │ │ Code           │
│ │Body... │ │  │ System *                          │ │ HEIGHT         │
│ └────────┘ │  │ [http://example.org/questions]    │ │                │
│            │  │                                   │ │ Answer Type    │
│ ┌────────┐ │  │ Code *                            │ │ Quantity -     │
│ │WEIGHT  │ │  │ [HEIGHT]                          │ │ Measured       │
│ │Body... │ │  │                                   │ │                │
│ └────────┘ │  │ Display *                         │ │ Unit           │
│            │  │ [Body height]                     │ │ cm (cm)        │
│            │  │                                   │ │                │
│            │  │ Description                       │ │ Range          │
│            │  │ [..................]              │ │ 0 to 300       │
│            │  └────────────────────────────────────┘ │                │
│            │                                          │                │
│            │  ┌────────────────────────────────────┐ │                │
│            │  │ Answer Definition                  │ │                │
│            │  │                                    │ │                │
│            │  │ Answer Type *                      │ │                │
│            │  │ [Quantity - Measured or calculated]│ │                │
│            │  └────────────────────────────────────┘ │                │
└────────────┴──────────────────────────────────────────┴────────────────┘
             ↑                                          ↑
          Form (max-width: 720px)              Drawer (45% width)

✅ DRAWER FEATURES:
- Opens on-demand (button click)
- 45% screen width (comfortable size)
- Scrollable if content exceeds viewport
- Closes on backdrop click or X button
- Live updates as form changes
- z-index 50 (above backdrop at 40)
```

---

## Section Card Styling

### Question Identity Section
```
┌─────────────────────────────────────────────────────┐
│ Question Identity                (bg-gray-50)       │
│─────────────────────────────────────────────────────│
│                                                     │
│ System *                          ← Required field  │
│ [http://example.org/questions]  [Browse]           │
│ Helper text here...                                 │
│                                   ↑ 5 units spacing │
│ Code *                                              │
│ [HEIGHT]                                            │
│                                   ↑ 5 units spacing │
│ Display *                                           │
│ [Body height]                                       │
│                                   ↑ 5 units spacing │
│ Description                       ← Optional field  │
│ [Multi-line textarea.........................]      │
│                                                     │
└─────────────────────────────────────────────────────┘
  ↑ border-gray-200, rounded-lg, p-6
```

### Answer Definition Section
```
┌─────────────────────────────────────────────────────┐
│ Answer Definition                (bg-gray-50)       │
│─────────────────────────────────────────────────────│
│                                                     │
│ Answer Type *                                       │
│ [Quantity - Measured or calculated value]          │
│                                   ↑ 5 units spacing │
│                                                     │
│ ┌─ Dynamic Constraints ────────────────────────┐   │
│ │                                               │   │
│ │ Unit Code *                                   │   │
│ │ [cm]                          [Browse]        │   │
│ │                                               │   │
│ │ Min Value                                     │   │
│ │ [0]                                           │   │
│ │                                               │   │
│ │ Max Value                                     │   │
│ │ [300]                                         │   │
│ │                                               │   │
│ └───────────────────────────────────────────────┘   │
│     ↑ QuestionConstraintsSection (dynamic)          │
│                                                     │
└─────────────────────────────────────────────────────┘
  ↑ border-gray-200, rounded-lg, p-6
```

---

## Spacing Hierarchy

```
space-y-8        ← Between sections (32px)
  │
  ├─ Section Card 1 (p-6 = 24px padding)
  │    │
  │    ├─ Section Header (mb-4 = 16px)
  │    │
  │    └─ Fields Container (space-y-5 = 20px)
  │         │
  │         ├─ Field 1
  │         ├─ Field 2
  │         ├─ Field 3
  │         └─ Field 4
  │
  ├─ Section Card 2 (p-6 = 24px padding)
  │    │
  │    ├─ Section Header (mb-4 = 16px)
  │    │
  │    └─ Fields Container (space-y-5 = 20px)
  │         │
  │         ├─ Answer Type Field
  │         └─ Dynamic Constraints
  │
  └─ ...

Max-width: 720px (comfortable reading width)
Horizontal centering: mx-auto
```

---

## Color Palette

```css
/* Section Cards */
background: bg-gray-50     /* #F9FAFB */
border: border-gray-200    /* #E5E7EB */
border-radius: rounded-lg  /* 0.5rem */

/* Section Headers */
color: text-gray-900       /* #111827 */
font-weight: font-semibold /* 600 */
font-size: text-sm         /* 0.875rem */

/* Field Labels */
color: text-gray-700       /* #374151 */
font-weight: font-medium   /* 500 */

/* Helper Text */
color: text-gray-500       /* #6B7280 */
font-size: text-xs         /* 0.75rem */

/* Drawer Backdrop */
background: bg-black bg-opacity-30
z-index: 40

/* Drawer Panel */
background: bg-white       /* #FFFFFF */
box-shadow: shadow-xl
z-index: 50
```

---

## Responsive Behavior

### Desktop (>1280px)
- Form max-width: 720px
- Drawer width: 45% (~576px)
- Comfortable side-by-side when drawer open

### Laptop (1024-1280px)
- Form max-width: 720px (constrained)
- Drawer width: 45% (~460-576px)
- Optimal for 13-14" screens

### Tablet (768-1024px)
- Form max-width: 720px (may need adjustment)
- Drawer width: 45% (consider increasing to 60%)
- Still usable but may feel tight

### Mobile (<768px)
- Future: Drawer should be full-width
- Future: Stack layout vertically
- Out of scope for Phase 16

---

## Interaction Flow

```
User opens Questions panel
  ↓
Sees List + Empty State
  ↓
Clicks [+ New Question]
  ↓
Form appears (single-column, max-width 720px)
  ↓
Fills in System, Code, Display
  ↓
Selects Answer Type → Constraints appear
  ↓
Wants to check preview
  ↓
Clicks [👁 Preview] button
  ↓
Drawer slides in from right (45% width)
  ↓
Backdrop appears (semi-transparent)
  ↓
Preview shows current form state (live)
  ↓
User continues editing
  ↓
Preview updates in real-time
  ↓
User clicks backdrop or [X] to close drawer
  ↓
Drawer disappears, full width for form restored
  ↓
User clicks [Save Question]
  ↓
Question saved, form cleared
```

---

## Key Design Decisions

### Why max-width 720px?
- Optimal reading width (45-75 characters per line)
- Prevents form from stretching too wide on large displays
- Allows whitespace on sides for breathing room

### Why 45% drawer width?
- Provides substantial preview area
- Doesn't obscure too much of form
- User can still see context when drawer open
- Could be adjusted 40-50% based on user feedback

### Why section cards with gray background?
- Clear visual grouping without heavy borders
- Differentiates sections from main background
- Accessible (sufficient contrast)
- Aligns with modern UI design patterns

### Why on-demand preview vs always-visible?
- Reduces visual clutter
- User controls when preview is needed
- More screen space for form when focused
- Preview still easily accessible (single click)

---

## Accessibility Notes

- Drawer backdrop overlay is clickable (large target)
- Close button (X) has adequate size (w-5 h-5 = 20x20px)
- Section headers have semantic meaning (h4 tags)
- Color contrast meets WCAG AA standards
- Focus management preserved (keyboard navigation works)
- Screen readers announce section boundaries

---

## Performance Considerations

- No heavy animations (instant open/close for now)
- Preview updates are React state-driven (efficient)
- Drawer only renders when `isPreviewOpen === true`
- No additional API calls or data fetching
- Minimal re-renders (isolated state changes)

---

**Status:** ✅ Complete - Visual reference for implementation review
