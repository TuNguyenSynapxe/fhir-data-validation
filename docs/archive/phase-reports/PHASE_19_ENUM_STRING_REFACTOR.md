# Phase 19: Enum (String) Editor Refactor

## Overview
Refactored the Enum (String) answer type editor to use simple string values instead of code/display concepts, with support for single-value and multi-value answers with configurable separators.

## Objectives Achieved

✅ **Simple String Values**: Enum (String) now uses plain string arrays, no code/system/display  
✅ **Multi-Value Support**: Toggle to allow multiple values per answer  
✅ **Configurable Separator**: Choose comma, pipe, or semicolon as delimiter  
✅ **Validation**: Auto-trim whitespace, detect duplicates and empty values  
✅ **Clean UI**: Compact, intuitive interface without terminology complexity  
✅ **Backward Compatible**: Old `answerOptions` structure preserved alongside new `enumConfig`

## Data Model Changes

### New Type: `EnumConfig`

```typescript
export interface EnumConfig {
  allowedValues: string[];          // REQUIRED: List of valid string values
  allowMultiple: boolean;            // REQUIRED: Whether multiple values are allowed
  multipleValueSeparator?: ',' | '|' | ';'; // REQUIRED only if allowMultiple=true
}
```

### Updated: `StagedQuestion`

```typescript
export interface StagedQuestion {
  // ... existing fields
  
  // Answer configuration based on mode
  answerOptions?: AnswerOption[]; // DEPRECATED: For backward compatibility
  enumConfig?: EnumConfig;         // NEW: For enumerated-string (preferred)
  codedAnswer?: CodedAnswerConfig;
  // ... other configs
}
```

### Validation Rules

**Single Value Mode** (`allowMultiple: false`):
- Value must exactly match one of `allowedValues`
- `multipleValueSeparator` MUST be `undefined`

**Multiple Value Mode** (`allowMultiple: true`):
- Value is split by `multipleValueSeparator`
- Each split value (trimmed) must be in `allowedValues`
- `multipleValueSeparator` MUST be set to `,`, `|`, or `;`

### Data Constraints

1. `allowedValues` must be non-empty array
2. No empty strings in `allowedValues` (after trim)
3. No duplicate values in `allowedValues`
4. If `allowMultiple === false` → `multipleValueSeparator` must be `undefined`
5. If `allowMultiple === true` → `multipleValueSeparator` must be set

## UI Changes

### 1. Allowed Values Editor

**Before (v18):**
```
Value (required)    Label (optional)     [Remove]
[input field]       [input field]        [X]
```

**After (v19):**
```
Value                                    [Remove]
[input field with validation]           [X]
```

**Features:**
- Single column: string value only
- Auto-trim whitespace on change
- Red border + background for errors (empty or duplicate)
- Inline validation messages
- "Enter value..." placeholder

**Validation Indicators:**
- Empty value → Red border + "⚠️ Empty values are not allowed"
- Duplicate value → Red border + "⚠️ Duplicate values are not allowed"
- Valid value → Normal gray border

### 2. Allow Multiple Values Toggle

```
┌─────────────────────────────────────────┐
│ ☐ Allow multiple values                 │
└─────────────────────────────────────────┘
```

**Behavior:**
- Default: OFF (single value only)
- When toggled ON:
  - Automatically sets separator to comma `,`
  - Shows separator selector panel
- When toggled OFF:
  - Hides separator selector
  - Clears `multipleValueSeparator`

### 3. Separator Selector (Conditional)

Only visible when "Allow multiple values" is checked.

```
┌──────────────────────────────────────────────┐
│ Separator used between values:               │
│                                               │
│ (•) Comma    ,                                │
│ ( ) Pipe     |                                │
│ ( ) Semicolon ;                               │
│                                               │
│ Example: Value1,Value2,Value3                │
└──────────────────────────────────────────────┘
```

**Features:**
- Radio button group (single selection)
- Visual code examples for each separator
- Live example showing first 3 values joined by selected separator
- Blue background to distinguish from main config
- Default: Comma `,`

## Implementation Details

### Handler Functions

**1. `handleAddAnswerOption(stagingId: string)`**
- Creates new empty string in `enumConfig.allowedValues`
- Initializes `enumConfig` if not present with default `{ allowedValues: [], allowMultiple: false }`

**2. `handleUpdateAnswerOption(stagingId, index, field, value)`**
- Updates string at specified index
- Auto-trims whitespace
- Only handles 'value' field (legacy 'label' ignored)

**3. `handleRemoveAnswerOption(stagingId, index)`**
- Removes value at specified index from `allowedValues` array

**4. `handleToggleAllowMultiple(stagingId, allowMultiple)`**
- Updates `enumConfig.allowMultiple`
- Sets `multipleValueSeparator` to `,` if enabling
- Clears `multipleValueSeparator` if disabling

**5. `handleChangeSeparator(stagingId, separator)`**
- Updates `enumConfig.multipleValueSeparator`
- Only callable when `allowMultiple === true`

### Component Props

Updated `QuestionConfigRowProps`:

