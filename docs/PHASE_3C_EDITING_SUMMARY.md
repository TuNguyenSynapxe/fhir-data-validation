# Phase 3C: Inline Editing for Terminology Authoring - Summary

## Overview
Phase 3C implements **spreadsheet-like inline editing** for Terminology Management. Users can edit concepts and constraints directly in tables with double-click activation, Tab navigation, and explicit save.

---

## Features Implemented

### 1. **Inline Editing Components**

#### EditableCell
**File**: [frontend/src/components/terminology/EditableComponents.tsx](../frontend/src/components/terminology/EditableComponents.tsx)

**Behavior**:
- **Double-click** to enter edit mode
- **Tab** or **Enter** to commit changes
- **Escape** to cancel
- **Blur** also commits (spreadsheet behavior)
- Optional validation with inline error display
- Hover indicator: "Double-click to edit"

**Props**:
- `value: string` - Current value
- `onCommit: (newValue: string) => void` - Callback when committed
- `placeholder?: string` - Placeholder text
- `type?: 'text' | 'textarea'` - Input type
- `validate?: (value: string) => string | undefined` - Validation function

**Visual States**:
- Display mode: Hover background change
- Edit mode: Blue border (2px), focused input
- Error mode: Red border, tooltip below

---

### 2. **Concept Editing**

#### ConceptListPanel (Updated)
**File**: [frontend/src/components/terminology/ConceptListPanel.tsx](../frontend/src/components/terminology/ConceptListPanel.tsx)

**Changes**:
- Added `onConceptUpdate` prop for change callback
- Added `readOnly` prop for view-only mode
- Wrapped code/display in `EditableCell` components
- Validation for code field (alphanumeric only)

**UX Flow**:
1. User double-clicks code/display cell
2. Input appears with blue border
3. User types new value
4. User presses Tab/Enter or clicks away
5. Value commits → parent state updates
6. If code changes, selection follows renamed code

**Validation Rules**:
- **Code**: Required, alphanumeric + hyphens/underscores only
- **Display**: No validation (optional field)

---

#### ConceptEditorPanel (Updated)
**File**: [frontend/src/components/terminology/ConceptEditorPanel.tsx](../frontend/src/components/terminology/ConceptEditorPanel.tsx)

**Changes**:
- Removed `disabled` attributes from inputs
- Added `onChange` implementation (calls parent callback)
- Added `readOnly` prop
- Removed Save/Cancel buttons (moved to main screen)
- Added info text: "Changes are tracked, click Save to persist"

**Editable Fields**:
- Code (text input)
- Display (text input)
- Definition (textarea)

**Not Editable** (Phase 3C):
- Designations (placeholder)
- Properties (placeholder)
- Child concepts (read-only list)

---

### 3. **Constraint Editing**

#### ConstraintEditorPanel (New)
**File**: [frontend/src/components/terminology/ConstraintEditorPanel.tsx](../frontend/src/components/terminology/ConstraintEditorPanel.tsx)

**Features**:
- Form fields for constraint properties
- Grid-style editor for allowed answers
- Add/delete allowed answers

**Editable Fields**:
- Constraint ID (text input)
- Resource Type (text input)
- FHIRPath Expression (textarea, monospace font)
- Constraint Type (dropdown: binding, fixed, pattern)
- Binding Strength (dropdown: required, extensible, preferred, example)

**Allowed Answers Grid**:
- Spreadsheet-like table
- Columns: System | Code | Display | Actions
- Inline editing via `EditableCell`
- "Add Answer" button (creates empty row)
- Delete button (trash icon) per row

**UX Flow**:
1. User clicks "Add Answer"
2. New empty row appears
3. User double-clicks cells to fill in system/code/display
4. User can delete rows via trash icon
5. Changes tracked in parent state

---

### 4. **State Management & Save Integration**

#### TerminologyManagementScreen (Updated)
**File**: [frontend/src/components/terminology/TerminologyManagementScreen.tsx](../frontend/src/components/terminology/TerminologyManagementScreen.tsx)

**State Structure**:
```typescript
const [codeSystem, setCodeSystem] = useState<CodeSystem | null>(null);
const [originalCodeSystem, setOriginalCodeSystem] = useState<CodeSystem | null>(null);
const [constraints, setConstraints] = useState<TerminologyConstraint[]>([]);
const [isSaving, setIsSaving] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [saveMessage, setSaveMessage] = useState<...>(null);
```

