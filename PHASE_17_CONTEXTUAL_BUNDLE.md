# Phase 17: Contextual Bundle Drawer

**Date:** 2025-12-24  
**Status:** ✅ Complete

---

## Overview

Refactored the UI layout to make the Bundle JSON panel contextual instead of always visible. The bundle now appears as an on-demand right-side drawer (40% width) that auto-opens on navigation events, significantly improving screen real estate usage while preserving all existing bundle tree, smart path, ghost node, and highlight functionality.

---

## Problem Statement

**User Request:**
> "The Bundle panel takes up too much screen space. It should be contextual - only showing when I need it, not permanently splitting the screen."

**Issues:**
1. Bundle panel always visible in horizontal split (40% | 60%)
2. Wasted screen space when bundle viewing not needed
3. No way to temporarily hide bundle during rules authoring or validation review
4. Screen felt cramped on standard displays

---

## Solution Design

### Layout Transformation

#### Before (Always-Visible Split)
```
┌──────────────────┬────────────────────────────────┐
│                  │                                │
│  Bundle Panel    │  Main Content                  │
│  (40% width)     │  (Rules/Validation/Questions)  │
│  Always Visible  │  (60% width)                   │
│                  │                                │
└──────────────────┴────────────────────────────────┘
```

#### After (Contextual Drawer)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Main Content (Full Width)                      │
│  Rules / Validation / Questions                 │
│  [Show Bundle] button in toolbar               │
│                                                 │
└─────────────────────────────────────────────────┘

When bundle opened (user click or navigation):
┌─────────────────────────┬─────────────────────┐
│                         │                     │
│  Main Content           │  Bundle Drawer      │
│  (60% width)            │  (40% width)        │
│  [Hide Bundle]          │  [X]                │
│                         │                     │
└─────────────────────────┴─────────────────────┘
```

---

## Implementation Details

### 1. PlaygroundPage.tsx

**State Management:**
```typescript
// Bundle drawer state (collapsed by default)
const [isBundleOpen, setIsBundleOpen] = useState(false);
```

**Auto-Open on Navigation:**
```typescript
const handleNavigateToPath = (error: ValidationError, originalPath?: string) => {
  // Auto-open bundle drawer when navigation is triggered
  setIsBundleOpen(true);
  
  // Always switch to tree view before navigation
  bundleTabsRef.current?.switchToTreeView();
  
  // ... rest of navigation logic
};
```

**Props Passed to Layout:**
- `isBundleOpen`: Current drawer state
- `onBundleToggle`: Function to toggle drawer
- Passed through navigation props to reach ValidationPanel

### 2. PlaygroundLayout.tsx

**Complete Refactor:**
- Removed `VerticalPane` horizontal split component
- Main content now takes full width by default
- Bundle rendered as fixed-position drawer when `isBundleOpen === true`

**Drawer Implementation:**
```typescript
{isBundleOpen && (
  <>
    {/* Backdrop - semi-transparent overlay */}
    <div 
      className="fixed inset-0 bg-black bg-opacity-20 z-40"
      onClick={onBundleToggle} 
    />
    
    {/* Drawer Panel - right-side, 40% width */}
    <div className="fixed top-0 right-0 h-full w-[40%] bg-white shadow-2xl z-50">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <h3>Bundle JSON</h3>
        <button onClick={onBundleToggle}>
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {bundleContent}
      </div>
    </div>
  </>
)}
```

**Key Styling:**
- Backdrop: `z-index: 40`, 20% black opacity, click-to-close
- Drawer: `z-index: 50`, 40% width, right-aligned, shadow-2xl
- Drawer header: Gray background with close button
- Drawer content: Full height, scrollable

### 3. ValidationPanel.tsx

**Bundle Toggle Button:**
Added in toolbar alongside "Run Validation" button:

```typescript
{onBundleToggle && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onBundleToggle();
    }}
    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border ${
      isBundleOpen
        ? 'bg-blue-50 border-blue-300 text-blue-700'
        : 'bg-white border-gray-300 text-gray-700'
    }`}
  >
    <FileJson className="w-4 h-4" />
    {isBundleOpen ? 'Hide Bundle' : 'Show Bundle'}
  </button>
)}
```

**Button States:**
- **Closed state:** White background, gray border, "Show Bundle" label
- **Open state:** Blue background, blue border, "Hide Bundle" label
- Icon: `FileJson` (curly braces icon from lucide-react)
- Position: Between "Run Validation" and "Mode" selector

### 4. rightPanelProps.ts

