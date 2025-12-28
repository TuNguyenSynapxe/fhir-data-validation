# Phase 17: Contextual Bundle Drawer - Visual Reference

## Before/After Comparison

### Before: Always-Visible Split Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Project Header                                  [Export Rules]      │
├────────────────────────┬────────────────────────────────────────────┤
│                        │                                            │
│  Bundle Panel          │  Main Content                              │
│  ┌──────────────────┐  │  ┌──────────────────────────────────────┐ │
│  │ Bundle Tabs      │  │  │ Overview | Rules | Validation        │ │
│  │ • Tree View      │  │  ├──────────────────────────────────────┤ │
│  │ • JSON Editor    │  │  │                                      │ │
│  │ • Samples        │  │  │  Validation Results                  │ │
│  ├──────────────────┤  │  │                                      │ │
│  │                  │  │  │  [Run Validation] [Mode: Standard]   │ │
│  │ Bundle Tree      │  │  │                                      │ │
│  │ • Patient        │  │  │  ┌────────────────────────────────┐ │ │
│  │   • id           │  │  │  │ Problems                       │ │ │
│  │   • name         │  │  │  │                                │ │ │
│  │ • Encounter      │  │  │  │ • Error: Missing required      │ │ │
│  │                  │  │  │  │   field 'identifier'           │ │ │
│  │                  │  │  │  │                                │ │ │
│  │                  │  │  │  │ • Warning: Code not in VS      │ │ │
│  │                  │  │  │  │                                │ │ │
│  └──────────────────┘  │  │  └────────────────────────────────┘ │ │
│                        │  │                                      │ │
│  40% width             │  │  60% width                           │ │
│  Always visible        │  │                                      │ │
└────────────────────────┴────────────────────────────────────────────┘
```

**Issues:**
- ❌ 40% of screen always dedicated to bundle (even when not needed)
- ❌ No way to temporarily hide bundle for focused validation review
- ❌ Cramped main content area (only 60% width)
- ❌ Wasted space during rules authoring or terminology editing

---

### After: Contextual Drawer Layout

#### Default State (Bundle Closed)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Project Header                                  [Export Rules]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Main Content (Full Width - 100%)                                  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Overview | Rules | Validation                                 │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │                                                               │ │
│  │  Validation Results                                           │ │
│  │                                                               │ │
│  │  [Run Validation] [Show Bundle] [Mode: Standard]             │ │
│  │                     ^^^^^^^^^^^                               │ │
│  │                     Toggle button                             │ │
│  │                                                               │ │
│  │  ┌──────────────────────────────────────────────────────────┐│ │
│  │  │ Problems                                                  ││ │
│  │  │                                                           ││ │
│  │  │ • Error: Patient.identifier is required                  ││ │
│  │  │   Path: /entry[0]/resource/Patient                       ││ │
│  │  │   Line: 15                                                ││ │
│  │  │                                                           ││ │
│  │  │ • Warning: Code 'abc' not found in ValueSet              ││ │
│  │  │   Path: /entry[1]/resource/Encounter/class/code          ││ │
│  │  │   Line: 42                                                ││ │
│  │  │                                                           ││ │
│  │  │ • Info: Consider adding meta.profile                     ││ │
│  │  │   Path: /entry[0]/resource/Patient/meta                  ││ │
│  │  │                                                           ││ │
│  │  └──────────────────────────────────────────────────────────┘│ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Full width for main content (100% instead of 60%)
- ✅ More space for validation results and rules
- ✅ Bundle hidden until needed
- ✅ Clean, focused interface

---

#### Active State (Bundle Opened)

```
┌──────────────────────────────────────────┬──────────────────────────┐
│ Project Header        [Export Rules]     │ ← Backdrop overlay       │
├──────────────────────────────────────────┼──────────────────────────┤
│                                          │                          │
│  Main Content (60% width)                │  Bundle Drawer (40%)     │
│  ┌────────────────────────────────────┐  │  ┌────────────────────┐ │
│  │ Overview | Rules | Validation      │  │  │ Bundle JSON     [X]│ │
│  ├────────────────────────────────────┤  │  ├────────────────────┤ │
│  │                                    │  │  │ Bundle Tabs        │ │
│  │  Validation Results                │  │  │ • Tree View        │ │
│  │                                    │  │  │ • JSON Editor      │ │
│  │  [Run] [Hide Bundle] [Mode]       │  │  │ • Samples          │ │
│  │          ^^^^^^^^^^^               │  │  ├────────────────────┤ │
│  │          Active                    │  │  │                    │ │
│  │                                    │  │  │ Bundle Tree        │ │
│  │  Problems                          │  │  │ • Patient          │ │
│  │                                    │  │  │   • id ←───────────│─┤
│  │  • Error: identifier required      │  │  │   • name           │ │
│  │    Click to navigate →─────────────┼──┼──┤   • identifier     │ │
│  │                                    │  │  │     (missing) 👻   │ │
│  │  • Warning: Invalid code           │  │  │ • Encounter        │ │
│  │    Click to navigate →─────────────┼──┼──┤   • class          │ │
│  │                                    │  │  │     • code ←───────│─┤
│  │                                    │  │  │                    │ │
│  └────────────────────────────────────┘  │  └────────────────────┘ │
│                                          │                          │
│  Slightly dimmed                         │  Fully visible           │
└──────────────────────────────────────────┴──────────────────────────┘
```

**Features:**
- ✅ Bundle appears on-demand (user click or error navigation)
- ✅ Backdrop overlay (semi-transparent) 
- ✅ Drawer slides in from right (40% width)
- ✅ Close button (X) in drawer header
- ✅ "Hide Bundle" button in toolbar
- ✅ Click backdrop to close
- ✅ Tree navigation preserved
- ✅ Highlighting works (blue ring on focused node)

---

## Interaction Flows

### Flow 1: Manual Toggle

```
User clicks "Show Bundle"
  ↓