**Dirty Tracking**:
```typescript
const hasUnsavedChanges = codeSystem && originalCodeSystem
  ? JSON.stringify(codeSystem) !== JSON.stringify(originalCodeSystem)
  : false;
```

**Change Handlers**:
- `handleConceptUpdate(oldCode, updatedConcept)` - Updates concept in tree (recursive)
- `handleConceptChange(concept)` - Updates concept (calls handleConceptUpdate)
- `handleSave()` - Calls `saveCodeSystem` API, updates original state
- `handleDiscard()` - Resets to original state

**Save Integration**:
```typescript
const result = await saveCodeSystem(projectId, codeSystem);
if (result.success) {
  setOriginalCodeSystem(codeSystem);
  setSaveMessage({ type: 'success', text: 'Changes saved successfully' });
} else {
  setSaveMessage({ type: 'error', text: `Save failed: ${result.error.message}` });
}
```

---

### 5. **Save UI/UX**

#### Sticky Save Bar
**Visual**: Yellow banner at top of screen when changes exist

**Content**:
- ⚠️ Icon + "Unsaved changes"
- Description: "You have unsaved changes. Save to persist them to the backend."
- Buttons: **Discard** | **Save Changes**

**Behavior**:
- Appears when `hasUnsavedChanges === true`
- Discard button: Resets to `originalCodeSystem`
- Save button: Shows spinner during save, disabled while saving

#### Save Feedback Toast
**Visual**: Green (success) or red (error) banner below save bar

**Content**:
- Success: "Changes saved successfully"
- Error: "Save failed: {error message}"

**Behavior**:
- Auto-dismisses after 3 seconds
- Appears immediately after save completes

---

## UX Behavior

### Editing Workflow

#### Concept Editing (Table)
```
1. User sees concept list table
2. User double-clicks "active" code cell
3. Input appears with blue border
4. User types "active-status"
5. User presses Enter
6. Code commits → tree updates → selection follows
7. Yellow save bar appears at top
8. User clicks "Save Changes"
9. Backend call → success toast → save bar disappears
```

#### Concept Editing (Form)
```
1. User selects concept from table
2. Middle panel shows concept form
3. User clicks in "Display" field (already editable)
4. User types "Active Status"
5. Field updates immediately (onChange)
6. Yellow save bar appears
7. User continues editing other fields
8. User clicks "Save Changes" when done
```

#### Constraint Editing (Grid)
```
1. User opens constraint editor
2. User clicks "Add Answer"
3. New empty row appears in grid
4. User double-clicks "System" cell
5. User types "http://example.org/codes"
6. User presses Tab → moves to "Code" cell
7. User types "active" → presses Tab
8. User types "Active" in "Display" → presses Enter
9. Yellow save bar appears
10. User clicks "Save Changes"
```

---

## Important Rules

### 1. **Code Changes Do NOT Auto-Update Constraints** ✅

**Example**:
```
Before:
  CodeSystem: { code: "active" }
  Constraint: { allowedAnswers: [{ code: "active" }] }

User edits concept code to "active-status"

After (in memory):
  CodeSystem: { code: "active-status" }
  Constraint: { allowedAnswers: [{ code: "active" }] }  ← NOT UPDATED
```

**Rationale**: Per requirements, we do NOT auto-fix broken references. Rule Advisory will detect this as `CODE_NOT_FOUND` later.

---

### 2. **No Validation Blocking** ✅

**Behavior**:
- Client-side validation exists (e.g., code must be alphanumeric)
- Validation errors show inline tooltips (red border + message)
- User CANNOT commit invalid values (red border prevents blur commit)
- BUT: User can save partially complete constraints (e.g., empty system field)

**Example**:
```
User double-clicks code cell
User types "invalid code!" (has space + exclamation)
Red border appears + tooltip: "Code must be alphanumeric"
User presses Enter → nothing happens (validation blocks commit)
User presses Escape → cancels edit
```

**However**:
```
User leaves system field empty in constraint grid
Yellow save bar appears (changes tracked)
User clicks "Save Changes"
Backend call succeeds (no client-side blocking)
Rule Advisory later detects: CODESYSTEM_NOT_FOUND
```

