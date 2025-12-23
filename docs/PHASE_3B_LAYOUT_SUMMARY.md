# Phase 3B: Terminology Management Layout - Summary

## Overview
Phase 3B implements the **visual layout** for the Terminology Management screen. All components are **stateless** with placeholder data — no API integration, no editing logic, no validation.

---

## Components Created

### 1. **TerminologyManagementScreen** (Main Container)
**File**: [frontend/src/components/terminology/TerminologyManagementScreen.tsx](../frontend/src/components/terminology/TerminologyManagementScreen.tsx)

**Purpose**: Main container orchestrating the three-column layout

**Features**:
- Three-column grid layout (1fr : 2fr : 1fr ratio)
- Navigation breadcrumb (Home > Project > Terminology > CodeSystem)
- Local state for selected concept code
- Placeholder CodeSystem and Constraints data

**Props**:
- `projectId: string` - Project identifier
- `codeSystemUrl: string` - CodeSystem canonical URL

**State**:
- `selectedConceptCode?: string` - Currently selected concept

**Placeholder Data**:
- CodeSystem with 3 concepts (active, inactive, pending + 2 children)
- 2 constraints referencing these concepts

---

### 2. **ConceptListPanel** (Left Column)
**File**: [frontend/src/components/terminology/ConceptListPanel.tsx](../frontend/src/components/terminology/ConceptListPanel.tsx)

**Purpose**: Display list of concepts in a table format

**Features**:
- Searchable table (search input disabled for now)
- Hierarchical display (child concepts indented)
- Selection highlight (blue background)
- Empty state when no concepts exist
- Concept count badge in header

**Props**:
- `concepts: CodeSystemConcept[]` - List of concepts to display
- `selectedConceptCode?: string` - Currently selected concept
- `onSelectConcept: (code: string) => void` - Selection callback

**Sub-components**:
- `ConceptRow` - Individual row with hierarchy support (recursive)

**Empty State**: "No concepts defined in this CodeSystem"

---

### 3. **ConceptEditorPanel** (Middle Column)
**File**: [frontend/src/components/terminology/ConceptEditorPanel.tsx](../frontend/src/components/terminology/ConceptEditorPanel.tsx)

**Purpose**: Display and edit concept properties

**Features**:
- System context display (read-only CodeSystem URL)
- Code field (text input, disabled)
- Display field (text input, disabled)
- Definition field (textarea, disabled)
- Designation section (placeholder)
- Property section (placeholder)
- Child concepts list (if hierarchical)
- Save/Cancel buttons (disabled)

**Props**:
- `concept?: CodeSystemConcept` - Concept being edited
- `codeSystemUrl: string` - CodeSystem URL for context
- `onChange: (concept: CodeSystemConcept) => void` - Change callback (not implemented)

**Sub-components**:
- `ConceptEditorForm` - Form layout with all fields

**Empty State**: "Select a concept to edit"

---

### 4. **ProjectConstraintsPanel** (Right Column)
**File**: [frontend/src/components/terminology/ProjectConstraintsPanel.tsx](../frontend/src/components/terminology/ProjectConstraintsPanel.tsx)

**Purpose**: Display constraints that reference the selected concept

**Features**:
- Filters constraints by selected concept (system + code)
- Displays constraint ID, resource type, path
- Shows constraint type badge (binding, fixed)
- Shows binding strength badge (required, extensible, etc.)
- Displays allowed answer count
- Usage count badge (if concept used multiple times in same constraint)
- Empty state when no constraints reference the concept

**Props**:
- `constraints: TerminologyConstraint[]` - All constraints
- `conceptSystem?: string` - System of selected concept
- `conceptCode?: string` - Code of selected concept

**Sub-components**:
- `ConstraintListItem` - Individual constraint card

**Empty States**:
- "Select a concept" (when no concept selected)
- "No constraints reference this concept" (when concept has no usages)

---

### 5. **Supporting Components**
**File**: [frontend/src/components/terminology/SupportingComponents.tsx](../frontend/src/components/terminology/SupportingComponents.tsx)

**Components**:

#### `EmptyState`
- Displays icon, message, sub-message, optional action button
- Used in all three panels

**Props**:
- `icon?: React.ReactNode` - Icon or emoji
- `message: string` - Primary message
- `subMessage?: string` - Secondary message
- `action?: { label: string; onClick: () => void }` - Optional action button

#### `LoadingState`
- Displays spinner + message
- Placeholder for data fetching state

**Props**:
- `message?: string` - Loading message (default: "Loading...")

#### `NavigationBreadcrumb`
- Displays navigation path with clickable links
- Separator: `/`

**Props**:
- `items: BreadcrumbItem[]` - Array of `{ label: string; href?: string }`

#### `PanelHeader`
- Consistent header for each column panel
- Title + optional badge + optional actions

**Props**:
- `title: string` - Panel title
- `badge?: { label: string; variant?: 'default' | 'primary' | 'warning' | 'error' }` - Count badge
- `actions?: React.ReactNode` - Action buttons

#### `FormField`
- Consistent form field layout
- Label + required indicator + help text + error message

