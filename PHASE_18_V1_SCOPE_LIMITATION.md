# Phase 18: V1 Scope Limitation — Question Authoring

## Overview
Enforced v1 scope limitation where **only "String (Enumerated)"** answer type is fully supported. All other answer types are disabled in the UI with "Coming soon" indicators.

## Implementation Summary

### 1. Default Answer Type
**Changed default to enumerated string** for all new questions:
- Manual tab: `answerType: 'EnumeratedString'`, `answerMode: 'enumerated-string'`
- Terminology tab: Added concepts default to enumerated string
- Form reset: Also defaults to enumerated string

**Modified Locations:**
- `manualForm` initial state (line ~245)
- `handleAddManualQuestion` reset logic (line ~275)
- `handleAddSelectedConcepts` concept mapping (line ~157)

### 2. Answer Type Dropdown
**Disabled all options except "String (Enum)":**

```tsx
<select value={getCombinedAnswerType()} onChange={...}>
  <option value="String (Enum)">String (Enum)</option>
  <option value="Coded (Manual)" disabled>Coded (Manual) — Coming soon</option>
  <option value="Coded (ValueSet)" disabled>Coded (ValueSet) — Coming soon</option>
  <option value="String (Free)" disabled>String (Free) — Coming soon</option>
  <option value="Number" disabled>Number — Coming soon</option>
  <option value="Boolean" disabled>Boolean — Coming soon</option>
  <option value="Date/Time" disabled>Date/Time — Coming soon</option>
</select>
```

**Added tooltip wrapper:**
- Shows tooltip on unsupported types: "Only String (Enum) is supported in v1. Other types coming soon."
- Increased dropdown width to `w-56` to accommodate "— Coming soon" text

**Modified Location:** `QuestionConfigRow` component (line ~1200)

### 3. Unsupported Question Warning
**Added warning banner for existing questions with non-v1 answer types:**

```tsx
{question.answerMode !== 'enumerated-string' && (
  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
    <span className="text-amber-600 font-semibold">⚠️</span>
    <div className="flex-1 text-amber-800">
      <strong>Unsupported Answer Type:</strong> This question uses a future answer type 
      that is not yet fully supported in v1. Configuration options are read-only for now.
    </div>
  </div>
)}
```

**Visual Treatment:**
- Amber background (`bg-amber-50`)
- Amber border (`border-amber-200`)
- Warning emoji (⚠️)
- Clear messaging about read-only state

**Modified Location:** Expanded configuration section (line ~1243)

### 4. Hidden Configuration Panels
**Conditionally disabled non-v1 configuration panels:**

```tsx
{/* Coded (Manual) - Hidden in v1 */}
{question.answerMode === 'coded-manual' && false && ( ... )}

{/* External ValueSet - Hidden in v1 */}
{question.answerMode === 'external-valueset' && false && ( ... )}

{/* Numeric Constraints - Hidden in v1 */}
{question.answerMode === 'numeric' && false && ( ... )}

{/* String Constraints - Hidden in v1 */}
{question.answerMode === 'string' && false && ( ... )}
```

**Implementation Strategy:**
- Used `&& false` to disable rendering without removing code
- Keeps component structure intact for future enablement
- Easy to re-enable by removing `&& false`

**Hidden Panels:**
- Coded (Manual) configuration (code/display/system fields)
- External ValueSet configuration (URL/binding strength)
- Numeric constraints (min/max/precision)
- String constraints (maxLength/regex)

**Visible Panels (v1 supported):**
- ✅ Enumerated String Options (value/label pairs with add/remove)
- ✅ Description field (works for all types)

### 5. Data Model Preservation
**No backend contract changes:**
- Type system unchanged in `questionAuthoring.types.ts`
- All answer types still valid in TypeScript
- API contracts preserved
- Existing saved data fully backward compatible

**Type Safety:**
- TypeScript still enforces full type system
- Frontend restricts UI only, not data model
- Future answer types can be enabled without breaking changes

## User Experience

### New Question Flow (v1 Scope)
1. User creates question via terminology or manual tab
2. Question automatically defaults to "String (Enum)"
3. Answer Type dropdown shows only "String (Enum)" as selectable
4. Other options visible but disabled with "Coming soon" labels
5. Configure section shows only enumerated string options
6. User adds answer options (value/label pairs)

