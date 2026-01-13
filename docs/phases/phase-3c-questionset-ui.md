---
⚠️ HISTORICAL DOCUMENT  
This phase is complete. Do not use this document as a source of truth for new development.
---

# Phase 3C: QuestionSet Management UI — Complete

## Overview
Phase 3C delivers a complete QuestionSet management interface with strict dropdown-based reference selection (no free text). QuestionSets group Questions from a single Terminology with optional/required flags.

## ✅ Implementation Complete

### File Structure
```
frontend/src/
├── api/
│   └── questionSetsApi.ts                           # API client for QuestionSets CRUD
├── components/
│   └── playground/
│       ├── TerminologyEditor.tsx                    # Updated with QuestionSets tab
│       └── Terminology/
│           └── QuestionSets/
│               ├── index.tsx                        # Main QuestionSets component
│               ├── QuestionSetListPanel.tsx         # Left panel: list/search
│               ├── QuestionSetEditorPanel.tsx       # Right panel: form + preview
│               ├── QuestionSetForm.tsx              # Core form with basic fields
│               ├── QuestionSetQuestionPicker.tsx    # ⭐ Cascading selector component
│               ├── QuestionSetPreviewPanel.tsx      # Live preview
│               ├── questionSet.types.ts             # TypeScript types
│               └── questionSet.utils.ts             # Helper functions
```

### 1. API Client (questionSetsApi.ts)
Complete CRUD operations:
- `getQuestionSets(projectId)` - List all question sets
- `getQuestionSet(projectId, id)` - Get single question set
- `createQuestionSet(projectId, dto)` - Create new question set
- `updateQuestionSet(projectId, id, dto)` - Update existing question set
- `deleteQuestionSet(projectId, id)` - Delete question set

DTOs:
```typescript
interface QuestionSetDto {
  id: string;
  name: string;
  description?: string;
  terminologyUrl: string;
  questions: QuestionSetQuestionRefDto[];
  createdAt: string;
  updatedAt: string;
}

interface QuestionSetQuestionRefDto {
  questionId: string;
  required: boolean;
}
```

### 2. QuestionSetListPanel (Left Panel)
Features:
- ✅ Search by name or ID
- ✅ Alphabetical sorting
- ✅ Create new question set button
- ✅ Delete with inline confirmation
- ✅ Shows question count per set
- ✅ Empty states

UI:
```
Question Sets
────────────────────────
🔍 Search...

[＋ New Question Set]

• Vitals
  3 questions

• Hearing Screening
  5 questions
```

### 3. QuestionSetEditorPanel (Right Panel)
Two-column layout:
- **Left**: QuestionSetForm (editable)
- **Right**: QuestionSetPreviewPanel (read-only, live updates)

Features:
- ✅ Create/edit modes
- ✅ Live validation with inline errors
- ✅ Save disabled until valid
- ✅ Backend errors mapped to fields
- ✅ Success/error feedback

### 4. QuestionSetForm (Core Form)
Basic fields:
- **ID** (immutable after save, required)
- **Name** (required)
- **Description** (optional)

Includes QuestionSetQuestionPicker component for selecting questions.

### 5. QuestionSetQuestionPicker ⭐ (KEY COMPONENT)
**Cascading Selector-Based Reference Selection**

#### ✅ STRICT NO FREE TEXT POLICY
- **NO typing Question IDs**
- **NO typing CodeSystem URLs**
- **ALL references via dropdown/checkbox only**

#### Step 1: Select Terminology (Dropdown)
```
Select Question Terminology *
[ PSS Questions ▼ ]
```
- Populated from existing CodeSystems
- Shows name and code count
- Required before Step 2

#### Step 2: Select Questions (Cascading)
```
Available Questions *
────────────────────────
[✔] HEIGHT        Body height
                  Type: Quantity
                  [✔] Required

[✔] WEIGHT        Body weight
                  Type: Quantity
                  [✔] Required

[ ] BMI           Body mass index
                  Type: Decimal
```

Features:
- ✅ List auto-populates from selected Terminology
- ✅ Questions filtered by `code.system === terminologyUrl`
- ✅ Checkbox to add/remove questions
- ✅ Required toggle per question (visible only when selected)
- ✅ Cannot select questions until Terminology chosen
- ✅ No manual entry anywhere
- ✅ Duplicate prevention (already selected questions stay checked)

#### Step 3: Selected Summary
```
Selected Questions (2)
────────────────────────
HEIGHT (required)
WEIGHT (required)
```

### 6. QuestionSetPreviewPanel (Live Preview)
Shows:
- Question Set name
- ID
- Description
- Terminology URL
- All selected questions with required/optional status
- Numbered list
- Question details (code, display)
- Updates in real-time

Preview example:
```
Preview
────────────────────────
Vitals Questions

ID: vitals
Terminology: http://example.org/pss-questions

Questions (3)
1. HEIGHT
   Body height
   ✓ Required

2. WEIGHT
   Body weight
   ✓ Required

3. BMI
   Body mass index
   ○ Optional
```

### 7. Validation Rules
✅ **Client-side validation**:
- ID required
- Name required
- Terminology required
- At least one question required

✅ **UX**:
- Inline validation only (no toast spam)
- Field-level errors below inputs
- Red borders on invalid fields
- Save button disabled when invalid
- Backend errors mapped to fields

❌ **NOT validated** (deferred to later phase):
- Deleted questions
- Deleted terminologies
- Orphaned references