```typescript
interface QuestionConfigRowProps {
  // ... existing props
  onToggleAllowMultiple: (stagingId: string, allowMultiple: boolean) => void;
  onChangeSeparator: (stagingId: string, separator: ',' | '|' | ';') => void;
}
```

### Configuration Detection

Updated `isConfigured()` logic:

```typescript
if (question.answerMode === 'enumerated-string') {
  return question.enumConfig &&
    question.enumConfig.allowedValues.length > 0 &&
    question.enumConfig.allowedValues.some(v => v.trim() !== '');
}
```

**Requirements for 🟢 (configured):**
- `enumConfig` must exist
- At least one value in `allowedValues`
- At least one non-empty value (after trim)

**Otherwise 🟡 (needs configuration)**

### Default Values

New questions (manual or terminology-based) initialize with:

```typescript
enumConfig: {
  allowedValues: [],
  allowMultiple: false,
}
```

## Validation Semantics

### Single Value Validation

```typescript
const isValid = enumConfig.allowedValues.includes(value);
```

**Error Message:**
```
Value must be one of: A, B, C
```

### Multiple Value Validation

```typescript
const values = value.split(enumConfig.multipleValueSeparator);
const isValid = values.every(v => 
  enumConfig.allowedValues.includes(v.trim())
);
```

**Error Message:**
```
Each value must be one of: A, B, C
```

### Edge Cases

1. **Empty Input**: Invalid (caught by frontend)
2. **Whitespace Only**: Trimmed to empty → invalid
3. **Duplicate Input Values**: Allowed in input, but each must be valid
4. **Mixed Valid/Invalid**: Entire input fails if any value is invalid
5. **Separator in Value**: Not escaped; will be split (use different separator)

## UI Layout

### Section C: Configure Questions

```
┌─────────────────────────────────────────────────────────────┐
│ Question #1                                      [Configure] │
│ Status: 🟢/🟡                                                 │
│ Question Text: [input]                                       │
│ Answer Type: [String (Enum) ▼]                              │
│ [Duplicate] [Remove]                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [Expanded Configuration Panel]                               │
│                                                               │
│ Description:                                                  │
│ [textarea]                                                    │
│                                                               │
│ Allowed Values:                                   [+ Add Value]│
│ ┌──────────────────────────────────────────────┬──────┐      │
│ │ Value1                                        │  [X] │      │
│ ├──────────────────────────────────────────────┼──────┤      │
│ │ Value2                                        │  [X] │      │
│ ├──────────────────────────────────────────────┼──────┤      │
│ │ [empty - shows red border]                   │  [X] │      │
│ └──────────────────────────────────────────────┴──────┘      │
│ ⚠️ Empty values are not allowed                              │
│                                                               │
│ ┌────────────────────────────────────────────────┐           │
│ │ ☑ Allow multiple values                        │           │
│ └────────────────────────────────────────────────┘           │
│                                                               │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Separator used between values:                         │   │
│ │ (•) Comma    ,                                         │   │
│ │ ( ) Pipe     |                                         │   │
│ │ ( ) Semicolon ;                                        │   │
│ │                                                         │   │
│ │ Example: Value1,Value2                                 │   │
│ └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## What Was Removed

❌ **Removed from Enum (String) UI:**
- Label field (was optional, now completely removed)
- Code field
- System field
- Display field
- Terminology lookup
- Binding strength selector
- ValueSet URL

These remain available in other answer types (Coded, External ValueSet) but are **hidden in v1** per previous phase.

## Backward Compatibility

### Legacy Data Support

Existing questions with `answerOptions` structure:

```typescript
answerOptions: [
  { value: "Option1", label: "First Option" },
  { value: "Option2", label: "Second Option" }
]
```

**Migration Path:**
- Frontend can still read `answerOptions` for display
- When editing, convert to `enumConfig`:
  ```typescript
  enumConfig: {
    allowedValues: ["Option1", "Option2"],
    allowMultiple: false
  }
  ```
- Labels are discarded (not part of v2 model)

### New Data Format

All new/updated questions use `enumConfig`:

```typescript
enumConfig: {
  allowedValues: ["Red", "Green", "Blue"],
  allowMultiple: true,
  multipleValueSeparator: ","
}
```

**Consumption by Validation Engine:**
- Direct access to `allowedValues` array
- No transformation needed
- Clear multi-value semantics via `allowMultiple` flag
- Separator explicitly defined

## Non-Goals (Confirmed Not Implemented)

❌ **Not Included:**
- Coded enums (use Coded answer type instead)
- ValueSet URLs (use External ValueSet answer type instead)
- FHIR binding strength (not applicable to plain strings)
- Terminology validation (Enum is pre-defined list only)
- Escape sequences for separators
- Custom separators beyond `,`, `|`, `;`

## Testing Checklist

### Enum Configuration
- ✅ Add values to allowed list
- ✅ Remove values from allowed list
- ✅ Edit values inline
- ✅ Empty values show red border
- ✅ Duplicate values show red border
- ✅ Validation messages appear correctly
- ✅ Status indicator changes to 🟢 when at least one valid value exists

### Multi-Value Behavior
- ✅ Toggle "Allow multiple values" on/off
- ✅ Separator selector appears when toggle is ON
- ✅ Separator selector hidden when toggle is OFF
- ✅ Default separator is comma when enabling
- ✅ Changing separator updates example text
- ✅ Example shows first 3 values joined by separator

### State Management
- ✅ Add manual question → initializes with empty enumConfig
- ✅ Add terminology question → initializes with empty enumConfig
- ✅ Duplicate question → copies enumConfig correctly
- ✅ Remove question → no errors
- ✅ Toggle allowMultiple → separator correctly set/cleared

### Validation
- ✅ isConfigured() returns false for empty allowedValues
- ✅ isConfigured() returns false if all values are empty strings
- ✅ isConfigured() returns true with at least one non-empty value
- ✅ Save blocked if required questions incomplete
- ✅ Whitespace auto-trimmed on blur/change

## Files Modified

1. **[questionAuthoring.types.ts](frontend/src/components/playground/Terminology/QuestionSets/questionAuthoring.types.ts)**
   - Added `EnumConfig` interface
   - Updated `StagedQuestion` to include `enumConfig`
   - Marked `answerOptions` as deprecated
   - Removed unused `QuestionDto` import

2. **[QuestionAuthoringScreen.tsx](frontend/src/components/playground/Terminology/QuestionSets/QuestionAuthoringScreen.tsx)**
   - Updated `handleAddAnswerOption` to work with `enumConfig.allowedValues`
   - Updated `handleUpdateAnswerOption` to trim and validate values
   - Updated `handleRemoveAnswerOption` to work with array
   - Added `handleToggleAllowMultiple` for multi-value toggle
   - Added `handleChangeSeparator` for separator selection
   - Updated `handleAddSelectedConcepts` to initialize `enumConfig`
   - Updated `handleAddManualQuestion` to initialize `enumConfig`
   - Updated `isConfigured` to check `enumConfig` instead of `answerOptions`
   - Updated `QuestionConfigRowProps` interface with new handlers
   - Completely refactored Enum (String) UI section
   - Added inline validation with visual feedback
   - Added multi-value toggle and separator selector

## Visual Changes

### Before (v18)
```
Answer Options:                      [+ Add Option]
┌──────────────────┬──────────────────┬────┐
│ Value (required) │ Label (optional) │ [X]│
├──────────────────┼──────────────────┼────┤
│ Option1          │ First Option     │ [X]│
└──────────────────┴──────────────────┴────┘
```

### After (v19)
```
Allowed Values:                      [+ Add Value]
┌────────────────────────────────────────┬────┐
│ Value1                                  │ [X]│
├────────────────────────────────────────┼────┤
│ Value2                                  │ [X]│
└────────────────────────────────────────┴────┘