Drawer slides in from right (40% width)
  ↓
Backdrop appears (semi-transparent)
  ↓
Button label changes to "Hide Bundle"
  ↓
Button background changes to blue
  ↓
User can browse bundle tree freely
  ↓
User clicks "Hide Bundle" or backdrop or [X]
  ↓
Drawer closes
  ↓
Main content returns to full width
  ↓
Button label changes to "Show Bundle"
```

---

### Flow 2: Auto-Open on Error Click

```
User sees validation error:
"Error: Patient.identifier is required"
  ↓
User clicks error row
  ↓
handleNavigateToPath() triggered
  ↓
setIsBundleOpen(true) ← Auto-open
  ↓
Drawer slides in from right
  ↓
Bundle tree switches to Tree View
  ↓
Smart path resolution:
- Tries exact path: /entry[0]/resource/Patient/identifier
- Path doesn't exist (missing field)
  ↓
Fallback to parent:
- Navigate to: /entry[0]/resource/Patient
- Show ghost node: "identifier (missing) 👻"
  ↓
Blue ring highlight applied to Patient node
  ↓
Scroll Patient node into view
  ↓
User sees missing field indicator
  ↓
User can add field or fix error
```

---

### Flow 3: Close and Continue

```
Bundle drawer is open
User wants to focus on validation results
  ↓
User clicks backdrop (anywhere outside drawer)
  ↓
Drawer closes instantly
  ↓
Main content expands to full width
  ↓
Navigation state preserved (tree still at Patient node)
  ↓
User reviews errors in full-width view
  ↓
User clicks another error
  ↓
Drawer auto-opens again
  ↓
Tree navigates to new error path
  ↓
Cycle continues...
```

---

## Component Hierarchy

```
PlaygroundPage
├── [State] isBundleOpen (boolean)
├── [State] bundleJson (string)
├── [Handler] handleNavigateToPath() → sets isBundleOpen = true
│
├── PlaygroundLayout (props: isBundleOpen, onBundleToggle)
│   │
│   ├── Main Content (always visible, full width when drawer closed)
│   │   └── RightPanelContainer
│   │       └── RightPanel
│   │           ├── RulesPanel (when mode === Rules)
│   │           └── ValidationPanel (when mode === Validation)
│   │               ├── [Button] Show/Hide Bundle
│   │               └── ValidationResultList
│   │                   └── Error rows (onClick → navigate)
│   │
│   └── Bundle Drawer (conditional render when isBundleOpen)
│       ├── Backdrop (z-40, semi-transparent)
│       └── Drawer Panel (z-50, 40% width)
│           ├── Header ("Bundle JSON" + [X] button)
│           └── BundleContent
│               └── BundleTabs
│                   ├── Tree View (default)
│                   ├── JSON Editor
│                   └── Samples
```

---

## Styling Reference

### Drawer Panel
```css
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 40%;
  background: white;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  z-index: 50;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e5e7eb;
}
```

### Backdrop
```css
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  z-index: 40;
  transition: opacity 200ms;
}
```

### Toggle Button (Closed State)
```css
.button-closed {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 200ms;
}

