# Phase 3F: Support Multiple CodeSystems per Project

**Status**: ✅ Complete  
**Date**: 22 December 2025  

## Overview

Phase 3F extends the Terminology feature from supporting a single hardcoded CodeSystem to managing multiple FHIR CodeSystems per project. This enables projects to organize terminology into logical CodeSystems (e.g., status codes, observation types, procedure codes).

## Implementation Summary

### New Components

#### 1. CodeSystemListPanel.tsx
**Purpose**: Landing page for Terminology Management

**Features**:
- Lists all CodeSystems in the project
- Displays: Name/Title, Canonical URL, Description, Status, Concept count, Version, Publisher
- Search by name or URL
- Create New CodeSystem action (placeholder)
- Import CodeSystem action (placeholder)
- Auto-select if only ONE CodeSystem exists (UX convenience)
- Empty state with call-to-action

**Key Functions**:
- `loadCodeSystems()`: Fetches all CodeSystems via `listCodeSystems()` API
- `countConcepts()`: Recursively counts concepts including nested hierarchies
- `CodeSystemCard`: Individual list item component with hover effects

#### 2. TerminologyRouter.tsx
**Purpose**: Routing logic within Terminology tab

**Views**:
- `list`: Shows CodeSystemListPanel
- `editor`: Shows TerminologyManagementScreen for specific CodeSystem
- `create`: Placeholder for create dialog
- `import`: Placeholder for import dialog

**Features**:
- URL encoding/decoding for canonical URLs
- Back navigation from editor to list
- State management for current view
- Navigation change callbacks

**Routes** (logical, not actual URL routing):
- `/terminology/code-systems` → List view
- `/terminology/code-systems/{encoded-url}` → Editor view

### Modified Components

#### RightPanel.tsx
**Changes**:
- Replaced `TerminologyManagementScreen` import with `TerminologyRouter`
- Updated `codemaster` case to render `TerminologyRouter`
- Removed hardcoded `codeSystemUrl` prop

**Before**:
```tsx
case 'codemaster':
  return (
    <TerminologyManagementScreen
      projectId={projectId!}
      codeSystemUrl="http://fhir.processor.local/CodeSystem/project-terminology"
    />
  );
```

**After**:
```tsx
case 'codemaster':
  return (
    <TerminologyRouter
      projectId={projectId!}
    />
  );
```

## UX Flow

### User Journey: Terminology Management

1. **Navigate to Terminology Tab**
   - User clicks "Rules" → "Terminology" sub-tab
   - Lands on CodeSystemListPanel (list view)

2. **List View Interactions**
   - **Empty State**: Shows "No CodeSystems yet" with Create button
   - **Search**: Filter CodeSystems by name or URL
   - **Create**: Click "Create New" button (placeholder alert for now)
   - **Import**: Click "Import" button (placeholder alert for now)
   - **Select**: Click any CodeSystem card to open editor

3. **Auto-Selection Behavior**
   - If project has exactly ONE CodeSystem → automatically opens editor
   - If project has 0 or 2+ CodeSystems → stays on list view
   - Provides smooth UX for new projects while scaling to many CodeSystems

4. **Editor View**
   - Shows full TerminologyManagementScreen (unchanged from Phase 3E)
   - Back button returns to list view
   - Three-column layout: Concepts | Editor | Constraints
   - Inline editing, advisory panel, info tooltips (all Phase 3E features)

5. **Navigation Flow**
   ```
   Rules Tab
   └── Terminology Sub-tab
       ├── List View (default)
       │   ├── Create New (placeholder)
       │   ├── Import (placeholder)
       │   └── Select CodeSystem → Editor View
       └── Editor View
           ├── Back to List
           └── Full TerminologyManagementScreen
   ```

## Backend Integration

### APIs Used
- **GET** `/api/projects/{projectId}/terminology/codesystems` (existing)
  - Returns `CodeSystem[]`
  - Used by CodeSystemListPanel to load list

- **POST** `/api/projects/{projectId}/terminology/codesystems` (existing)
  - Saves a CodeSystem
  - Used by TerminologyManagementScreen (unchanged)

- **DELETE** `/api/projects/{projectId}/terminology/codesystems?url={url}` (existing)
  - Deletes a CodeSystem
  - Not yet exposed in UI (future enhancement)

### No Backend Changes Required
- All necessary APIs already existed from Phase 3A
- No model changes needed
- No advisory changes needed
- CodeMaster storage remains unchanged (separate from Terminology)

## Key Design Decisions

### 1. Routing Strategy
**Decision**: Logical routing within component, not URL-based routing

**Rationale**:
- Terminology tab exists within PlaygroundPage (not a top-level route)
- React Router already manages `/projects/:projectId`
- Component-level state management is simpler for sub-tab navigation
- Avoids conflicts with existing routing structure

**Trade-off**: Browser back button doesn't work within Terminology views  
**Mitigation**: Explicit "Back to CodeSystems" button provides clear navigation

### 2. Auto-Selection
**Decision**: Automatically open editor if exactly one CodeSystem exists

**Rationale**:
- Reduces clicks for simple projects (common case)
- List view still shows for 0 or 2+ CodeSystems
- User can always return to list via Back button

**Implementation**: Check in `loadCodeSystems()` after fetch:
```tsx
if (data && data.length === 1) {
  onSelectCodeSystem(data[0].url);
}
```

### 3. Create/Import Placeholders
**Decision**: Alert dialogs instead of full implementation

**Rationale**:
- Phase 3F scope is listing and navigation
- Create/Import require:
  - Form validation (CodeSystem URL uniqueness)
  - File upload handling (Import)
  - CodeSystem template/wizard (Create)
