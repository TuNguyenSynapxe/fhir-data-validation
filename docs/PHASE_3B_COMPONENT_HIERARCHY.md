# Phase 3B: Terminology Management Component Hierarchy

## Component Tree

```
TerminologyManagementScreen (main container)
├── NavigationBreadcrumb
│   └── Props: projectId, codeSystemUrl
│
├── Three-Column Layout (flex/grid)
│   │
│   ├── ConceptListPanel (left column)
│   │   ├── Props: concepts[], selectedConceptCode, onSelectConcept
│   │   ├── ConceptListHeader
│   │   │   └── Search/Filter controls (placeholder)
│   │   ├── ConceptTable
│   │   │   └── ConceptRow[] (supports hierarchy)
│   │   └── EmptyState (when no concepts)
│   │
│   ├── ConceptEditorPanel (middle column)
│   │   ├── Props: concept, codeSystemUrl, onChange
│   │   ├── ConceptEditorHeader
│   │   │   └── Code + Display (read-only for now)
│   │   ├── ConceptEditorForm
│   │   │   ├── CodeField (text input)
│   │   │   ├── DisplayField (text input)
│   │   │   ├── DefinitionField (textarea)
│   │   │   └── DesignationSection (placeholder)
│   │   └── EmptyState (when no concept selected)
│   │
│   └── ProjectConstraintsPanel (right column)
│       ├── Props: constraints[], conceptSystem, conceptCode
│       ├── ConstraintsHeader
│       │   └── Count badge
│       ├── ConstraintList
│       │   └── ConstraintListItem[]
│       │       ├── Constraint ID
│       │       ├── Resource Type
│       │       └── Path (truncated)
│       └── EmptyState (when no constraints reference this concept)
```

## Navigation Flow

```
Project Selection
    ↓
Terminology Tab
    ↓
CodeSystem Selection (dropdown/list)
    ↓
TerminologyManagementScreen
    ├── Breadcrumb: Home > Project {id} > Terminology > {codeSystemUrl}
    └── Three columns appear
```

## Component Responsibilities

### TerminologyManagementScreen
- **Responsibility**: Layout orchestration, state lifting (future)
- **Props**: `projectId: string`, `codeSystemUrl: string`
- **State** (future): Selected concept, concept list, constraints
- **Current**: Stateless container with placeholder data

### NavigationBreadcrumb
- **Responsibility**: Display navigation path
- **Props**: `projectId: string`, `codeSystemUrl: string`
- **Interaction**: Click → navigate (future)
- **Current**: Display only, no navigation

### ConceptListPanel
- **Responsibility**: Display concept hierarchy as a table
- **Props**: 
  - `concepts: CodeSystemConcept[]`
  - `selectedConceptCode?: string`
  - `onSelectConcept: (code: string) => void`
- **Features** (future): Search, filter, expand/collapse hierarchy
- **Current**: Flat list with selection highlight

### ConceptEditorPanel
- **Responsibility**: Display/edit concept properties
- **Props**:
  - `concept?: CodeSystemConcept`
  - `codeSystemUrl: string`
  - `onChange: (concept: CodeSystemConcept) => void`
- **Features** (future): Validation, save/cancel, undo/redo
- **Current**: Static form fields, no onChange implementation

### ProjectConstraintsPanel
- **Responsibility**: Show constraints referencing the selected concept
- **Props**:
  - `constraints: TerminologyConstraint[]`
  - `conceptSystem?: string`
  - `conceptCode?: string`
- **Features** (future): Click → navigate to constraint editor
- **Current**: Read-only list

## Empty State Handling

Each panel has an EmptyState component:

1. **ConceptListPanel**:
   - Message: "No concepts defined in this CodeSystem"
   - Action (future): "Add Concept" button

2. **ConceptEditorPanel**:
   - Message: "Select a concept from the list to view details"
   - Icon: Arrow pointing left

3. **ProjectConstraintsPanel**:
   - Message: "No constraints reference this concept"
   - SubMessage: "This concept is not currently used in validation rules"

## Loading State Handling

LoadingState component (placeholder for now):
- Spinner icon
- Message: "Loading..."
- Position: Center of panel

## Data Flow (Placeholder)

```
TerminologyManagementScreen (parent)
    ↓ [Pass concepts[]]
ConceptListPanel
    ↓ [User clicks concept]
onSelectConcept(code)
    ↓ [Update selectedConceptCode]
TerminologyManagementScreen (re-render)
    ↓ [Pass selected concept]
ConceptEditorPanel (displays concept)
    ↓ [Find constraints]
ProjectConstraintsPanel (displays constraints)
```

## Styling Approach

- **Layout**: CSS Grid for three columns (1fr 2fr 1fr ratio)
- **Responsive**: Stack columns on small screens (future)
- **Spacing**: Consistent padding/margins using Tailwind
- **Colors**: Neutral backgrounds, primary colors for selected states
- **Borders**: Subtle borders between panels

## Extension Points

1. **ConceptListPanel**:
   - Add search/filter bar
   - Add hierarchical expand/collapse
   - Add drag-and-drop for reordering
   - Add context menu (delete, duplicate)

2. **ConceptEditorPanel**:
   - Add designation editor (translation support)
   - Add property editor (FHIR properties)
   - Add save/cancel buttons
   - Add validation error display

3. **ProjectConstraintsPanel**:
   - Add click → navigate to constraint
   - Add advisory badges (warnings/errors)
   - Add filter by resource type

4. **TerminologyManagementScreen**:
   - Add CodeSystem selector (dropdown)
   - Add toolbar (add concept, save all, export)
   - Add advisory panel (collapsible)

---

## File Organization

```
frontend/src/
├── components/
│   └── terminology/
│       ├── TerminologyManagementScreen.tsx (main container)
│       ├── NavigationBreadcrumb.tsx
│       ├── ConceptListPanel.tsx
│       ├── ConceptEditorPanel.tsx
│       ├── ProjectConstraintsPanel.tsx
│       ├── EmptyState.tsx
│       └── LoadingState.tsx
```

---

## Next Steps (Phase 3C+)

After layout is complete:
1. **Phase 3C**: Implement data fetching (useEffect + API calls)
2. **Phase 3D**: Implement editing logic (onChange handlers)
3. **Phase 3E**: Implement validation + advisory integration
4. **Phase 3F**: Implement save/delete operations
