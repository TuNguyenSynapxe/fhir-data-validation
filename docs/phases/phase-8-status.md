---
⚠️ HISTORICAL DOCUMENT  
This phase is complete. Do not use this document as a source of truth for new development.
---

# Phase 8 Implementation: Ghost Nodes + Parent Highlight

## ✅ Completed Components

### 1. Navigation Fallback Resolver (`utils/navigationFallback.ts`)

**Purpose**: Find nearest navigable parent when jsonPointer is null or invalid.

**Key Functions**:
- `resolveNavigationTarget()` - Main entry point, returns NavigationTarget with:
  - `targetPointer` - Where to navigate (always valid)
  - `missingSegments` - Fields that don't exist (for ghost rendering)
  - `isExact` - Whether this is exact match or fallback
  - `fallbackReason` - Human-readable explanation

**Behavior**:
- If jsonPointer is valid → use it directly ✅
- If jsonPointer is invalid → walk up to find nearest parent ✅
- If jsonPointer is null → derive from FHIRPath ✅
- Always returns something navigable (never null) ✅

### 2. Parent Highlight Manager (`utils/parentHighlight.ts`)

**Purpose**: Manage temporary highlight animations for parent nodes.

**Key Features**:
- `createParentHighlight()` - Create highlight state
- `isHighlightActive()` - Check if highlight still active
- `getHighlightClasses()` - Get CSS classes for animation
- `PARENT_HIGHLIGHT_CSS` - Keyframe animation definition

**Animation**: 500ms pulse with red outline + background fade

### 3. Ghost Node Components (`components/playground/Bundle/GhostNode.tsx`)

**Purpose**: Render visual-only indicators for missing fields.

**Components**:
- `<GhostNode>` - Missing leaf field (e.g., `display (missing)`)
- `<GhostArrayIndex>` - Missing array element (e.g., `[0] (missing)`)
- `<GhostObject>` - Missing nested object with children

**Visual Design**:
- ✅ Dashed border (red/amber)
- ✅ Muted colors
- ✅ Italic text
- ✅ "(missing)" label
- ✅ AlertCircle icon
- ✅ Tooltip explanations
- ✅ Respects tree indentation

**Constraints**:
- ❌ No editing (Phase 9+)
- ❌ No persistence
- ❌ No DOM modification
- ✅ Pure React components

### 4. CSS Animations (`index.css`)

Added global styles:
```css
@keyframes parent-highlight-pulse {
  /* Subtle red outline + background fade */
  /* 500ms duration */
}

.parent-highlight-pulse {
  animation: parent-highlight-pulse 500ms ease-out;
}
```

### 5. PlaygroundPage Integration

**Updated** `handleNavigateToPath()`:
- Accepts `jsonPointerOrError` (string OR ValidationError object)
- Accepts optional `fhirPath` for fallback
- Uses `resolveNavigationTarget()` for smart fallback
- Passes `missingSegments[0]` as `expectedChildKey` to BundleTree
- Shows user feedback for fallback navigation
- Activates TreeView focus mode with highlight

**Signature**:
```typescript
handleNavigateToPath(
  jsonPointerOrError: string | { jsonPointer?: string; path?: string },
  fhirPath?: string
)
```

## 🔄 Integration Points

### BundleTree (Existing - Phase 7.1)

Already supports:
- ✅ `expectedChildAt` prop (parent JSON Pointer)
- ✅ `expectedChildKey` prop (missing child key)
- ✅ `<MissingChildNode>` component rendering

**Current Behavior**:
- Shows dashed amber border for missing child
- Displays warning icon
- Non-interactive (no click/edit)

**Phase 8 Enhancement Needed**:
- Add parent highlight animation class when navigating
- Support multiple missing segments (nested ghosts)
- Apply `parent-highlight-pulse` class temporarily

### ValidationPanel / Error Cards

**Current**:
- Passes `jsonPointer` to `onNavigateToPath`
- Checks `if (jsonPointer)` before calling

**Phase 8 Compatible**:
- ✅ Still passes `jsonPointer` (string)
- ✅ New handler accepts both string and object
- ✅ Backward compatible with existing calls

## 📋 Acceptance Criteria Status

| Criteria | Status | Notes |
|----------|--------|-------|
| ✅ Required field missing → ghost node shown | ⏳ Partial | Ghost components ready, BundleTree integration needed |
| ✅ Required field empty → direct navigation | ✅ Done | Resolver checks `isJsonPointerValid()` |
| ✅ Array empty → ghost index shown | ⏳ Partial | `<GhostArrayIndex>` component ready |
| ✅ Filtered rule → correct instance only | ⏳ Next | Needs filter parsing in resolver |
| ✅ No dead clicks | ✅ Done | Always returns valid `targetPointer` |
| ✅ No backend changes | ✅ Done | Frontend-only implementation |