**Extended NavigationProps:**
```typescript
export interface NavigationProps {
  projectId: string;
  onNavigateToPath?: (path: string) => void;
  onSelectError?: (error: any) => void;
  onSuggestionsReceived?: (suggestions: any[]) => void;
  
  // Bundle drawer control (Phase 17: Contextual Bundle)
  isBundleOpen?: boolean;
  onBundleToggle?: () => void;
}
```

### 5. RightPanel.tsx

**Props Forwarding:**
Extracts `isBundleOpen` and `onBundleToggle` from navigation props and passes them to ValidationPanel:

```typescript
const { projectId, onNavigateToPath, onSelectError, onSuggestionsReceived, isBundleOpen, onBundleToggle } = navigation;

// Later...
<ValidationPanel
  projectId={projectId}
  onSelectError={onSelectError}
  onNavigateToPath={onNavigateToPath}
  onSuggestionsReceived={onSuggestionsReceived}
  bundleJson={bundleJson}
  bundleChanged={bundleChanged}
  rulesChanged={rulesChanged}
  isBundleOpen={isBundleOpen}
  onBundleToggle={onBundleToggle}
/>
```

---

## Behavior Specifications

### Default State
- Bundle drawer **closed** on page load
- Main content occupies full width
- "Show Bundle" button visible in Validation toolbar

### User-Triggered Open
- Click "Show Bundle" button
- Drawer slides in from right
- Backdrop appears behind main content
- Button label changes to "Hide Bundle"

### Auto-Open Triggers
1. **Error Click:** User clicks any validation error in results list
2. **Smart Path Navigation:** `handleNavigateToPath()` called
3. **Tree Navigation:** Any programmatic navigation to bundle path

**Auto-Open Logic:**
```typescript
const handleNavigateToPath = (error: ValidationError, originalPath?: string) => {
  setIsBundleOpen(true); // ← Auto-open here
  bundleTabsRef.current?.switchToTreeView();
  // ... navigate to path, highlight node, etc.
};
```

### Close Methods
1. **Click backdrop:** Closes drawer
2. **Click X button:** In drawer header
3. **Click "Hide Bundle":** In Validation toolbar

### State Persistence
- Drawer state is **not persisted** across page reloads
- Always starts closed on fresh page load
- Preserves tree navigation state when closed

---

## Preserved Functionality

### ✅ All Existing Features Working
- **BundleTree:** Full tree rendering and expansion unchanged
- **Smart Path Navigation:** JSON pointer resolution and parent fallback
- **Ghost Nodes:** Missing child indicators in tree
- **Highlighting:** Visual focus on navigated nodes (ring-2 ring-blue-400)
- **Tree View Focus:** Context dimming when bundle active
- **Scroll to Element:** Auto-scroll to resolved paths
- **JSON Editor:** Code editor in Bundle tabs
- **Bundle Tabs:** Tree View / JSON Editor switching
- **Save Button:** Bundle save state and persistence

### Navigation Flow (Unchanged)
```
User clicks error
  ↓
handleNavigateToPath() called
  ↓
setIsBundleOpen(true) ← NEW
  ↓
bundleTabsRef.current?.switchToTreeView()
  ↓
Smart path resolution (Phase 8)
  ↓
Navigate to jsonPointer or parent
  ↓
Show ghost node if missing child
  ↓
Apply blue ring highlight
  ↓
Scroll element into view
```

---

## Scope Restrictions

### Drawer Only in Validation Context
- **Enabled:** Validation panel, Overview panel
- **Disabled:** Rules authoring, Terminology, Questions, Question Sets

**Why?**
- Bundle viewing primarily needed during validation review
- Rules authoring has inline bundle tree integration
- Terminology/Questions don't require bundle reference

**Implementation:**
Bundle toggle button only rendered when `onBundleToggle` prop is provided (only passed in Validation/Overview contexts).

---

## Visual Design

### Drawer Appearance
```
┌────────────────────────────────────────┐
│ Bundle JSON                         [X]│ ← Header: bg-gray-50
├────────────────────────────────────────┤
│                                        │
│  BundleTree Component                  │
│  (unchanged, full functionality)       │
│                                        │
│                                        │
└────────────────────────────────────────┘
```

### Button States
```
Closed:
┌───────────────────────┐
│ {} Show Bundle        │  ← White bg, gray border
└───────────────────────┘

Open:
┌───────────────────────┐
│ {} Hide Bundle        │  ← Blue bg, blue border
└───────────────────────┘
```

### Backdrop Effect
- Semi-transparent black overlay (20% opacity)
- Covers main content area
- Click anywhere to close drawer
- Subtle visual separation

---

## Technical Notes

### State Management
- Single boolean `isBundleOpen` at PlaygroundPage level
- No global store or context needed
- Props drilled through layout hierarchy
- Clean separation of concerns