**Props**:
- `label: string` - Field label
- `required?: boolean` - Show asterisk
- `error?: string` - Error message
- `help?: string` - Help text
- `children: React.ReactNode` - Input element

---

## Layout Decisions

### 1. **Three-Column Grid Layout**
**Decision**: Use CSS Grid with `grid-cols-[1fr_2fr_1fr]`

**Rationale**:
- Left column (Concept List): Narrow, just code + display
- Middle column (Concept Editor): Wide, needs space for form fields
- Right column (Constraints): Narrow, just list of cards

**Trade-off**: Not responsive on small screens (future: stack columns vertically)

---

### 2. **Hierarchical Concept Display**
**Decision**: Display child concepts as indented rows (always expanded)

**Rationale**:
- Simple to implement (recursive rendering)
- Clear visual hierarchy (indentation)

**Trade-off**: No expand/collapse controls (future: add toggle icons)

---

### 3. **Selection State in Parent**
**Decision**: `TerminologyManagementScreen` owns `selectedConceptCode` state

**Rationale**:
- Single source of truth
- Easy to sync between panels (list highlights, editor displays, constraints filter)

**Trade-off**: Props drilling (future: use Context API if deeper nesting)

---

### 4. **Placeholder Data in Component**
**Decision**: Hardcode sample data in `TerminologyManagementScreen`

**Rationale**:
- Phase 3B focuses on layout only
- Easier to test visual rendering without backend

**Trade-off**: Will be replaced with API calls in Phase 3C

---

### 5. **Disabled Form Inputs**
**Decision**: All form inputs in `ConceptEditorPanel` are disabled

**Rationale**:
- Phase 3B does not implement editing logic
- Visual layout only

**Trade-off**: Buttons/inputs look interactive but don't work (will be enabled in Phase 3D)

---

### 6. **Constraint Filtering Logic**
**Decision**: `ProjectConstraintsPanel` filters constraints by selected concept

**Rationale**:
- Show relevant constraints only (reduces noise)
- Demonstrates how constraints relate to concepts

**Trade-off**: Filtering logic is in component (could be moved to parent in future)

---

## Extension Points

### Phase 3C: Data Fetching
- Replace placeholder data with API calls
- Use `useEffect` to fetch CodeSystem and Constraints
- Add loading states (replace placeholder with `LoadingState` component)
- Handle errors (display error message)

**Files to modify**:
- `TerminologyManagementScreen.tsx`: Add `useEffect` + API calls

---

### Phase 3D: Editing Logic
- Enable form inputs in `ConceptEditorPanel`
- Implement `onChange` handlers (update local state)
- Add Save/Cancel button logic
- Add validation (client-side)

**Files to modify**:
- `ConceptEditorPanel.tsx`: Remove `disabled` attributes, implement `onChange`
- `TerminologyManagementScreen.tsx`: Add save handler calling `saveCodeSystem` API

---

### Phase 3E: Advisory Integration
- Fetch advisories from `/api/projects/{id}/terminology/advisories`
- Display advisory badges in `ProjectConstraintsPanel`
- Add advisory panel (collapsible, bottom of screen or fourth column)
- Highlight concepts with errors in `ConceptListPanel`

**Files to modify**:
- `TerminologyManagementScreen.tsx`: Fetch advisories
- `ProjectConstraintsPanel.tsx`: Display advisory badges per constraint
- New component: `AdvisoryPanel.tsx`

---

### Phase 3F: Advanced Features
- **Search/Filter**: Enable search input in `ConceptListPanel`
- **Expand/Collapse**: Add toggle icons for hierarchical concepts
- **Drag-and-Drop**: Reorder concepts or move to different parent
- **Context Menu**: Right-click → delete, duplicate, add child
- **Designation Editor**: Implement multi-language support
- **Property Editor**: Add key-value properties (FHIR CodeSystem.property)
- **Constraint Navigation**: Click constraint → navigate to constraint editor
- **Keyboard Shortcuts**: Arrow keys to navigate concepts, Enter to edit

**Files to modify**:
- `ConceptListPanel.tsx`: Add search logic, expand/collapse state
- `ConceptEditorPanel.tsx`: Add designation/property editors
- `ProjectConstraintsPanel.tsx`: Add click handler for navigation

---

## Props Interface Summary

```typescript
// TerminologyManagementScreen
interface TerminologyManagementScreenProps {
  projectId: string;
  codeSystemUrl: string;
}

// ConceptListPanel
interface ConceptListPanelProps {
  concepts: CodeSystemConcept[];
  selectedConceptCode?: string;
  onSelectConcept: (code: string) => void;
}

// ConceptEditorPanel
interface ConceptEditorPanelProps {
  concept?: CodeSystemConcept;
  codeSystemUrl: string;
  onChange: (concept: CodeSystemConcept) => void;
}

// ProjectConstraintsPanel
interface ProjectConstraintsPanelProps {
  constraints: TerminologyConstraint[];
  conceptSystem?: string;
  conceptCode?: string;
}

// EmptyState
interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  subMessage?: string;
  action?: { label: string; onClick: () => void };
}

// LoadingState
interface LoadingStateProps {
  message?: string;
}

// NavigationBreadcrumb
interface BreadcrumbItem {
  label: string;
  href?: string;
}
interface NavigationBreadcrumbProps {
  items: BreadcrumbItem[];
}

// PanelHeader
interface PanelHeaderProps {
  title: string;
  badge?: { label: string; variant?: 'default' | 'primary' | 'warning' | 'error' };
  actions?: React.ReactNode;
}

// FormField
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}
```