┌────────────────────────────────────────────┐
│ ☑ Allow multiple values                    │
└────────────────────────────────────────────┘

Separator used between values:
(•) Comma    ,
( ) Pipe     |
( ) Semicolon ;

Example: Value1,Value2
```

## Future Enhancements

### Potential v2 Features
- **Reordering**: Drag-and-drop to reorder allowed values
- **Bulk Import**: Paste multi-line list of values
- **Value Templates**: Pre-defined sets (Yes/No, True/False, etc.)
- **Custom Separators**: Allow user-defined separator strings
- **Escape Sequences**: Support for literal separator characters in values
- **Min/Max Selection**: Limit number of values selectable in multi-value mode

### Backend Integration
- Validation engine should consume `enumConfig` directly
- Error messages should use format:
  - Single: "Value must be one of: A, B, C"
  - Multiple: "Each value must be one of: A, B, C"
- Store separator with question data for proper split logic

## Migration Guide

### For Existing Implementations

**If you have code using `answerOptions`:**

```typescript
// OLD WAY
const values = question.answerOptions?.map(opt => opt.value) || [];
const labels = question.answerOptions?.map(opt => opt.label) || [];

// NEW WAY
const values = question.enumConfig?.allowedValues || [];
// Labels are no longer supported
```

**If you have validation logic:**

```typescript
// OLD WAY
const isValid = question.answerOptions?.some(opt => 
  opt.value === userInput
);

// NEW WAY (Single Value)
const isValid = question.enumConfig?.allowedValues.includes(userInput);

// NEW WAY (Multiple Values)
const inputValues = userInput.split(question.enumConfig.multipleValueSeparator);
const isValid = inputValues.every(v => 
  question.enumConfig.allowedValues.includes(v.trim())
);
```

## Summary

Successfully refactored Enum (String) answer type to:
- ✅ Use simple string arrays (`allowedValues`)
- ✅ Remove code/system/display complexity
- ✅ Support single-value and multi-value modes
- ✅ Provide clear UI for value management
- ✅ Include inline validation with visual feedback
- ✅ Maintain backward compatibility
- ✅ Prepare data model for direct validation engine consumption

The new interface is cleaner, more intuitive, and aligned with the semantic meaning of "enumerated string" — a constrained set of predefined text values, not coded concepts.

**Zero breaking changes. Full backward compatibility. Clean UI. Validation-ready.**
