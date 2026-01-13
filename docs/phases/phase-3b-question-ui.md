---
⚠️ HISTORICAL DOCUMENT  
This phase is complete. Do not use this document as a source of truth for new development.
---

# Phase 3B: Question Management UI — Complete

## Overview
Phase 3B delivers a complete, user-friendly Question management interface integrated into the Terminology section of the playground. The UI adapts dynamically based on answer types and enforces strict validation rules.

## ✅ Implementation Complete

### File Structure
```
frontend/src/
├── api/
│   └── questionsApi.ts                    # API client for Questions CRUD
├── components/
│   ├── common/
│   │   └── RightPanel.tsx                 # Updated to use TerminologyEditor
│   └── playground/
│       ├── TerminologyEditor.tsx          # Wrapper with Code Systems / Questions tabs
│       └── Terminology/
│           └── Questions/
│               ├── index.tsx              # Main Questions component
│               ├── QuestionListPanel.tsx  # Left panel: list/search/filter
│               ├── QuestionEditorPanel.tsx # Right panel: form + preview
│               ├── QuestionForm.tsx       # Core form with common fields
│               ├── QuestionConstraintsSection.tsx # Answer-type-specific UI
│               ├── QuestionPreviewPanel.tsx # Live preview
│               ├── question.types.ts      # TypeScript types
│               └── question.utils.ts      # Helper functions
```

### 1. API Client (questionsApi.ts)
Complete CRUD operations:
- `getQuestions(projectId)` - List all questions
- `getQuestion(projectId, id)` - Get single question
- `createQuestion(projectId, dto)` - Create new question
- `updateQuestion(projectId, id, dto)` - Update existing question
- `deleteQuestion(projectId, id)` - Delete question

All DTOs match backend contracts with proper typing.

### 2. QuestionListPanel (Left Panel)
Features:
- ✅ Search by code/display text
- ✅ Filter by answer type
- ✅ Alphabetical sorting by code
- ✅ Create new question button
- ✅ Delete with inline confirmation
- ✅ Shows question count
- ✅ Empty states for no results

UI:
```
Questions
────────────────────────
🔍 Search...
[Filter: All Types ▼]

[＋ New Question]

• HEIGHT
  Body height
  Quantity

• SMOKING_STATUS
  Smoking status
  Code
```

### 3. QuestionEditorPanel (Right Panel)
Two-column layout:
- **Left**: QuestionForm (editable)
- **Right**: QuestionPreviewPanel (read-only, live updates)

Features:
- ✅ Create/edit modes
- ✅ Live validation with inline errors
- ✅ Save disabled until valid
- ✅ Backend errors mapped to fields
- ✅ Success/error feedback

