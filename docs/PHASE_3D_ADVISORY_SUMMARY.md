# Phase 3D: Rule Advisory Panel UI - Summary

## Overview
Phase 3D implements a **non-blocking Rule Advisory panel** that displays validation issues detected by the backend's `IRuleAdvisoryService`. The panel shows errors, warnings, and info messages grouped by severity, with click-to-navigate functionality.

---

## Features Implemented

### 1. **AdvisoryPanel Component**

**File**: [frontend/src/components/terminology/AdvisoryPanel.tsx](../frontend/src/components/terminology/AdvisoryPanel.tsx)

**Purpose**: Display rule advisories grouped by severity with collapsible sections

**Features**:
- **Severity Grouping**: Errors, Warnings, Info (separate collapsible sections)
- **Count Badges**: Shows count per severity level
- **Collapsible Sections**: Click to expand/collapse each severity group
- **Collapsible Panel**: Entire panel can be collapsed via ▼/▲ button
- **Loading State**: Spinner during API fetch
- **Error State**: Red banner if fetch fails
- **Empty State**: Green success message if no advisories
- **Non-Blocking Label**: "Non-blocking • Click to navigate" in header

**Props**:
```typescript
interface AdvisoryPanelProps {
  advisoryResponse: AdvisoryResponse | null;
  isLoading?: boolean;
  error?: string;
  onAdvisoryClick: (advisory: RuleAdvisory) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}
```

**Visual Structure**:
```
┌─────────────────────────────────────────────────────────┐
│ ▼ Rule Advisories  [2 Errors] [3 Warnings]  Non-blocking│
├─────────────────────────────────────────────────────────┤
│ ▼ Errors (2)                                            │
│   ❌ CODE_NOT_FOUND → patient-status-binding            │
│      Code 'active-v2' not found in CodeSystem           │
│      System: http://...  Code: active-v2                │
│                                                          │
│   ❌ CODESYSTEM_NOT_FOUND → obs-status-binding          │
│      CodeSystem not found                               │
│      System: http://...  Code: pending                  │
├─────────────────────────────────────────────────────────┤
│ ▼ Warnings (3)                                          │
│   ⚠️ DISPLAY_MISMATCH → patient-status-binding          │
│      Display doesn't match definition                   │
│      Display: Active  Expected: Active Status           │
└─────────────────────────────────────────────────────────┘
```

---

### 2. **AdvisorySection Component**

**Purpose**: Collapsible section for one severity level (Error/Warning/Info)

**Features**:
- Colored background by severity (red/yellow/blue)
- Expand/collapse toggle (▶/▼)
- Count badge
- Dividers between items

**Severity Colors**:
```typescript
const colors = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-700',
  },
};
```

---

### 3. **AdvisoryListItem Component**

**Purpose**: Individual advisory display with context

**Features**:
- Severity icon (❌ ⚠️ ℹ️)
- Advisory code (monospace, e.g., `CODE_NOT_FOUND`)
- Constraint ID (if applicable, e.g., `→ patient-status-binding`)
- Message (human-readable description)
- Context badges (system, code, display, expectedDisplay)
- Hover effect (colored background)
- Click to navigate

**Layout**:
```
┌───────────────────────────────────────────────────────────┐
│ ❌  CODE_NOT_FOUND → patient-status-binding               │
│                                                            │
│     Code 'active-v2' not found in CodeSystem              │
│                                                            │
│     [System: http://example.org/CodeSystem/status]        │
│     [Code: active-v2]  [Display: Active v2]              │
└───────────────────────────────────────────────────────────┘
```

**Context Badge Colors**:
- System/Code: Gray (`bg-gray-100`)
- Display: Gray
- Expected Display: Green (`bg-green-100 text-green-700`)

---

### 4. **Integration with TerminologyManagementScreen**

**Changes**:
- Added `advisoryResponse` state
- Added `isLoadingAdvisories` and `advisoryError` state
- Added `isAdvisoryPanelCollapsed` state
- Created `loadAdvisories()` function (fetches via `getAdvisories` API)
- Added `handleAdvisoryClick()` navigation handler
- Positioned AdvisoryPanel at bottom of screen (below three-column layout)
- Reload advisories after save (to detect new broken references)