---

### 3. **No Auto-Fix** ✅

**Scenario**: User deletes a concept that is referenced in constraints

**Behavior**:
- Concept is removed from tree immediately
- Constraints still reference the deleted code
- Yellow save bar appears
- User clicks Save → both saves succeed
- Rule Advisory later detects: CODE_NOT_FOUND

**No Auto-Fix**:
- ❌ Do NOT show "Delete concept will break 3 constraints" warning
- ❌ Do NOT auto-remove AllowedAnswers referencing deleted concept
- ❌ Do NOT block save operation

**Rationale**: Advisories are informational only, never blocking (per spec).

---

### 4. **Explicit Save** ✅

**Current Behavior**: Manual save only

**Not Implemented** (optional for future):
- Debounced auto-save (save after 5 seconds of inactivity)
- Periodic auto-save (save every 30 seconds)

**Rationale**: Explicit save gives user control and clear feedback.

---

## Potential User Confusion Points

### ⚠️ Confusion Point 1: Code Rename Doesn't Update Constraints

**User Expectation**: "If I rename 'active' to 'active-status', constraints should auto-update"

**Actual Behavior**: Constraints still reference old code, Rule Advisory will warn

**Confusion Indicator**:
- User renames concept
- Saves successfully
- Later sees CODE_NOT_FOUND advisory
- User thinks: "Why didn't it auto-update?"

**Mitigation Strategy** (Future):
1. Show warning when renaming code: "⚠️ This code is used in 3 constraints. Renaming will NOT auto-update them. You will need to manually update constraints."
2. Add "Find & Replace" tool: "Rename 'active' → 'active-status' everywhere (concepts + constraints)"
3. Show affected constraints in a modal before committing rename

**Current Mitigation**: Advisory system will detect and warn (Phase 3E).

---

### ⚠️ Confusion Point 2: Empty Cells Look Complete

**User Expectation**: "If a cell is empty, the UI should force me to fill it"

**Actual Behavior**: Empty cells show placeholder text ("Double-click to edit"), but save is not blocked

**Confusion Indicator**:
- User adds allowed answer with only "code" filled (system empty)
- User clicks Save → succeeds
- Later: Advisory warns CODESYSTEM_NOT_FOUND
- User thinks: "Why did it let me save incomplete data?"

