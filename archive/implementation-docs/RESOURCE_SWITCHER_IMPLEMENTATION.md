# Resource Switcher Implementation - Advanced Rules Drawer

## ✅ Implementation Complete

Resource switching with intent confirmation has been successfully implemented in the Advanced Rules drawer.

---

## 🧩 Components Created/Modified

### 1. **ResourceSwitchConfirmDialog.tsx** (NEW)
- Location: `frontend/src/components/playground/Rules/ResourceSwitchConfirmDialog.tsx`
- Purpose: Confirmation dialog when switching resources with pending intents
- Features:
  - Warning icon with amber styling
  - Shows current resource name
  - Exact copy: "You have pending rule changes for {currentResource}. Switching resource will discard them."
  - Two buttons: "Cancel" (gray) and "Switch Resource" (red)
  - Higher z-index (60) to appear above drawer (50)

### 2. **AdvancedRulesDrawer.tsx** (UPDATED)
- Added resource switcher UI in header
- Added state management:
  - `selectedResourceType` - currently selected resource
  - `pendingResourceSwitch` - resource pending confirmation
  - `hasPendingIntents` - tracks if intents exist
  - `treeKey` - forces TreeBasedRuleCreator re-mount
- Added resource type extraction from bundle:
  ```typescript
  const availableResourceTypes = useMemo(() => {
    // Extract unique resource types from bundle.entry
    // Falls back to initialResourceType if bundle unavailable
  }, [projectBundle, initialResourceType]);
  ```
- Added handlers:
  - `handleResourceChange` - checks for intents before switching
  - `switchResource` - performs the actual switch + re-mount
  - `handleConfirmSwitch` - confirms and switches
  - `handleCancelSwitch` - cancels pending switch
  - `handleIntentStateChange` - receives intent state from child

### 3. **TreeBasedRuleCreator.tsx** (UPDATED)
- Added optional prop: `onIntentStateChange?: (hasPending: boolean) => void`
- Added useEffect to notify parent when intent count changes:
  ```typescript
  useEffect(() => {
    if (onIntentStateChange) {
      onIntentStateChange(count > 0);
    }
  }, [count, onIntentStateChange]);
  ```
- No other logic changed

### 4. **RulesPanel.tsx** (UPDATED)
- Passed `projectBundle` prop to `AdvancedRulesDrawer`

---

## 🎯 Resource Switcher UI

**Location:** Inside drawer header, between title and helper text

```
┌────────────────────────────────────────┐
│ Advanced Rules (Preview)    [BETA]  × │
├────────────────────────────────────────┤
│ Resource: [ Patient ▼ ] (3 types)     │
└────────────────────────────────────────┘
```

**Implementation:**
- Label: "Resource:" (medium font weight)
- Dropdown: Native `<select>` with custom styling
- ChevronDown icon positioned absolutely
- Counter showing total types if > 1
- Dropdown shows all resource types alphabetically

---

## 🔄 Resource Switch Flow

### Case 1: No Pending Intents
```
User selects new resource
         ↓
  hasPendingIntents === false
         ↓
switchResource(nextResource) immediately
         ↓
   setTreeKey(prev => prev + 1)  ← Force re-mount
         ↓
TreeBasedRuleCreator remounts with new resourceType
         ↓
Schema fetched for new resource
         ↓
Fresh tree rendered
```

### Case 2: Pending Intents Exist
```
User selects new resource
         ↓
  hasPendingIntents === true
         ↓
setPendingResourceSwitch(nextResource)
         ↓
ResourceSwitchConfirmDialog opens
         ↓
    ┌────┴────┐
    │         │
  Cancel   Confirm
    │         │
    ↓         ↓
 Close   switchResource()
 Dialog  (clears intents via re-mount)
```

---

## 🧠 Key Design Decisions

### 1. **Force Re-mount Instead of State Clear**
- Uses `key={treeKey}` prop on `TreeBasedRuleCreator`
- Incrementing `treeKey` forces complete component unmount/remount
- This ensures:
  - All internal state reset
  - Hook state (useRuleIntentState) reset
  - No stale intent references
  - Clean slate for new resource

### 2. **Intent State Tracking**
- Parent (drawer) tracks whether child (tree) has intents
- Child notifies parent via callback: `onIntentStateChange(count > 0)`
- Parent uses this to decide whether confirmation needed
- No direct access to child's internal state

### 3. **Resource Type Extraction**
- Extracts from `bundle.entry[].resource.resourceType`
- Uses `Set` to get unique values
- Sorts alphabetically for consistent UX
- Falls back to `initialResourceType` if bundle unavailable

### 4. **No Intent Persistence**
- Switching resource = fresh start
- No attempt to carry intents across resources
- Clear UX: confirmation warns about discard
- Follows constraint: "Do NOT persist RuleIntents across resource switch"

---

## ✅ Constraints Verified

- ❌ Do NOT auto-sync with left Tree View → ✅ **Independent state**
- ❌ Do NOT allow multi-resource trees → ✅ **Single resource at a time**
- ❌ Do NOT persist RuleIntents across switch → ✅ **Re-mount clears all**
- ❌ Do NOT refactor schema traversal logic → ✅ **Unchanged**
- ❌ Do NOT change rule creation behaviour → ✅ **Unchanged**

---

## 📋 UX Copy Verification