### 4. QuestionForm (Core Form)
Common fields (always visible):
- Code (immutable after save)
- Display (required)
- System (optional, defaults to http://example.org/questions)
- Answer Type (required, with confirmation dialog on change)
- Description (optional)

Features:
- ✅ Answer type change confirmation
- ✅ Resets constraints when type changes
- ✅ Immutable code after creation
- ✅ Inline validation errors

### 5. QuestionConstraintsSection (Answer-Type-Specific)
Dynamically renders based on answerType:

#### Quantity
- Unit dropdown (UCUM only) - **required**
- Min/Max value (optional)
- Decimal places (optional)

#### Code
- ValueSet URL - **required**
- Binding strength: required | extensible | preferred

#### String
- Max length (optional)
- Regex pattern (optional)
- Live pattern tester

#### Integer
- Min/Max value (whole numbers only, optional)

#### Decimal
- Min/Max value (optional)
- Decimal places (optional)

#### Boolean
- No configuration (just informational message)

### 6. QuestionPreviewPanel (Live Preview)
Shows:
- Question text
- Code
- Answer type with description
- All active constraints
- Updates in real-time as user edits

### 7. Validation UX
✅ **Inline validation only** (no toast spam)
- Field-level errors show below inputs
- Red borders on invalid fields
- Save button disabled when invalid
- Backend errors mapped to fields
- Min < Max validation
- Regex syntax validation
- Integer whole-number validation
- Type-specific constraint validation

✅ **Answer type change confirmation**
- Shows warning dialog
- Explains constraints will reset
- Requires explicit confirmation

### 8. Integration
✅ **Terminology Tab Structure**
```
Terminology (main tab)
├── Code Systems (existing CodeMasterEditor)
└── Questions (new Phase 3B)
```

✅ **Navigation**
- Accessible via Terminology tab
- Sub-tabs: Code Systems | Questions
- Independent state management
- No impact on Rules or other sections

## Validation Rules Enforced

### Code Type
✅ Requires: ValueSet URL
❌ Cannot have: Unit, numeric constraints

### Quantity Type
✅ Requires: Unit (UCUM)
❌ Cannot have: ValueSet, string constraints
✅ Optional: Min, Max, Precision

### Integer Type
✅ Optional: Min, Max (whole numbers only)
❌ Cannot have: Unit, ValueSet, Precision, string constraints

### Decimal Type
✅ Optional: Min, Max, Precision
❌ Cannot have: Unit, ValueSet, string constraints

### String Type
✅ Optional: MaxLength, Regex
❌ Cannot have: Unit, ValueSet, numeric constraints
✅ Live regex tester

### Boolean Type
❌ Cannot have: Any constraints

## Common UCUM Units Included
- kg (kilograms)
- g (grams)
- mg (milligrams)
- cm (centimeters)
- m (meters)
- mm[Hg] (millimeters of mercury)
- Cel (degrees Celsius)
- % (percent)
- min (minutes)
- h (hours)
- d (days)
- a (years)

## TypeScript Types
All components are fully typed with:
- QuestionDto - Backend response type
- CreateQuestionDto - Create/update request type
- QuestionFormData - Internal form state
- QuestionAnswerType - Answer type enum
- QuestionValidationError - Validation error structure

## Helper Functions
- `questionToFormData()` - Backend → Form mapping
- `formDataToCreateDto()` - Form → Backend mapping
- `validateQuestionForm()` - Client-side validation
- `getAnswerTypeDescription()` - Human-readable descriptions
- `testRegexPattern()` - Live regex testing

## User Experience Highlights

### Empty State
When no questions exist:
```
No questions yet
[＋ New Question] button is prominent
```

### Search/Filter
- Real-time search
- Type filtering
- Shows "X of Y questions"

### Validation Feedback
- ✅ Green checkmark for valid fields
- ❌ Red error text below invalid fields
- 🔒 Save disabled with cursor-not-allowed

### Delete Confirmation
- Inline confirmation (no modal)
- Shows below item
- Cancel/Delete buttons

## Acceptance Criteria

✅ Users can create/edit/delete Questions
✅ UI adapts correctly by answerType
✅ Invalid configurations are impossible
✅ Backend validation errors surfaced cleanly
✅ No rule logic touched
✅ No backend changes
✅ Folder structure clean
✅ All TypeScript errors resolved
✅ No legacy concepts exposed
✅ Code immutable after creation
✅ Answer type changes require confirmation

## Integration Points

### Backend API
- Connects to `/api/projects/{projectId}/questions`
- All 5 CRUD endpoints functional
- Error responses properly handled

### Frontend Navigation
- Integrated into Terminology tab
- Sub-tab: Questions (alongside Code Systems)
- No impact on existing CodeMaster functionality

## Out of Scope (Correctly Excluded)
❌ QuestionSet UI (Phase 3C)
❌ Rule integration changes
❌ Import/export functionality
❌ Versioning
❌ Permissions
❌ FHIRPath handling
❌ Legacy inline value lists
❌ Multi-answer questions

## Testing Notes
- All components compile without TypeScript errors
- Form validation works offline (client-side)
- Backend validation surfaces cleanly
- No console errors
- Live preview updates correctly
- Regex tester functional

---

**Phase 3B Question Management UI Complete**

All acceptance criteria met. UI is production-ready for Question management with strict validation and excellent UX.