### Existing Question Flow (Non-v1 Types)
1. User opens question set with legacy question types
2. Questions load with their original answer types
3. Warning banner appears in configure section: "Unsupported Answer Type"
4. Configuration panels hidden (read-only state)
5. Dropdown shows current type but can't be changed
6. User sees clear messaging: "not yet fully supported in v1"

### Visual Indicators
- **Disabled dropdown options:** Grayed out with "— Coming soon" suffix
- **Warning banner:** Amber background with ⚠️ emoji
- **Tooltip on dropdown:** Shows v1 scope message when hovering unsupported type
- **Status indicator:** 🟢/🟡 still works for enumerated string configuration

## Future Enablement Path

### To Enable Additional Answer Types:
1. Remove `&& false` from configuration panel condition
2. Remove `disabled` attribute from dropdown option
3. Remove "— Coming soon" text from option label
4. Update default tooltip logic to exclude newly supported type
5. Test configuration panel rendering
6. Update warning banner logic to exclude newly supported mode

**Example for enabling Number type:**
```tsx
// Before (v1):
<option value="Number" disabled>Number — Coming soon</option>
{question.answerMode === 'numeric' && false && ( ... )}

// After (v2):
<option value="Number">Number</option>
{question.answerMode === 'numeric' && ( ... )}
```

### Code Organization
All v1 scope logic is clearly marked with comments:
- `// V1 Scope Warning`
- `// Hidden in v1`
- `// Coming soon`

This makes it easy to search and update when expanding scope.

## Testing Checklist

### V1 Scope Enforcement
- ✅ New manual questions default to enumerated string
- ✅ New terminology questions default to enumerated string
- ✅ Answer Type dropdown only allows String (Enum)
- ✅ Disabled options show "Coming soon" suffix
- ✅ Tooltip appears on dropdown wrapper for unsupported types
- ✅ Form resets to enumerated string after adding question

### Unsupported Type Handling
- ✅ Warning banner appears for non-enumerated string questions
- ✅ Configuration panels hidden for unsupported types
- ✅ Questions still load and display correctly
- ✅ No console errors or TypeScript issues

### Configuration Panel Visibility
- ✅ Enumerated string options panel visible and functional
- ✅ Add/remove option buttons work correctly
- ✅ Value/label inputs editable
- ✅ Non-v1 panels completely hidden (coded, valueset, numeric, string)

### Data Integrity
- ✅ No backend contract changes
- ✅ Type system unchanged
- ✅ Existing saved questions load correctly
- ✅ Backward compatibility maintained

## Technical Notes

### Why `&& false` Instead of Removal?
Chose conditional rendering over code removal to:
1. **Preserve full implementation** for future enablement
2. **Minimize diff size** when re-enabling features
3. **Avoid accidental regressions** from removing/re-adding code
4. **Maintain code structure** and dependencies

### Why Disable Dropdown Options vs Hide Them?
Chose disabled options over hiding to:
1. **Show future roadmap** to users
2. **Prevent confusion** about missing features
3. **Set clear expectations** with "Coming soon" labels
4. **Maintain consistent option count** across UI states

### Tooltip Strategy
Used wrapper div with title attribute instead of disabling entire dropdown because:
1. **lucide-react icons** don't accept title prop directly
2. **Select elements** can't have tooltips on disabled options in some browsers
3. **Wrapper approach** provides consistent tooltip behavior

## Files Modified
1. [`QuestionAuthoringScreen.tsx`](frontend/src/components/playground/Terminology/QuestionSets/QuestionAuthoringScreen.tsx) (7 changes)
   - Default values for manualForm
   - handleAddSelectedConcepts concept mapping
   - Form reset logic
   - Answer Type dropdown with disabled options
   - Warning banner for unsupported types
   - Configuration panel conditional rendering

## Zero Breaking Changes
✅ No API contract changes  
✅ No data model changes  
✅ No type system changes  
✅ Full backward compatibility  
✅ No TypeScript errors  
✅ Clean compilation

## Summary
Successfully enforced v1 scope limitation to **only String (Enumerated)** answer type while preserving full codebase for future expansion. Users see clear messaging about unsupported types, and the UI prevents creation of non-v1 question types. Implementation is clean, reversible, and maintains zero breaking changes.