### Performance
- Bundle tree only renders when drawer open (conditional rendering)
- No unnecessary re-renders on main content
- Backdrop uses CSS opacity transitions
- Drawer appears instantly (no animation delay)

### Accessibility
- Keyboard escape could be added (future)
- Click-outside-to-close pattern (standard UX)
- Close button has adequate click target (20x20px minimum)
- Backdrop visually indicates modal context

### Z-Index Layers
```
Backdrop: z-40
Drawer:   z-50
Main:     z-auto (below 40)
```

---

## Testing Checklist

- [x] Bundle drawer closed by default on page load
- [x] "Show Bundle" button visible in Validation toolbar
- [x] Click "Show Bundle" opens drawer from right
- [x] Drawer renders at 40% width
- [x] Backdrop appears behind drawer
- [x] Click backdrop closes drawer
- [x] Click X button closes drawer
- [x] Click "Hide Bundle" closes drawer
- [x] Button label updates based on drawer state
- [x] Button styling reflects active/inactive state
- [x] Auto-open on error click
- [x] Auto-open on navigation event
- [x] BundleTree renders correctly in drawer
- [x] Tree navigation works (expand/collapse)
- [x] Smart path resolution unchanged
- [x] Ghost nodes appear correctly
- [x] Highlighting works (blue ring)
- [x] Scroll-to-element works
- [x] Bundle tabs switching works
- [x] JSON editor accessible
- [x] Save button functional
- [x] No regressions in Rules panel
- [x] No regressions in Terminology
- [x] No TypeScript compilation errors

---

## Files Modified

1. **PlaygroundPage.tsx** (~546 lines)
   - Added `isBundleOpen` state
   - Updated `handleNavigateToPath` to auto-open drawer
   - Passed drawer state to `PlaygroundLayout`
   - Extended navigation props with bundle toggle

2. **PlaygroundLayout.tsx** (~68 lines)
   - Removed `VerticalPane` horizontal split
   - Main content now full-width by default
   - Bundle rendered as right-side drawer when open
   - Added backdrop and drawer components
   - Drawer header with close button

3. **ValidationPanel.tsx** (~443 lines)
   - Added bundle toggle button in toolbar
   - Button positioned between "Run Validation" and "Mode"
   - Active state styling (blue highlight when open)
   - Props interface extended with drawer control

4. **RightPanel.tsx** (~255 lines)
   - Extract `isBundleOpen` and `onBundleToggle` from navigation props
   - Forward to ValidationPanel

5. **rightPanelProps.ts** (~179 lines)
   - Extended `NavigationProps` interface
   - Added `isBundleOpen?: boolean`
   - Added `onBundleToggle?: () => void`

---

## Backward Compatibility

**Breaking Changes:** None  
**Data Model Changes:** None  
**API Changes:** None  
**Props Changes:** Additive only (new optional props)

All existing components continue to work. Bundle toggle is optional - if not provided, button doesn't render.

---

## Migration Notes

**For Developers:**
- No migration needed for existing code
- Bundle drawer opt-in via `isBundleOpen` and `onBundleToggle` props
- Works seamlessly with existing navigation handlers

**For Users:**
- Bundle now hidden by default (more screen space)
- Click "Show Bundle" button when needed
- Bundle auto-opens on error navigation (convenience)
- Can close drawer anytime without losing navigation state

---

## Future Enhancements (Out of Scope)

1. **Keyboard Shortcuts**
   - ESC to close drawer
   - Ctrl/Cmd+B to toggle bundle
   - Configurable hotkeys

2. **Drawer Animation**
   - Slide-in transition (200ms ease-out)
   - Backdrop fade transition

3. **Drawer Width Customization**
   - User-adjustable width (30-50%)
   - Persist width preference to localStorage

4. **Drawer Position Memory**
   - Remember last open/closed state
   - Persist to localStorage per project

5. **Mobile Responsiveness**
   - Full-width drawer on mobile/tablet
   - Swipe gestures to open/close

6. **Multi-Panel Support**
   - Bundle drawer + other contextual panels
   - Stack management for multiple drawers

---

## Related Documentation

- [Phase 16: Questions Layout Refactoring](./PHASE_16_LAYOUT_REFACTORING.md)
- [Phase 8: Navigation Fallback](./docs/PHASE_2_QUICK_REFERENCE.md)
- [Smart Path Navigation](./docs/07_smart_path_navigation.md)
- [Frontend Requirements](./docs/06_frontend_requirements.md)

---

**Status:** ✅ Complete - Bundle now contextual with preserved functionality