**State Management**:
```typescript
const [advisoryResponse, setAdvisoryResponse] = useState<AdvisoryResponse | null>(null);
const [isLoadingAdvisories, setIsLoadingAdvisories] = useState(false);
const [advisoryError, setAdvisoryError] = useState<string | undefined>();
const [isAdvisoryPanelCollapsed, setIsAdvisoryPanelCollapsed] = useState(false);
```

**Advisory Fetching**:
```typescript
const loadAdvisories = async () => {
  setIsLoadingAdvisories(true);
  const result = await getAdvisories(projectId);
  if (result.success) {
    setAdvisoryResponse(result.data);
  } else {
    setAdvisoryError(result.error.message);
  }
  setIsLoadingAdvisories(false);
};
```

**Navigation Handler**:
```typescript
const handleAdvisoryClick = (advisory: RuleAdvisory) => {
  if (advisory.context.code) {
    setSelectedConceptCode(advisory.context.code);
  }
  // Future: Navigate to constraint editor if constraintId present
};
```

---

## Advisory Types Detected

### 1. **CODE_NOT_FOUND** (Error)
**Scenario**: AllowedAnswer references a code that doesn't exist in the CodeSystem

**Example**:
```
Constraint: patient-status-binding
AllowedAnswer: { system: "http://example.org/CodeSystem/status", code: "active-v2" }
CodeSystem has: ["active", "inactive", "pending"]
```

**Advisory**:
- Severity: `error`
- Code: `CODE_NOT_FOUND`
- Message: "Code 'active-v2' not found in CodeSystem"
- Context: `{ system, code, constraintId }`

---

### 2. **CODESYSTEM_NOT_FOUND** (Error)
**Scenario**: AllowedAnswer references a CodeSystem that doesn't exist

**Example**:
```
Constraint: obs-status-binding
AllowedAnswer: { system: "http://example.org/CodeSystem/nonexistent", code: "active" }
Project has: ["http://example.org/CodeSystem/status"]
```

**Advisory**:
- Severity: `error`
- Code: `CODESYSTEM_NOT_FOUND`
- Message: "CodeSystem 'http://example.org/CodeSystem/nonexistent' not found"
- Context: `{ system, code, constraintId }`

---

### 3. **DISPLAY_MISMATCH** (Warning)
**Scenario**: AllowedAnswer display doesn't match the CodeSystem concept's display

**Example**:
```
Constraint: patient-status-binding
AllowedAnswer: { system: "...", code: "active", display: "Active" }
CodeSystem concept: { code: "active", display: "Active Status" }
```

**Advisory**:
- Severity: `warning`
- Code: `DISPLAY_MISMATCH`
- Message: "Display 'Active' doesn't match CodeSystem definition 'Active Status'"
- Context: `{ system, code, display, expectedDisplay, constraintId }`

---

### 4. **DUPLICATE_CODE** (Error)
**Scenario**: CodeSystem has duplicate codes (including in hierarchy)

**Example**:
```
CodeSystem:
- concept[0]: { code: "active" }
- concept[1]: { code: "active" }  ← Duplicate
```

**Advisory**:
- Severity: `error`
- Code: `DUPLICATE_CODE`
- Message: "Code 'active' appears multiple times in CodeSystem"
- Context: `{ system, code }`

---

### 5. **MISSING_DISPLAY** (Info)
**Scenario**: Concept lacks a display name

**Example**:
```
Concept: { code: "active", display: null }
```

**Advisory**:
- Severity: `info`
- Code: `MISSING_DISPLAY`
- Message: "Concept 'active' is missing a display name"
- Context: `{ system, code }`

---

## UX Behavior

### Advisory Workflow

#### Initial Load
```
1. User opens TerminologyManagementScreen
2. Page loads CodeSystem, Constraints, Advisories (parallel)
3. Advisory panel shows at bottom:
   - If 0 advisories: Green success message
   - If >0 advisories: Grouped by severity (errors expanded, warnings expanded, info collapsed)
```

#### Click to Navigate
```
1. User sees advisory: "CODE_NOT_FOUND: Code 'active-v2' not found"
2. User clicks advisory
3. handleAdvisoryClick fires
4. Concept 'active-v2' is selected in left panel (if exists)
5. Middle panel shows concept details
6. User can see the issue and fix it
```