.button-closed:hover {
  background: #f9fafb;
}
```

### Toggle Button (Open State)
```css
.button-open {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: #eff6ff;
  border: 1px solid #93c5fd;
  border-radius: 0.375rem;
  color: #1d4ed8;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 200ms;
}

.button-open:hover {
  background: #dbeafe;
}
```

### Drawer Header
```css
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}
```

---

## Keyboard Shortcuts (Future)

Current implementation uses mouse/click interactions only. Future enhancements:

```
ESC          - Close drawer
Ctrl/Cmd+B   - Toggle drawer
Ctrl/Cmd+J   - Jump to bundle (open + focus)
```

---

## Mobile Considerations (Future)

Current implementation optimized for desktop (1024px+). Mobile adjustments needed:

```
< 768px (Mobile):
- Drawer should be full-width (100%)
- Slide up from bottom instead of right
- Swipe gestures for close
- Backdrop darker (30% opacity)

768-1024px (Tablet):
- Drawer width: 50%
- Same right-side approach
- Touch-optimized close button
```

---

## Testing Scenarios

### Scenario 1: Default State
1. Load project page
2. ✓ Bundle drawer is closed
3. ✓ Main content is full width
4. ✓ "Show Bundle" button visible in Validation toolbar

### Scenario 2: Manual Open/Close
1. Click "Show Bundle"
2. ✓ Drawer slides in from right (40% width)
3. ✓ Backdrop appears
4. ✓ Button label changes to "Hide Bundle"
5. ✓ Button background is blue
6. Click backdrop
7. ✓ Drawer closes
8. ✓ Main content returns to full width

### Scenario 3: Auto-Open on Error Navigation
1. Run validation with errors
2. Click any error row
3. ✓ Drawer auto-opens
4. ✓ Bundle tree switches to Tree View
5. ✓ Path is resolved (or fallback to parent)
6. ✓ Node is highlighted (blue ring)
7. ✓ Ghost node appears if field missing
8. ✓ Scroll to element works

### Scenario 4: Navigation State Preservation
1. Open drawer, navigate to Patient node
2. Close drawer (click backdrop)
3. ✓ Drawer closes
4. ✓ Main content full width
5. Re-open drawer (click "Show Bundle")
6. ✓ Tree still shows Patient node expanded
7. ✓ Navigation state preserved

### Scenario 5: Multiple Error Navigation
1. Click first error → drawer opens, navigates to Patient
2. Click second error → drawer stays open, navigates to Encounter
3. Click third error → drawer stays open, navigates to Observation
4. ✓ Drawer doesn't close between navigations
5. ✓ Each navigation updates tree focus
6. ✓ Highlighting switches to new node

---

## Color Palette

```css
/* Drawer Background */
--drawer-bg: #ffffff

/* Drawer Header */
--header-bg: #f9fafb
--header-text: #374151
--header-border: #e5e7eb

/* Backdrop */
--backdrop-bg: rgba(0, 0, 0, 0.2)

/* Button - Closed State */
--btn-closed-bg: #ffffff
--btn-closed-border: #d1d5db
--btn-closed-text: #374151
--btn-closed-hover-bg: #f9fafb

/* Button - Open State */
--btn-open-bg: #eff6ff
--btn-open-border: #93c5fd
--btn-open-text: #1d4ed8
--btn-open-hover-bg: #dbeafe

/* Close Button */
--close-btn-hover-bg: #e5e7eb
```

---

**Status:** ✅ Complete - Visual reference for contextual bundle drawer implementation
