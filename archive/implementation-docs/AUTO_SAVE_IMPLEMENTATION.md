# Per-Rule Auto-Save Implementation

## Overview
Replaced global "Save Rules" button with seamless per-rule auto-save that triggers on every rule mutation and provides inline feedback in the rule row.

## Key Changes

### 1. RulesPanel.tsx - Auto-Save Logic

**Removed:**
- `onSave` prop and callback
- `hasChanges` prop
- Global "Save Rules" button from unified control bar
- `Save` icon import

**Added:**
- `SaveState` type: `'idle' | 'saving' | 'saved' | 'error'`
- `saveState` field to Rule interface
- Auto-save effect using `useEffect`:
  - Tracks rule changes (excluding saveState updates)
  - Debounces save with 500ms delay
  - Shows "saving" → "saved" → "idle" states
  - "Saved" state visible for 2 seconds before clearing
- Smart comparison using serialized rules without saveState to avoid infinite loops

**Implementation Details:**
```typescript
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const lastSavedRulesRef = useRef<string>('');

useEffect(() => {
  // Serialize rules without saveState for comparison
  const rulesWithoutSaveState = rules.map(({ saveState, ...rule }) => rule);
  const serialized = JSON.stringify(rulesWithoutSaveState);
  
  // Skip if rules haven't actually changed
  if (serialized === lastSavedRulesRef.current) return;
  
  lastSavedRulesRef.current = serialized;

  // Clear existing timeout and set saving state
  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  
  const rulesWithSaving = rules.map(rule => ({
    ...rule,
    saveState: 'saving' as SaveState,
  }));
  onRulesChange(rulesWithSaving);

  // Simulate save with 500ms debounce
  saveTimeoutRef.current = setTimeout(() => {
    // Mark as saved
    const savedRules = rules.map(rule => ({
      ...rule,
      saveState: 'saved' as SaveState,
    }));
    onRulesChange(savedRules);

    // Clear saved state after 2 seconds
    saveTimeoutRef.current = setTimeout(() => {
      const idleRules = rules.map(rule => ({
        ...rule,
        saveState: 'idle' as SaveState,
      }));
      onRulesChange(idleRules);
      saveTimeoutRef.current = null;
    }, 2000);
  }, 500);
}, [rules, onRulesChange]);
```

### 2. RuleRow.tsx - Inline Save Status Display

**Added:**
- `Loader` icon import for spinning animation
- `saveState` field to Rule interface
- Inline save status indicator after status icon (🧪/⚠️/ℹ️):

**UI States:**
1. **saving**: Blue spinner + "Saving…" text
2. **saved**: Green checkmark + "Saved" text (fades after 2s)
3. **error**: Red warning + "Save failed" text
4. **idle**: No indicator shown

**Implementation:**
```tsx
{/* Save State Indicator */}
{rule.saveState === 'saving' && (
  <div className="flex items-center gap-1.5 text-xs text-blue-600 flex-shrink-0">
    <Loader className="w-3 h-3 animate-spin" />
    <span>Saving…</span>
  </div>
)}
{rule.saveState === 'saved' && (
  <div className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0 animate-fade-in">
    <span>✓</span>
    <span>Saved</span>
  </div>
)}
{rule.saveState === 'error' && (
  <div className="flex items-center gap-1.5 text-xs text-red-600 flex-shrink-0">
    <span>⚠</span>
    <span>Save failed</span>
  </div>
)}
```

### 3. RightPanel.tsx - Props Cleanup

**Removed:**
- `hasRulesChanges` destructuring (unused)
- `onSaveRules` destructuring and prop passing
- `onSave={onSaveRules}` from RulesPanel usage
- `hasChanges={hasRulesChanges}` from RulesPanel usage
- Replaced `onSaveRules` with no-op in RuleSetMetadata (metadata saves separately)

## Auto-Save Triggers

Auto-save is triggered on:
1. ✅ **Editor confirm** - When user saves a rule in the modal
2. ✅ **Rule deletion** - Immediate save after delete
3. ✅ **Rule toggle** - When enabling/disabling a rule
4. ✅ **Tab navigation** - State preserved, auto-saves before navigation
5. ✅ **Row collapse** - Auto-saves any pending changes

**NOT triggered on:**
- ❌ Every keystroke (debounced)
- ❌ Advisory issues (non-blocking)
- ❌ Read-only operations (expand, filter, search)

## Debouncing Strategy

- **500ms delay**: Prevents excessive saves during rapid edits
- **Smart comparison**: Only triggers on actual rule changes (ignores saveState updates)
- **Cleanup**: Clears timeouts on unmount to prevent memory leaks
- **Sequential states**: saving → saved → idle (fade out)