## 🚧 Remaining Work

### Step 1: Update BundleTree to Support Parent Highlighting

**File**: `components/playground/Bundle/BundleTree.tsx`

**Changes Needed**:
1. Add `highlightPointer?: string` prop
2. Import `getHighlightClasses()` from parentHighlight.ts
3. Apply highlight class to node matching `highlightPointer`
4. Auto-remove class after 500ms

**Example**:
```tsx
const nodeClasses = cn(
  'py-1 px-2',
  isSelected && 'bg-blue-50',
  getHighlightClasses(nodePointer, highlightState)
);
```

### Step 2: Pass Highlight State from PlaygroundPage

**File**: `pages/PlaygroundPage.tsx`

**Changes Needed**:
1. Add state: `const [highlightPointer, setHighlightPointer] = useState<string | null>(null)`
2. In `handleNavigateToPath()`, set `highlightPointer` when navigating to parent
3. Auto-clear after 500ms
4. Pass to BundleTree via BundleTabs

### Step 3: Enhance BundleTree for Multiple Ghost Segments

**Current**: Shows first missing segment only  
**Target**: Show nested ghosts (e.g., `performer.display` both missing)

**Implementation**:
```tsx
{missingSegments.map((segment, i) => (
  <GhostNode
    key={`ghost-${i}`}
    fieldKey={segment}
    depth={currentDepth + i + 1}
  />
))}
```

### Step 4: Add Filter Support to Navigation Fallback

**Target Behavior**:
```
Observation.where(code.coding.code='HS').performer.display
```

Should:
1. Parse `where()` clause
2. Find matching Observation(s)
3. Only expand/highlight matching instances
4. Render ghosts only inside filtered resources

**Parser Needed**:
```typescript
function parseWhereFilter(fhirPath: string): {
  resourceType: string;
  filterPath: string;
  filterValue: string;
} | null
```

### Step 5: Array Handling

**Empty Array Scenario**:
```json
"performer": []
```

**Expected Rendering**:
```
performer []
└── [0] (missing)
    └── display (missing)
```

**Implementation**: Check array length, if 0, render `<GhostArrayIndex index={0} />`

## 🧪 Testing Checklist

- [ ] Click error with valid jsonPointer → navigates to exact field
- [ ] Click error with null jsonPointer → navigates to parent + shows ghost
- [ ] Click error with invalid jsonPointer → walks up to nearest parent
- [ ] Parent node shows red pulse animation for 500ms
- [ ] Ghost nodes show dashed border + italic text
- [ ] Ghost nodes are not clickable
- [ ] Empty array shows `[0] (missing)` ghost index
- [ ] Nested missing fields show multiple ghost nodes
- [ ] Filter `where()` only expands matching resources
- [ ] No console errors
- [ ] No backend API calls made
- [ ] Focus mode activates and clears after 500ms

## 📝 Next Steps (Priority Order)

1. **Immediate**: Add parent highlight to BundleTree node rendering
2. **Quick Win**: Pass highlight state from PlaygroundPage to BundleTree
3. **Medium**: Support multiple ghost segments (nested missing fields)
4. **Complex**: Parse `where()` filters and apply to navigation
5. **Polish**: Array empty state with ghost index rendering

## 🎯 Phase 9 Preview (Out of Scope)

The following are **explicitly NOT implemented** in Phase 8:

- ❌ Auto-fix buttons ("+ Add" functionality)
- ❌ Schema inference
- ❌ Value generation
- ❌ Persistence of ghost nodes
- ❌ Editing capabilities

These belong to Phase 9+: Auto-Fix & Smart Suggestions.

---

## 🔧 Developer Notes

### Architecture Decisions

1. **Why fallback resolver instead of backend changes?**
   - Backend already provides jsonPointer when possible
   - Frontend fallback handles edge cases (null pointers, malformed data)
   - No API changes needed = faster deployment

2. **Why ghost components instead of DOM manipulation?**
   - React-first approach
   - Type-safe
   - Easier to test
   - No side effects

3. **Why 500ms highlight duration?**
   - Long enough to see
   - Short enough not to annoy
   - Matches Material Design recommendations

### Performance Considerations

- Navigation fallback walks up path (O(n) where n = path depth)
- Ghost rendering is lazy (only for navigated errors)
- Highlight animation uses CSS (GPU accelerated)
- No re-renders unless navigation state changes

### Accessibility Notes

- Ghost nodes have `title` tooltips
- `cursor-not-allowed` indicates non-interactivity
- High contrast colors (red/amber)
- AlertCircle icon provides visual cue

---

**Implementation Date**: December 24, 2025  
**Phase**: 8 - Ghost Nodes + Parent Highlight  
**Status**: Core utilities complete, integration in progress