- Better as separate Phase 3G

**User Experience**: Clear "coming soon" messaging, no dead-end clicks

### 4. URL Encoding
**Decision**: Use `encodeURIComponent()` for canonical URLs

**Rationale**:
- CodeSystem URLs contain special characters (`:`, `/`, `?`)
- Encoding prevents routing conflicts
- Standard practice for URL parameters

**Example**:
- Input: `http://fhir.org/CodeSystem/status`
- Encoded: `http%3A%2F%2Ffhir.org%2FCodeSystem%2Fstatus`
- Route: `/terminology/code-systems/http%3A%2F%2Ffhir.org%2FCodeSystem%2Fstatus`

## Migration Risks

### Low Risk: Backward Compatibility
**Issue**: Existing projects may have saved CodeMaster data under old structure

**Mitigation**:
- CodeMaster data storage is separate from Terminology
- No breaking changes to existing data models
- Old CodeMaster tab data remains accessible (if needed for migration)

**Action Required**: None (unless users need to migrate CodeMaster → Terminology)

### Low Risk: Hardcoded URLs
**Issue**: Some projects may reference `project-terminology` URL specifically

**Mitigation**:
- No hardcoded URLs remain in Phase 3F code
- List view loads all CodeSystems dynamically
- Users can create CodeSystem with any URL they want

**Action Required**: None (users control their own URLs)

### Medium Risk: Empty State Experience
**Issue**: New projects start with zero CodeSystems, may be confusing

**Mitigation**:
- Clear empty state message with call-to-action
- "Create New" button prominently displayed
- Helpful description: "Create your first CodeSystem to start managing terminology"

**Future Enhancement**: Onboarding wizard or starter templates

### Low Risk: Performance with Many CodeSystems
**Issue**: List view loads all CodeSystems at once (no pagination)

**Current Scope**: Acceptable for typical projects (5-20 CodeSystems)

**Future Enhancement** (if needed):
- Pagination or virtual scrolling
- Server-side search
- Filtering by status/publisher

**Monitoring**: Track projects with >50 CodeSystems

## Testing Recommendations

### Manual Testing Scenarios

1. **Empty Project**
   - Navigate to Terminology tab
   - Verify empty state shows
   - Verify Create button is prominent

2. **Single CodeSystem**
   - Create/load project with one CodeSystem
   - Navigate to Terminology tab
   - Verify auto-opens editor (not list)
   - Verify Back button returns to list

3. **Multiple CodeSystems**
   - Create/load project with 3+ CodeSystems
   - Navigate to Terminology tab
   - Verify list view shows
   - Verify all CodeSystems appear
   - Verify concept counts are correct
   - Click each CodeSystem, verify editor opens

4. **Search Functionality**
   - Enter search query
   - Verify filtering works (name, URL, title)
   - Verify empty search results message

5. **Navigation Flow**
   - List → Editor → Back → List
   - Verify state persists (search query, scroll position)
   - Verify no memory leaks (unmounting)

6. **Error Handling**
   - Simulate API failure
   - Verify error state shows
   - Verify Retry button works

### Integration Testing

1. **With Existing Features**
   - Verify Rules panel still works
   - Verify Validation panel still works
   - Verify Overview panel still works
   - Verify tab switching doesn't break state

2. **With Phase 3E Features**
   - Verify info tooltips work in editor
   - Verify advisory panel works in editor
   - Verify inline editing works in editor

## Future Enhancements (Phase 3G+)

### Immediate Next Steps
1. **Create CodeSystem Dialog**
   - Form with: URL, Name, Title, Status, Description
   - URL uniqueness validation
   - Template selection (starter concepts)

2. **Import CodeSystem Dialog**
   - File upload (JSON)
   - Validation (FHIR conformance)
   - Conflict resolution (if URL exists)

3. **Delete CodeSystem**
   - Delete button in editor or list
   - Confirmation dialog
   - Check for references in constraints

### Medium-Term Features
4. **Bulk Operations**
   - Export all CodeSystems to ZIP
   - Import multiple CodeSystems at once
   - Duplicate CodeSystem (with new URL)

5. **CodeSystem Metadata Editor**
   - Edit URL, Name, Title in list view
   - Version management
   - Publisher/Contact info

6. **Advanced Search**
   - Filter by status (draft/active/retired)
   - Filter by publisher
   - Sort by name, concept count, last modified

### Long-Term Vision
7. **CodeSystem Dependencies**
   - Visualize references between CodeSystems
   - Dependency graph
   - Impact analysis (what breaks if I delete this?)

8. **Version Control**
   - Track changes to CodeSystems
   - Diff view between versions
   - Rollback to previous version

9. **Collaboration**
   - Multi-user editing (with locking)
   - Change notifications
   - Conflict resolution

## Conclusion

Phase 3F successfully transforms Terminology from a single-CodeSystem feature to a multi-CodeSystem management system. The implementation:

✅ **Maintains Simplicity**: Auto-selection for single CodeSystem projects  
✅ **Scales Gracefully**: List view for projects with many CodeSystems  
✅ **Zero Backend Changes**: Uses existing APIs from Phase 3A  
✅ **Preserves Features**: All Phase 3E features (tooltips, advisories, editing) remain intact  
✅ **Clear Navigation**: Intuitive list → editor → back flow  
✅ **Future-Ready**: Extensible architecture for Create/Import/Delete features  

**Build Status**: ✅ Compiles successfully with no errors

**Next Phase**: Phase 3G - Implement Create/Import/Delete CodeSystem dialogs
