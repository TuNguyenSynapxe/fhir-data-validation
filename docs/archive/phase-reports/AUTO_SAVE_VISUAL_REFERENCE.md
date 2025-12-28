# Auto-Save Visual Reference

## Rule Row States

### 1. Idle State (Default)
```
┌─────────────────────────────────────────────────────────────────┐
│ ▶ Bundle.entry[0].resource  Required                        🧪 │ [Edit] [Delete]
└─────────────────────────────────────────────────────────────────┘
```
- No save indicator shown
- Normal rule display with status icon

### 2. Saving State (Immediately after edit)
```
┌─────────────────────────────────────────────────────────────────┐
│ ▶ Bundle.entry[0].resource  Required  🧪  ⟳ Saving…             │ [Edit] [Delete]
└─────────────────────────────────────────────────────────────────┘
```
- Blue spinner animation
- "Saving…" text in blue
- Appears after 500ms debounce

### 3. Saved State (Confirmation)
```
┌─────────────────────────────────────────────────────────────────┐
│ ▶ Bundle.entry[0].resource  Required  🧪  ✓ Saved               │ [Edit] [Delete]
└─────────────────────────────────────────────────────────────────┘
```
- Green checkmark
- "Saved" text in green
- Visible for 2 seconds, then fades to idle

### 4. Error State (Failed save)
```
┌─────────────────────────────────────────────────────────────────┐
│ ▶ Bundle.entry[0].resource  Required  🧪  ⚠ Save failed         │ [Edit] [Delete]
└─────────────────────────────────────────────────────────────────┘
```
- Red warning icon
- "Save failed" text in red
- Persists until retry or next successful save

## Layout Breakdown

```
[Chevron] [FHIRPath (200-300px)] [Summary (flex)] [Status Icon] [Save State] [Actions]
   ▶         Bundle.entry[0]        Required          🧪          ⟳ Saving…    Edit Delete
```

**Positions:**
- **Chevron**: 16px, left edge
- **FHIRPath**: Monospace, 200-300px fixed width, truncates with ellipsis
- **Summary**: Flex-1, takes remaining space, gray text
- **Status Icon**: 16px emoji, fixed position
- **Save State**: Inline indicator, 60-80px width, flex-shrink-0
- **Actions**: Hover-only buttons, right edge

## Color Scheme

| State   | Color     | Icon | Animation      |
|---------|-----------|------|----------------|
| saving  | `#2563eb` | ⟳    | Spin (1s loop) |
| saved   | `#16a34a` | ✓    | Fade in (0.3s) |
| error   | `#dc2626` | ⚠    | None           |
| idle    | -         | -    | None           |

## Interaction Flow

```
User Action → Debounce (500ms) → saving → API Call (mock) → saved → Wait (2s) → idle
                                     ↓ (on error)
                                   error → [Retry] → saving
```

## Unified Control Bar (After Removal)

### Before (with Save Button)
```
┌─────────────────────────────────────────────────────────────────┐
│ [📊 Filters]  Observations: ● Manual ● Observed               │
│                                                                 │
│                       [Export] [Add Rule] [Save Rules]          │
└─────────────────────────────────────────────────────────────────┘
```

### After (Auto-Save)
```
┌─────────────────────────────────────────────────────────────────┐
│ [📊 Filters]  Observations: ● Manual ● Observed               │
│                                                                 │
│                                   [Export] [Add Rule]           │
└─────────────────────────────────────────────────────────────────┘
```

**Changes:**
- ❌ Removed "Save Rules" button
- ❌ Removed Save icon import
- ✅ Kept Export and Add Rule buttons
- ✅ ~50px width reduction in control bar

## Save State Transitions

```
Idle
  ↓ (user edits rule)
Saving (500ms debounce)
  ↓ (save succeeds)
Saved (visible for 2s)
  ↓ (auto-fade)
Idle

         OR

Saving
  ↓ (save fails)
Error (persists)
  ↓ (user retries - future)
Saving
```

## Examples by Rule Type

### Internal Rule (🧪)
```
▶ entry[0].resource.extension[0].value  Fixed value = "active"  🧪  ✓ Saved
```

### Warning Advisory (⚠️)
```
▶ Bundle.type  Required  ⚠️  ⟳ Saving…
```

### Info Advisory (ℹ️)
```
▶ Patient.identifier  Length 1–5  ℹ️  ✓ Saved
```

## Expanded View (Unchanged)

When expanded, save state still shows in collapsed header:
```
┌─────────────────────────────────────────────────────────────────┐
│ ▼ Bundle.entry[0].resource  Required  🧪  ✓ Saved     [Actions] │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ FHIRPath Expression                                  [Copy] │ │
│ │ Bundle.entry[0].resource                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Rule Type: Required              Severity: error                │
│                                                                 │
│ Message: This field is required                                 │
│                                                                 │
│ Parameters: (none)                                              │
│                                                                 │
│ Rule Quality Advisory ▼ (non-blocking)                          │
│ ℹ️ This rule may be redundant with FHIR base validation        │
└─────────────────────────────────────────────────────────────────┘
```

## Mobile/Narrow Screen Behavior

On screens < 768px:
- FHIRPath truncates more aggressively (150px max)
- Summary text wraps to second line
- Save state moves below rule on very narrow screens
- Actions collapse to icon-only (no labels)

## Accessibility

- **ARIA labels**: Save state indicators have aria-live="polite" for screen readers
- **Focus management**: Save indicators don't steal focus
- **Keyboard**: Save happens on modal confirm (Enter key)
- **Color contrast**: All text meets WCAG AA standards (4.5:1 minimum)
- **Motion**: Spinning animation respects prefers-reduced-motion

## Performance Considerations

- **Debouncing**: 500ms prevents excessive saves during rapid edits
- **Comparison**: JSON serialization only on rule change (not every render)
- **Refs**: lastSavedRulesRef avoids re-renders on comparison
- **Cleanup**: Timeout cleared on unmount to prevent memory leaks
- **Batching**: Multiple rule edits in quick succession batched into single save

## Edge Cases Handled

1. ✅ **Rapid edits**: Debounced to single save
2. ✅ **Delete + Undo**: Each action triggers separate save
3. ✅ **Navigation mid-save**: Cleanup prevents dangling timeouts
4. ✅ **Concurrent edits**: Last edit wins (no conflict detection yet)
5. ✅ **Advisory warnings**: Never block save
6. ✅ **Empty rules**: Skip save on initial mount
7. ✅ **Same content**: Comparison prevents redundant saves
8. ✅ **Save state updates**: Don't trigger new saves (infinite loop prevention)

## Future UI Enhancements

1. **Retry button** on error state (currently shows error only)
2. **Undo/Redo** buttons with save history
3. **Global save indicator** in header for batch operations
4. **Optimistic UI updates** with rollback on failure
5. **Conflict resolution** dialog for concurrent edits
6. **Offline queue** for saves when network unavailable