---

## Visual Preview (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Home > Project 123 > Terminology > http://example.org/CodeSystem/status    │
├──────────────────┬────────────────────────────────────┬─────────────────────┤
│ Concepts (3)     │ Concept Editor                      │ Constraints (2)     │
├──────────────────┼────────────────────────────────────┼─────────────────────┤
│ [Search...]      │ System:                             │ patient-status-     │
│                  │ http://example.org/.../status       │ binding             │
│ Code  | Display  │                                     │ Resource: Patient   │
│────────────────  │ Code *                              │ Path: Patient.ext.. │
│ active │ Active  │ [active                     ]       │ binding | required  │
│ inact. │ Inact.  │                                     │ 2 allowed answers   │
│ pend.  │ Pending │ Display *                           │                     │
│  ├─pend-appr...  │ [Active                     ]       │ observation-status- │
│  └─pend-revi...  │                                     │ binding             │
│                  │ Definition                          │ Resource: Observ... │
│                  │ [The entity is currently... ]       │ Path: Observation.. │
│                  │                                     │ binding | extensibl │
│                  │                                     │ 2 allowed answers   │
│                  │ [Cancel] [Save]                     │                     │
│                  │                                     │                     │
└──────────────────┴────────────────────────────────────┴─────────────────────┘
```

---

## Testing the Layout

### Manual Testing Steps

1. **Start frontend dev server**: `npm run dev`
2. **Navigate to terminology screen**: (integration with routing TBD)
3. **Test Concept Selection**:
   - Click on "active" → Middle panel shows "Active" details
   - Click on "inactive" → Middle panel updates
   - Right panel shows filtered constraints
4. **Test Empty States**:
   - Comment out placeholder data → All panels show empty states
5. **Test Hierarchical Display**:
   - Verify "pending" has child rows indented
   - Verify child concepts are visible

### Visual Regression Testing (Future)
- Use Storybook + Chromatic for visual testing
- Create stories for each component with different states:
  - Empty state
  - Loading state
  - Selected state
  - Hierarchical concepts
  - Long text (truncation)

---

## Risks & Considerations

### 1. **No Responsive Design** (MEDIUM)
**Issue**: Three-column layout breaks on small screens

**Mitigation**: Add responsive breakpoints in Phase 3F:
- Mobile: Stack columns vertically
- Tablet: Two columns (list + editor), constraints in modal

---

### 2. **No Keyboard Navigation** (LOW)
**Issue**: Users cannot navigate with keyboard (accessibility issue)

**Mitigation**: Add keyboard shortcuts in Phase 3F:
- Arrow keys: Navigate concepts
- Enter: Select concept
- Escape: Deselect concept

---

### 3. **Performance with Large Hierarchies** (LOW)
**Issue**: Rendering 1000+ concepts may be slow (always expanded)

**Mitigation**:
- Add virtualization (react-window) in Phase 3F
- Add expand/collapse to hide child concepts

---

### 4. **Prop Drilling** (LOW)
**Issue**: Props passed through multiple levels (if deeper nesting added)

**Mitigation**: Use React Context API or Zustand for state management in Phase 3C+

---

## File Structure

```
frontend/src/components/terminology/
├── TerminologyManagementScreen.tsx (215 lines)
├── ConceptListPanel.tsx (103 lines)
├── ConceptEditorPanel.tsx (169 lines)
├── ProjectConstraintsPanel.tsx (156 lines)
└── SupportingComponents.tsx (140 lines)
────────────────────────────────────────────
Total: ~783 lines of TSX
```

---

## Next Steps

### Phase 3C: Data Fetching (Next)
- Replace placeholder data with API calls
- Use `listCodeSystems()`, `listConstraints()` from Phase 3A
- Add loading states
- Handle errors

### Phase 3D: Editing Logic
- Enable form inputs
- Implement onChange handlers
- Add validation
- Add save/cancel buttons

### Phase 3E: Advisory Integration
- Fetch advisories
- Display in UI (badges, panel)
- Highlight concepts with errors

### Phase 3F: Advanced Features
- Search/filter
- Expand/collapse hierarchy
- Drag-and-drop
- Keyboard shortcuts
- Responsive design

---

## Conclusion

Phase 3B delivers a **fully functional layout** for Terminology Management:
- ✅ Three-column design (list, editor, constraints)
- ✅ Navigation breadcrumb
- ✅ Empty states for all panels
- ✅ Hierarchical concept display
- ✅ Constraint filtering by selected concept
- ✅ Placeholder data for visual testing
- ✅ Clear component boundaries
- ✅ Props interfaces documented

**No business logic** implemented (as required). All components are **stateless** with **disabled inputs**.

**Ready for Phase 3C**: Data fetching integration.