#### After Save
```
1. User renames concept 'active' → 'active-status'
2. User clicks "Save Changes"
3. Backend saves CodeSystem
4. loadAdvisories() is called
5. Backend detects: CODE_NOT_FOUND (constraints still reference 'active')
6. Advisory panel updates with new errors
7. User sees: "❌ CODE_NOT_FOUND: Code 'active' not found"
8. User realizes they need to update constraints manually
```

#### Collapse/Expand
```
1. User clicks "▼" in panel header
2. Entire panel collapses (only header visible)
3. User can focus on editing without advisory distraction
4. User clicks "▲" to expand again
```

---

## Non-Blocking Behavior Confirmation

### ✅ Advisories Do NOT Block Save

**Scenario**: User has broken references but clicks Save

**Behavior**:
1. User edits concept code 'active' → 'active-new'
2. Advisory panel shows: CODE_NOT_FOUND (constraints reference old code)
3. User clicks "Save Changes"
4. **Save succeeds** (no blocking dialog)
5. Advisory panel reloads, still shows CODE_NOT_FOUND
6. User must manually fix constraints

**Rationale**: Per spec, advisories are informational only, never blocking.

---

### ✅ Advisories Do NOT Show Modal Dialogs

**Scenario**: User attempts risky action (e.g., delete concept)

**Behavior**:
- No "Are you sure?" modal
- No "This will break 3 constraints" warning
- Action completes immediately
- Advisory panel updates after next save

**Rationale**: Non-blocking design, advisory system handles detection.

---

### ✅ Advisories Do NOT Auto-Fix

**Scenario**: Advisory suggests fix (e.g., "Expected display: Active Status")

**Behavior**:
- No "Fix Now" button
- No auto-update of AllowedAnswer display
- User must manually edit constraint

**Rationale**: User has full control, no magic auto-corrections.

---

### ✅ Advisories Are Always Visible (When Panel Expanded)

**Scenario**: User is editing with errors present

**Behavior**:
- Advisory panel always visible at bottom (unless collapsed)
- No popup/toast that auto-dismisses
- Persistent visibility ensures user is aware of issues

**Rationale**: Continuous feedback, not interruptive.

---

## Visual States

### Empty State (No Advisories)
```
┌─────────────────────────────────────────────────────────┐
│ ▼ Rule Advisories                     Non-blocking      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ✓  No advisories found.                               │
│      All terminology references are valid.              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```
**Background**: Green (`bg-green-50`)

---

### Loading State
```
┌─────────────────────────────────────────────────────────┐
│ 🔄  Loading advisories...                               │
└─────────────────────────────────────────────────────────┘
```
**Spinner**: Blue, next to text

---