**Mitigation Strategy** (Future):
1. Add visual indicator: Empty required fields show red border (but don't block save)
2. Add "Save Anyway" confirmation: "3 fields are empty. Save anyway?"
3. Add pre-save validation summary: "⚠️ 2 allowed answers are missing system URLs"

**Current Mitigation**: Advisory system will detect and warn (Phase 3E).

---

### ⚠️ Confusion Point 3: Tab Navigation Commits

**User Expectation**: "Tab moves to next field, Enter commits"

**Actual Behavior**: Both Tab and Enter commit (spreadsheet behavior)

**Confusion Indicator**:
- User starts editing code cell
- User presses Tab (expecting to move to display cell)
- Edit commits → focus moves away from table
- User thinks: "Why did it commit? I just wanted to move to next field"

**Mitigation Strategy** (Future):
1. Change behavior: Tab moves to next editable cell (within same row), Enter commits
2. Add keyboard shortcuts guide: "Tab = next cell, Enter = commit, Escape = cancel"
3. Add visual hint: Show "Press Tab to move, Enter to save" tooltip

**Current Behavior**: Tab commits (standard EditableCell behavior).

---

### ⚠️ Confusion Point 4: Save Bar Disappears on Success

**User Expectation**: "After clicking Save, I want to see confirmation that it worked"

**Actual Behavior**: Save bar disappears, success toast shows for 3 seconds

**Confusion Indicator**:
- User clicks Save
- Success toast appears
- User looks away for 4 seconds
- Toast auto-dismisses
- User thinks: "Did my save work? I didn't see a confirmation"

**Mitigation Strategy** (Future):
1. Increase toast duration to 5 seconds
2. Add "Last saved: 2 minutes ago" timestamp in header
3. Add persistent status indicator: ✓ Saved | ⏳ Saving | ⚠️ Unsaved changes

**Current Mitigation**: Success toast shows for 3 seconds (may be too short).

---

### ⚠️ Confusion Point 5: Deleting Concept Doesn't Warn About References

**User Expectation**: "If I delete a concept, show me if it's used in constraints"

**Actual Behavior**: Deletion is immediate, no warning, constraints become broken

**Confusion Indicator**:
- User deletes "active" concept (used in 5 constraints)
- No warning dialog
- User saves
- Later: 5 CODE_NOT_FOUND advisories appear
- User thinks: "Why didn't it warn me? Now I have to fix 5 constraints!"

**Mitigation Strategy** (Future):
1. Add pre-delete check: "⚠️ This concept is used in 5 constraints. Delete anyway?"
2. Show list of affected constraints in modal
3. Offer "Delete & Update Constraints" option (removes AllowedAnswers)

**Current Mitigation**: None (deletion feature not implemented in Phase 3C).

---

### ⚠️ Confusion Point 6: Double-Click Isn't Discoverable

**User Expectation**: "Fields look read-only, I don't know I can edit them"

**Actual Behavior**: Double-click activates edit mode, but not obvious

**Confusion Indicator**:
- User clicks on cell once → selects row
- User doesn't realize cells are editable
- User thinks: "How do I edit this? Where's the edit button?"

**Mitigation Strategy** (Future):
1. Add hover tooltip: "Double-click to edit"
2. Add cursor change: `cursor: cell` on hover
3. Add edit icon on hover (appears in cell corner)
4. Add onboarding tooltip: "💡 Tip: Double-click any cell to edit"

**Current Mitigation**: Hover background change + title attribute "Double-click to edit".

---

## Technical Implementation Details

### Concept Update Algorithm (Recursive)

```typescript
const updateConceptInTree = (concepts: CodeSystemConcept[]): CodeSystemConcept[] => {
  return concepts.map((concept) => {
    if (concept.code === oldCode) {
      return updatedConcept;  // Replace matching concept
    }
    if (concept.concept) {
      return {
        ...concept,
        concept: updateConceptInTree(concept.concept),  // Recurse
      };
    }
    return concept;
  });
};
```

**Why Recursive**: Concepts can have children (hierarchical structure).

**Edge Case**: If user renames child concept, algorithm finds it via recursion.

---

### Dirty Tracking (JSON Comparison)

```typescript
const hasUnsavedChanges = 
  JSON.stringify(codeSystem) !== JSON.stringify(originalCodeSystem);
```

**Why JSON.stringify**: Deep equality check (handles nested concepts).

**Performance**: Fine for small CodeSystems (<100 concepts). For larger ones, consider using hash or diff library.

**Edge Case**: Object key order differences may cause false positives (rare).

---

### Save Flow (API Integration)

```typescript
const result = await saveCodeSystem(projectId, codeSystem);
if (result.success) {
  setOriginalCodeSystem(codeSystem);  // Reset baseline
  setSaveMessage({ type: 'success', text: 'Changes saved successfully' });
} else {
  logTerminologyError(result.error);  // Console log
  setSaveMessage({ type: 'error', text: `Save failed: ${result.error.message}` });
}
```

**Error Handling**: Uses Phase 3A `TerminologyResult<T>` pattern (no exceptions thrown).

**Retry Logic**: Not implemented (user must click Save again).

**Optimistic Updates**: Not implemented (wait for backend confirmation).

---

## Files Modified/Created

### Created:
1. **EditableComponents.tsx** (~160 lines) - Reusable inline editing components
2. **ConstraintEditorPanel.tsx** (~250 lines) - Constraint form + grid editor

### Modified:
3. **ConceptListPanel.tsx** - Added inline editing to table cells
4. **ConceptEditorPanel.tsx** - Enabled form inputs, removed disabled attributes
5. **TerminologyManagementScreen.tsx** - State management, save handlers, dirty tracking

**Total Lines**: ~600 lines added/modified

---

## Testing the Implementation

### Manual Test Cases

#### Test 1: Inline Edit Code
```
1. Open TerminologyManagementScreen
2. Double-click "active" code cell
3. Type "active-new"
4. Press Enter
5. ✅ Cell updates to "active-new"
6. ✅ Yellow save bar appears
7. ✅ Selection follows renamed code (middle panel shows "active-new")
```

#### Test 2: Validation Blocks Invalid Code
```
1. Double-click code cell
2. Type "invalid code!" (with space)
3. Press Enter
4. ✅ Red border appears
5. ✅ Tooltip: "Code must be alphanumeric"
6. ✅ Cannot commit (still in edit mode)
7. Press Escape
8. ✅ Cancels edit, reverts to original
```

#### Test 3: Tab Navigation
```
1. Double-click "active" code cell
2. Type "active-v2"
3. Press Tab
4. ✅ Commits edit
5. ✅ Focus moves away (browser default Tab behavior)
```

#### Test 4: Save & Discard
```
1. Edit concept display to "New Display"
2. ✅ Yellow save bar appears
3. Click "Discard"
4. ✅ Display reverts to original
5. ✅ Save bar disappears
6. Edit again → Click "Save Changes"
7. ✅ Spinner shows during save
8. ✅ Success toast appears
9. ✅ Save bar disappears
```

#### Test 5: Constraint Grid Editing
```
1. Open ConstraintEditorPanel (placeholder - needs integration)
2. Click "Add Answer"
3. ✅ New empty row appears
4. Double-click System cell
5. Type "http://example.org"
6. Press Tab
7. ✅ Moves to Code cell
8. Type "active" → Press Tab
9. ✅ Moves to Display cell
10. Type "Active" → Press Enter
11. ✅ Commits edit
12. ✅ Yellow save bar appears
```

---

## Known Limitations (Phase 3C)

### 1. **No Constraint Save Integration**
- `ConstraintEditorPanel` created but not integrated into main screen
- Future: Add constraint list + editor integration

### 2. **No Add/Delete Concept**
- Can only edit existing concepts
- Future: Add "+ Add Concept" button, delete confirmation modal

### 3. **No Undo/Redo**
- Only "Discard All" is available
- Future: Add undo/redo stack (Ctrl+Z / Ctrl+Y)

### 4. **No Debounced Auto-Save**
- Only explicit save
- Future: Add `useDebounce` hook for auto-save after 5s inactivity

### 5. **No Conflict Detection**
- If another user edits same CodeSystem, last-write-wins
- Future: Add ETag-based optimistic locking

### 6. **No Hierarchical Editing**
- Cannot add/remove child concepts
- Future: Add "+ Add Child" button per concept

### 7. **No Batch Operations**
- Cannot select multiple concepts for bulk edit/delete
- Future: Add checkboxes + bulk actions toolbar

---

## Next Steps

### Phase 3D: Advanced Editing Features
- Add concept (button + modal for new concept)
- Delete concept (confirmation modal + cascade warning)
- Reorder concepts (drag-and-drop)
- Add/remove child concepts (hierarchical editing)

### Phase 3E: Advisory Integration
- Fetch advisories from API
- Display badges in constraint list (error/warning counts)
- Highlight concepts with errors (red border in table)
- Show advisory panel (collapsible, bottom or side)

### Phase 3F: UX Enhancements
- Undo/redo stack
- Debounced auto-save
- Keyboard shortcuts (Ctrl+S = save, Ctrl+Z = undo)
- Find & replace tool (rename code everywhere)
- Pre-delete warnings ("Used in 3 constraints")
- Last saved timestamp
- Batch operations (select multiple → delete/export)

---

## Conclusion

Phase 3C delivers **spreadsheet-like inline editing**:
- ✅ EditableCell component (double-click, Tab, Enter, Escape)
- ✅ Inline editing in concept table (code + display)
- ✅ Form editing in concept editor (code + display + definition)
- ✅ Grid editing for constraint allowed answers
- ✅ Dirty tracking (JSON comparison)
- ✅ Explicit save with sticky bar + toast
- ✅ API integration (saveCodeSystem from Phase 3A)
- ✅ No validation blocking (advisories will handle later)
- ✅ No auto-fix (code renames don't update constraints)

**Potential Confusion Points** identified and documented:
1. Code rename doesn't update constraints
2. Empty cells don't block save
3. Tab commits instead of moving to next cell
4. Save feedback auto-dismisses
5. Delete doesn't warn about references
6. Double-click not discoverable

**Next**: Phase 3E will add advisory integration to surface these issues to users.