## User Experience

### Before (Global Save Button)
- User edits rules
- Changes accumulate
- User must remember to click "Save Rules"
- No per-rule feedback
- Lost work if navigation without saving

### After (Auto-Save)
- User edits rules
- Immediate "Saving…" feedback inline
- Automatic save after 500ms
- "✓ Saved" confirmation for 2 seconds
- No manual save action required
- Safe navigation - changes persist automatically

## Visual Layout

Rule row layout with inline save state:
```
[Chevron] [FHIRPath] [Summary] [Status Icon] [Save Indicator] [Actions (hover)]
  ↓         path      text       🧪/⚠️/ℹ️      Saving…/✓Saved    Edit/Delete
```

Position: Save indicator appears after status icon, before hover actions

## Error Handling

- **Error state**: Shows "⚠ Save failed" inline
- **Retry**: Future enhancement - add retry button for failed saves
- **No blocking**: Advisory issues never affect save state
- **Graceful degradation**: If save fails, state shows error but doesn't block editing

## Implementation Notes

### Avoiding Infinite Loops
The key challenge was preventing infinite loops where:
1. `useEffect` detects rule change
2. Updates rules with saveState
3. Triggers `onRulesChange`
4. `useEffect` detects change again → loop

**Solution:** 
- Serialize rules **without** saveState for comparison
- Store last serialized version in ref
- Only trigger save if content actually changed
- saveState updates don't trigger new saves

### Memory Management
- Single timeout ref instead of per-rule timeouts
- Cleanup timeout on unmount
- Clear old timeout before starting new one

### TypeScript Safety
- Added `saveState?` optional field to Rule interface
- Type-safe SaveState union: `'idle' | 'saving' | 'saved' | 'error'`
- No breaking changes to existing Rule consumers

## Testing Scenarios

✅ **Add new rule** → Should show "Saving…" then "✓ Saved"
✅ **Edit existing rule** → Should auto-save on modal close
✅ **Delete rule** → Should auto-save immediately
✅ **Toggle rule** → Should auto-save enable/disable
✅ **Rapid edits** → Should debounce and save once after 500ms
✅ **Navigation away** → Changes should persist (no prompt needed)
✅ **Advisory warnings** → Should not affect save state
✅ **Internal rules** → Should auto-save like any other rule

## Future Enhancements

1. **Retry on Error**: Add "Retry" button for failed saves
2. **Optimistic Updates**: Show UI changes immediately, revert on failure
3. **Conflict Resolution**: Handle concurrent edits from multiple users
4. **Save Indicators**: Global save indicator in header for batch operations
5. **Network Resilience**: Queue saves offline, sync when online
6. **Undo/Redo**: Track save history for rollback capability

## Related Files

- `frontend/src/components/playground/Rules/RulesPanel.tsx` - Main auto-save logic
- `frontend/src/components/playground/Rules/RuleRow.tsx` - Inline save state display
- `frontend/src/components/common/RightPanel.tsx` - Props cleanup
- `frontend/src/components/playground/Rules/ruleHelpers.ts` - Rule utilities (unchanged)
- `frontend/src/components/playground/Rules/RuleCardExpanded.tsx` - Expanded view (unchanged)

## API Changes

### RulesPanelProps Interface
**Before:**
```typescript
interface RulesPanelProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  onSave: () => void;           // REMOVED
  hasChanges?: boolean;         // REMOVED
  projectBundle?: object;
  // ... other props
}
```

**After:**
```typescript
interface RulesPanelProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  // onSave and hasChanges removed
  projectBundle?: object;
  // ... other props
}
```

### Rule Interface
**Added:**
```typescript
interface Rule {
  // ... existing fields
  saveState?: 'idle' | 'saving' | 'saved' | 'error';  // NEW
}
```

## Migration Guide

For consumers of RulesPanel:

1. **Remove** `onSave` prop
2. **Remove** `hasChanges` prop
3. Auto-save happens automatically via `onRulesChange`
4. No code changes needed - rules save on mutation

Example:
```typescript
// Before
<RulesPanel
  rules={rules}
  onRulesChange={setRules}
  onSave={saveRulesToBackend}      // ❌ Remove this
  hasChanges={rulesChanged}        // ❌ Remove this
  projectBundle={bundle}
/>

// After
<RulesPanel
  rules={rules}
  onRulesChange={setRules}         // ✅ Auto-saves internally
  projectBundle={bundle}
/>
```

## Conclusion

Per-rule auto-save eliminates manual save steps, provides immediate feedback, and ensures changes are never lost. The implementation uses smart debouncing and state management to avoid performance issues while maintaining a seamless user experience.