### Error State (Fetch Failed)
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Failed to load advisories: Network error            │
└─────────────────────────────────────────────────────────┘
```
**Background**: Red (`bg-red-50`)

---

### Collapsed State
```
┌─────────────────────────────────────────────────────────┐
│ ▲ Rule Advisories  [2 Errors] [3 Warnings]  Non-blocking│
└─────────────────────────────────────────────────────────┘
```
**Only header visible**, body hidden

---

### Expanded with Advisories
```
┌─────────────────────────────────────────────────────────┐
│ ▼ Rule Advisories  [2 Errors] [3 Warnings]  Non-blocking│
├─────────────────────────────────────────────────────────┤
│ ▼ Errors (2)                                            │
│   ❌ CODE_NOT_FOUND → patient-status-binding            │
│   ❌ CODESYSTEM_NOT_FOUND → obs-binding                 │
├─────────────────────────────────────────────────────────┤
│ ▼ Warnings (3)                                          │
│   ⚠️ DISPLAY_MISMATCH → patient-status-binding          │
│   ⚠️ DISPLAY_MISMATCH → obs-status-binding              │
│   ⚠️ MISSING_DISPLAY → concept 'pending'                │
├─────────────────────────────────────────────────────────┤
│ ▶ Info (0)                                              │
└─────────────────────────────────────────────────────────┘
```
**Max height**: 320px (`max-h-80`), scrollable

---

## Navigation Behavior

### Current Implementation: Navigate to Concept

**Trigger**: User clicks advisory

**Logic**:
```typescript
const handleAdvisoryClick = (advisory: RuleAdvisory) => {
  if (advisory.context.code) {
    setSelectedConceptCode(advisory.context.code);
  }
};
```

**Effect**:
- Selects concept in left panel (blue highlight)
- Shows concept details in middle panel
- Right panel filters constraints for that concept

**Use Case**: CODE_NOT_FOUND advisory → click → view the concept (or realize it was deleted)

---

### Future Implementation: Navigate to Constraint

**Trigger**: User clicks advisory with `constraintId`

**Logic**:
```typescript
if (advisory.context.constraintId) {
  openConstraintEditor(advisory.context.constraintId);
}
```

**Effect**:
- Opens constraint editor (ConstraintEditorPanel)
- Highlights the specific AllowedAnswer causing the issue
- User can fix the broken reference

**Use Case**: DISPLAY_MISMATCH advisory → click → edit AllowedAnswer display

---

## API Integration

### Fetch Advisories

**Endpoint**: `GET /api/projects/{projectId}/terminology/advisories`

**Request**: None (all advisories for project)

**Response**:
```json
{
  "projectId": "project-123",
  "advisories": [
    {
      "advisoryCode": "CODE_NOT_FOUND",
      "severity": "error",
      "message": "Code 'active-v2' not found in CodeSystem",
      "context": {
        "system": "http://example.org/CodeSystem/status",
        "code": "active-v2",
        "constraintId": "patient-status-binding"
      }
    }
  ]
}
```

**Error Handling**: Uses `TerminologyResult<T>` pattern (non-blocking)

**Timing**:
1. Initial load (parallel with CodeSystem/Constraints)
2. After save (to detect new issues)

---

## Helper Functions Used

### From `api/advisoryApi.ts`

**filterBySeverity**:
```typescript
filterBySeverity(advisories, 'error')
// Returns: [advisory1, advisory2, ...]
```

**groupByCode**:
```typescript
groupByCode(advisories)
// Returns: Map<'CODE_NOT_FOUND', [advisory1, ...]>
```

**countBySeverity**:
```typescript
countBySeverity(advisories)
// Returns: { errors: 2, warnings: 3, info: 1 }
```

**formatAdvisoryMessage**:
```typescript
formatAdvisoryMessage(advisory)
// Returns: "Code 'active' not found | System: http://... | Code: active"
```

---

## Testing the Implementation

### Manual Test Cases

#### Test 1: No Advisories (Clean State)
```
1. Open TerminologyManagementScreen with valid CodeSystem
2. All concepts have correct references in constraints
3. ✅ Advisory panel shows: "✓ No advisories found"
4. ✅ Green background
```

#### Test 2: CODE_NOT_FOUND Advisory
```
1. Rename concept 'active' → 'active-new'
2. Save changes
3. ✅ Advisory panel reloads
4. ✅ Shows: "❌ CODE_NOT_FOUND: Code 'active' not found"
5. ✅ Context shows: System, Code, Constraint ID
6. Click advisory
7. ✅ Concept 'active-new' is selected (or shows "not found" if deleted)
```

#### Test 3: DISPLAY_MISMATCH Advisory
```
1. Concept has: { code: "active", display: "Active Status" }
2. Constraint has: { code: "active", display: "Active" }
3. Save changes
4. ✅ Advisory panel shows: "⚠️ DISPLAY_MISMATCH"
5. ✅ Context shows: Display: "Active" | Expected: "Active Status"
6. Click advisory
7. ✅ Concept 'active' is selected
```

#### Test 4: Collapse/Expand Panel
```
1. Advisory panel is expanded (default)
2. Click "▼" button in header
3. ✅ Panel collapses (only header visible)
4. Click "▲" button
5. ✅ Panel expands again
```

#### Test 5: Collapse/Expand Severity Section
```
1. Advisory panel shows: "▼ Errors (2)" (expanded)
2. Click "▼ Errors (2)"
3. ✅ Section collapses ("▶ Errors (2)")
4. ✅ Advisory list hidden
5. Click "▶ Errors (2)"
6. ✅ Section expands again
```

#### Test 6: Multiple Severities
```
1. CodeSystem has: 2 errors, 3 warnings, 1 info
2. ✅ Panel header shows: [2 Errors] [3 Warnings] [1 Info]
3. ✅ Errors section expanded by default
4. ✅ Warnings section expanded by default
5. ✅ Info section collapsed by default
```

---

## Known Limitations (Phase 3D)

### 1. **No Constraint Navigation**
- Clicking advisory selects concept, but doesn't open constraint editor
- Future: Add constraint editor integration

### 2. **No Advisory Highlighting in Table**
- Concepts with errors don't have visual indicator in left panel
- Future: Add red border or icon next to concept code

### 3. **No Advisory Badge in Constraint List**
- Right panel (ProjectConstraintsPanel) doesn't show advisory count per constraint
- Future: Add badge: "patient-status-binding [2 errors]"

### 4. **No Advisory Filtering**
- Cannot filter advisories by constraint or concept
- Future: Add search/filter controls

### 5. **No Advisory Export**
- Cannot export advisories to CSV/JSON
- Future: Add "Export Advisories" button

### 6. **No Real-Time Updates**
- Advisories only reload after save
- Future: Add debounced re-check (detect issues before save)

---

## Accessibility Considerations

### Keyboard Navigation
- **Current**: Panel uses buttons (focusable)
- **Future**: Add keyboard shortcuts:
  - `Alt+A` = toggle advisory panel
  - `Enter` on advisory = navigate
  - Arrow keys = navigate between advisories

### Screen Readers
- **Current**: Severity icons (❌⚠️ℹ️) may not be read correctly
- **Future**: Add aria-label: `<span aria-label="Error">{icon}</span>`

### Color Contrast
- **Current**: Red/yellow/blue backgrounds with dark text (WCAG AA compliant)
- **Future**: Test with contrast checker tools

---

## Performance Considerations

### Advisory Fetch Timing
- **Current**: Fetches on initial load + after save
- **Issue**: Large projects (100+ constraints) may have slow advisory detection
- **Mitigation**: Backend caching (not implemented yet)

### Render Performance
- **Current**: Renders all advisories (no virtualization)
- **Issue**: 100+ advisories may cause lag
- **Mitigation**: Add virtualization (react-window) if needed

---

## Files Modified/Created

### Created:
1. **AdvisoryPanel.tsx** (~320 lines) - Panel + Section + ListItem components

### Modified:
2. **TerminologyManagementScreen.tsx** - Added advisory state, fetch logic, navigation handler

**Total Lines**: ~400 lines added/modified

---

## Next Steps

### Phase 3E: Advanced Advisory Features
- Highlight concepts with errors in left panel (red icon)
- Add advisory badges to constraint list (error/warning count)
- Add filter/search for advisories
- Add advisory export (CSV/JSON)

### Phase 3F: Real-Time Advisory Detection
- Debounced re-check (detect issues before save)
- Show advisory preview during edit ("This will cause CODE_NOT_FOUND")
- Add "Find & Replace" tool (rename code everywhere at once)

### Phase 3G: Constraint Navigation
- Click advisory → open constraint editor
- Highlight specific AllowedAnswer causing issue
- Add "Fix Now" buttons (optional, user-initiated)

---

## Conclusion

Phase 3D delivers a **non-blocking Rule Advisory panel**:
- ✅ Fetches advisories via `getAdvisories` API
- ✅ Groups by severity (Error/Warning/Info)
- ✅ Collapsible sections + collapsible panel
- ✅ Click to navigate (selects concept in list)
- ✅ Severity badges and colored backgrounds
- ✅ Context display (system, code, constraint ID)
- ✅ Empty/loading/error states
- ✅ Reloads after save (detects new issues)

**Non-Blocking Confirmed**:
- ❌ No save blocking (advisories never prevent save)
- ❌ No modal dialogs (no "Are you sure?" warnings)
- ❌ No auto-fix buttons (user has full control)
- ✅ Always visible (persistent feedback, not intrusive)

**Advisory Types Detected**:
1. CODE_NOT_FOUND (error)
2. CODESYSTEM_NOT_FOUND (error)
3. DISPLAY_MISMATCH (warning)
4. DUPLICATE_CODE (error)
5. MISSING_DISPLAY (info)

**Next**: Phase 3E will add visual indicators in the concept/constraint lists.