### 8. Integration
✅ **Terminology Tab Structure**
```
Terminology (main tab)
├── Code Systems (CodeMasterEditor)
├── Questions (Phase 3B)
└── Question Sets (Phase 3C) ⬅️ NEW
```

✅ **Navigation**
- Accessible via Terminology tab
- Sub-tabs: Code Systems | Questions | Question Sets
- Independent state management
- No impact on Rules or other sections

## Key Features

### 🚫 NO Free Text Anywhere
- ✅ Terminology selection: **Dropdown only**
- ✅ Question selection: **Checkbox list only**
- ✅ Required toggle: **Checkbox only**
- ❌ No typing Question IDs
- ❌ No typing CodeSystem URLs
- ❌ No manual reference entry

### 📊 Cascading Selection
1. User selects Terminology from dropdown
2. Questions list auto-populates (filtered by Terminology)
3. User checks questions to include
4. User toggles required/optional per question
5. Selected summary updates live
6. Preview shows complete configuration

### 🔒 Immutability Rules
- ✅ QuestionSet ID immutable after creation
- ✅ Terminology can be changed (resets question selection)
- ✅ Questions can be added/removed freely
- ✅ Required status can toggle freely

### 🎯 Integration Points
- **CodeSystems API**: Loads terminologies for dropdown
- **Questions API**: Loads questions filtered by terminology
- **QuestionSets API**: CRUD for question sets

## TypeScript Types

### QuestionSetFormState
```typescript
interface QuestionSetFormState {
  id: string;
  name: string;
  description: string;
  terminologyUrl: string;
  questions: QuestionSetQuestionRefDto[];
}
```

### QuestionSetQuestionRefDto
```typescript
interface QuestionSetQuestionRefDto {
  questionId: string;
  required: boolean;
}
```

All components fully typed with no `any`.

## Helper Functions
- `questionSetToFormState()` - Backend → Form mapping
- `formStateToCreateDto()` - Form → Backend mapping
- `validateQuestionSetForm()` - Client-side validation

## User Experience Highlights

### Empty State
When no question sets exist:
```
No question sets yet
[＋ New Question Set] button is prominent
```

### Search
- Real-time search by name or ID
- Shows "X of Y question sets"

### Validation Feedback
- ✅ Green checkmark for valid fields
- ❌ Red error text below invalid fields
- 🔒 Save disabled with cursor-not-allowed

### Delete Confirmation
- Inline confirmation (no modal)
- Shows below item
- Cancel/Delete buttons

### Cascading Selection UX
- Terminology selector shows code count
- Questions list shows answer type
- Required toggle only visible when selected
- Selected summary shows live count
- Empty state messaging when no questions exist

## Acceptance Criteria

✅ No free-text identifiers anywhere
✅ Terminology selector is dropdown-based
✅ Questions selector cascades from Terminology
✅ Required toggle works per question
✅ Clean, modern UX matching Phase 3B
✅ Folder structure correct (all files under QuestionSets/)
✅ No rule logic touched
✅ No backend modifications
✅ All TypeScript types correct
✅ Integration with Terminology tab complete

## Out of Scope (Correctly Excluded)

These are explicitly NOT implemented in Phase 3C:

❌ Handling deleted Questions
❌ Handling deleted CodeSystems
❌ Orphan detection
❌ Auto-migration of references
❌ Rule impact analysis
❌ Integrity checking
❌ Advisory warnings
❌ Import/export functionality
❌ Versioning
❌ Permissions
❌ Multi-terminology question sets

*These will be addressed in a later "Integrity & Advisory" phase.*

## Testing Notes
- All components compile without TypeScript errors
- Form validation works offline (client-side)
- Backend validation surfaces cleanly
- Cascading selection prevents invalid states
- No console errors
- Live preview updates correctly
- Required toggles functional
- Delete confirmation works

## Technical Implementation Details

### Cascading Logic
1. User selects terminologyUrl from dropdown
2. useEffect triggers on terminologyUrl change
3. Loads all Questions via API
4. Filters: `questions.filter(q => q.code.system === terminologyUrl)`
5. Renders filtered list with checkboxes
6. Selected questions stored as `{ questionId, required }`

### State Management
- **QuestionSetListPanel**: Maintains question set list + refresh trigger
- **QuestionSetEditorPanel**: Manages form state + validation
- **QuestionSetForm**: Propagates changes via onChange
- **QuestionSetQuestionPicker**: Manages terminology + questions locally

### Error Handling
- Client-side validation runs before save
- Backend errors mapped to field-level errors
- Network errors shown as general error message
- Save button disabled during API calls

### Data Flow
```
API (CodeSystems) → Terminology Dropdown
  ↓ User selects
API (Questions) → Questions List (filtered)
  ↓ User selects
formState.questions → Preview Panel
  ↓ User saves
API (QuestionSets) → Success/Error
  ↓ On success
Refresh List → Reset Form
```

## Integration with Existing Code
- ✅ No modifications to Question models
- ✅ No modifications to Question API
- ✅ No modifications to Rule UI
- ✅ No modifications to Terminology UI (except TerminologyEditor.tsx)
- ✅ Reuses existing APIs (Questions, CodeSystems)
- ✅ Follows Phase 3B patterns

---

**Phase 3C QuestionSet Management UI Complete**

All acceptance criteria met. UI is production-ready with strict dropdown-based reference selection, no free text, and excellent cascading UX.