**Confirmation Dialog:**
- Title: "Switch resource?" ✅
- Body: "You have pending rule changes for {currentResource}. Switching resource will discard them." ✅
- Cancel button: "Cancel" ✅
- Confirm button: "Switch Resource" ✅

**Resource Switcher:**
- Label: "Resource:" ✅
- Dropdown shows resource types ✅
- Counter: "({count} types available)" ✅

---

## 🧪 Testing Checklist

### Scenario 1: Single Resource Type
1. Open drawer with bundle containing only `Patient`
2. **Expected:** Dropdown shows only "Patient"
3. **Expected:** Dropdown disabled (no other options)
4. **Expected:** Counter shows "(1 type available)" or hidden

### Scenario 2: Multiple Resource Types
1. Open drawer with bundle containing `Patient`, `Observation`, `Encounter`
2. **Expected:** Dropdown shows all 3 types (alphabetical)
3. **Expected:** Counter shows "(3 types available)"
4. **Expected:** Dropdown enabled

### Scenario 3: Switch Resource (No Intents)
1. Start with "Patient" selected
2. No rule intents added
3. Change dropdown to "Observation"
4. **Expected:** Switches immediately, no confirmation
5. **Expected:** Schema tree reloads for Observation
6. **Expected:** Empty intent state

### Scenario 4: Switch Resource (With Intents)
1. Start with "Patient" selected
2. Add 2-3 rule intents (checkboxes checked)
3. **Expected:** Action bar shows "2 pending rules"
4. Change dropdown to "Observation"
5. **Expected:** Confirmation dialog appears
6. **Expected:** Dialog shows "You have pending rule changes for Patient..."
7. Click "Cancel"
8. **Expected:** Dialog closes, still on Patient, intents preserved
9. Change dropdown to "Observation" again
10. Click "Switch Resource"
11. **Expected:** Switches to Observation
12. **Expected:** Intent count = 0
13. **Expected:** Fresh schema tree for Observation

### Scenario 5: Resource Scope Visibility
1. Open drawer
2. **Expected:** Current resource always visible in header
3. Switch resource
4. **Expected:** Header updates immediately
5. Schema tree reloads
6. **Expected:** Tree shows correct resource structure

### Scenario 6: No Bundle Available
1. Open drawer with `projectBundle = undefined`
2. **Expected:** Falls back to initialResourceType ("Patient")
3. **Expected:** Dropdown shows ["Patient"]
4. **Expected:** No errors, tree loads normally

### Scenario 7: Apply Rules After Switch
1. Select "Patient"
2. Add intents
3. Click "Apply"
4. **Expected:** Rules created for Patient
5. Switch to "Observation"
6. Add intents
7. Click "Apply"
8. **Expected:** Rules created for Observation
9. **Expected:** Both sets of rules appear in main list

---

## 🔍 Code Quality

- ✅ TypeScript compilation: 0 errors
- ✅ Build successful: Exit Code 0, built in 1.92s
- ✅ No unused imports
- ✅ Proper state management
- ✅ React best practices (key prop for re-mount)
- ✅ Clean parent-child communication
- ✅ No prop drilling
- ✅ Memoized computed values
- ✅ Proper cleanup on unmount (via re-mount)

---

## 📦 Files Modified

1. **Created:** `ResourceSwitchConfirmDialog.tsx` (63 lines)
2. **Updated:** `AdvancedRulesDrawer.tsx` (+80 lines)
   - Added imports (useState, useMemo, ChevronDown, ResourceSwitchConfirmDialog)
   - Added state management (4 new state variables)
   - Added resource type extraction logic
   - Added resource switcher UI in header
   - Added handlers (4 new functions)
   - Added confirmation dialog component
3. **Updated:** `TreeBasedRuleCreator.tsx` (+8 lines)
   - Added optional `onIntentStateChange` prop
   - Added useEffect to notify parent
4. **Updated:** `RulesPanel.tsx` (+1 line)
   - Passed `projectBundle` to drawer

---

## 🎨 Design Principle

**"Rule authoring is always scoped, visible, and intentional."**

✅ **Scoped:** One resource at a time, clear schema boundary
✅ **Visible:** Resource always shown in header, can't be hidden
✅ **Intentional:** Explicit user action to switch, confirmation if needed

---

## 🚀 Ready for Testing

The implementation is complete and follows all specifications exactly:
- Resource switcher works with bundle data
- Dropdown shows all available resource types
- Switching with intents requires confirmation
- Intents are discarded on switch (via re-mount)
- Schema tree reloads correctly
- No existing logic modified
- All constraints respected
- Build passes with 0 errors

**Status: READY FOR USER ACCEPTANCE TESTING** 🚀

---

## 🔧 Technical Notes

### Why Force Re-mount?
- Ensures complete state reset
- Clears hook state (useRuleIntentState)
- No risk of stale data
- Simpler than manual state cleanup
- React best practice for full reset

### Why Track Intent State in Parent?
- Drawer needs to know if confirmation required
- TreeBasedRuleCreator owns the intent state
- Callback pattern avoids exposing internal state
- Clean separation of concerns

### Why Extract Resources from Bundle?
- Bundle is source of truth for available resources
- No hardcoded resource type list
- Dynamic based on actual data
- Matches user's context

### Why No Auto-sync with Left Tree?
- Different purposes:
  - Left tree: Navigation, viewing bundle structure
  - Right drawer: Rule authoring, schema-focused
- Independent state avoids confusion
- User explicitly chooses resource for rule creation
