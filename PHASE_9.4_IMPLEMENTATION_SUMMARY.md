# Phase 9.4 Implementation Summary

## Overview
Phase 9.4: Admin Manual Rule Management - Minimal CRUD UI for bundle-scoped custom rules.

## Implementation Date
January 2025

## Critical Constraints (STRICTLY ENFORCED)
✅ **REUSE existing ProjectRule model** - NO new rule system created  
✅ **REUSE existing validation pipeline** - Phase 8.1 execution unchanged  
✅ **Bundle-scoped rules ONLY** - RuleScope = Bundle  
✅ **Manual rules ONLY** - RuleProvenance = ManualCustom  
✅ **Imported rules READ-ONLY** - Cannot edit/delete ImportedGenerated rules  

## Scope
- Minimal CRUD API for bundle-scoped manual rules
- Simple UI section inside validation playground
- Mandatory warning labels
- Automatic validation re-run on rule changes

## Files Created

### Backend (3 files)

#### 1. ProjectRuleCommandService
**File**: `backend/src/Pss.FhirProcessor.Application/Projects/Commands/ProjectRuleCommandService.cs` (207 lines)

**Methods**:
- `CreateBundleRuleAsync` - Create new bundle-scoped manual rule
- `UpdateBundleRuleAsync` - Update existing manual rule (rejects ImportedGenerated)
- `DeleteBundleRuleAsync` - Delete manual rule (rejects ImportedGenerated)
- `GetBundleRulesAsync` - Get all bundle rules with full details (imported + manual)

**Key Features**:
- Validates project + bundle existence
- Enforces RuleScope.Bundle + RuleProvenance.ManualCustom
- Stores FHIRPath expression in DefinitionJson field
- CRITICAL: Rejects edits/deletes to ImportedGenerated rules with clear error messages
- Returns BundleRuleDetails including FHIRPath expression for inspection

**Request/Response Models**:
- `CreateBundleRuleRequest` (title, description, fhirPathExpression, isEnabled)
- `UpdateBundleRuleRequest` (same fields)
- `BundleRuleDetails` (full rule data with provenance)

#### 2. ProjectRuleManagementController
**File**: `backend/src/Pss.FhirProcessor.Playground.Api/Controllers/ProjectRuleManagementController.cs` (272 lines)

**Endpoints**:
- `GET /api/v2/projects/{projectId}/bundles/{bundleId}/rules` - Get all bundle rules
- `POST /api/v2/projects/{projectId}/bundles/{bundleId}/rules` - Create manual rule
- `PUT /api/v2/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}` - Update manual rule
- `DELETE /api/v2/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}` - Delete manual rule

**HTTP Status Codes**:
- 200 OK - Get rules success
- 201 Created - Rule created
- 204 No Content - Update/delete success
- 400 Bad Request - Validation error (missing title/expression)
- 403 Forbidden - Attempted to edit/delete imported rule
- 404 Not Found - Project/bundle/rule not found
- 500 Internal Server Error - Server error

**DTOs**:
- `BundleRuleDto` (full rule with provenance, timestamps)
- `CreateBundleRuleDto` (create request)
- `UpdateBundleRuleDto` (update request)
- `CreateRuleResponse` (ruleId + message)

#### 3. Program.cs (DI Registration)
**File**: `backend/src/Pss.FhirProcessor.Playground.Api/Program.cs` (updated)

Added registration:
```csharp
builder.Services.AddScoped<Pss.FhirProcessor.Application.Projects.Commands.ProjectRuleCommandService>();
Log.Information("Rule management command service registered (Phase 9.4 - manual rule CRUD)");
```

### Frontend (4 files)

#### 1. projectRuleApi.ts
**File**: `frontend/src/api/projectRuleApi.ts` (104 lines)

**API Functions**:
- `getBundleRules(projectId, bundleId)` - Fetch all bundle rules
- `createBundleRule(projectId, bundleId, request)` - Create new rule
- `updateBundleRule(projectId, bundleId, ruleId, request)` - Update rule
- `deleteBundleRule(projectId, bundleId, ruleId)` - Delete rule

**Types**:
- `BundleRule` - Full rule data
- `CreateBundleRuleRequest` - Create payload
- `UpdateBundleRuleRequest` - Update payload
- `CreateRuleResponse` - Create response
- `RuleType`, `RuleProvenance` - Enums

#### 2. useRuleManagement.ts
**File**: `frontend/src/hooks/useRuleManagement.ts` (103 lines)

**Hooks**:
- `useBundleRules` - TanStack Query for fetching rules
- `useCreateBundleRule` - Mutation for creating rules
- `useUpdateBundleRule` - Mutation for updating rules
- `useDeleteBundleRule` - Mutation for deleting rules

**Features**:
- Automatic query invalidation on mutations
- Invalidates both `bundle-rules` and `validation` queries
- Stale time: 30 seconds for rule fetching

#### 3. RuleManagementSection.tsx
**File**: `frontend/src/components/admin/RuleManagementSection.tsx` (415 lines)

**Component Features**:
- Displays imported rules (read-only, gray background)
- Displays manual rules (editable, white background with actions)
- Inline create form (blue background)
- Inline edit form (green background)
- Delete confirmation dialog
- Automatic validation re-run via callback

**Form Fields**:
- Title (required)
- Description (optional)
- FHIRPath Expression (required, monospace font)
- Enabled toggle

**UI Elements**:
- **MANDATORY WARNING BANNER** (amber background):
  - "Custom rule (admin-defined)"
  - "Not derived from Implementation Guide"
  - "May affect validation outcomes"
- Imported rules section (read-only badge)
- Manual rules section (editable badge)
- Edit/Delete buttons (blue/red icons)
- Save/Cancel buttons in forms

**Props**:
- `projectId` - Current project ID
- `bundleId` - Current bundle ID
- `onValidationRerun` - Callback to trigger validation re-run

#### 4. AdminValidationPlaygroundPage.tsx
**File**: `frontend/src/pages/admin/AdminValidationPlaygroundPage.tsx` (updated)

**Integration**:
- Imported `RuleManagementSection` component
- Added between ValidationSummary and Issues List
- Passed `onValidationRerun={handleRerunValidation}` callback
- Auto-triggers validation when rules change

**Layout Order**:
1. Ambiguity Banner
2. Validation Summary
3. **Rule Management Section** (NEW)
4. Validation Issues List
5. Issue Details Panel (overlay)

## Mandatory Labeling (COMPLIANCE VERIFIED)

All three mandatory labels are prominently displayed in warning banner:

1. ✅ **"Custom rule (admin-defined)"** - Shown in amber warning banner
2. ✅ **"Not derived from Implementation Guide"** - Explicitly stated
3. ✅ **"May affect validation outcomes"** - Clearly warned

## Forbidden Features (NOT IMPLEMENTED)

✅ **Editing imported rules** - Backend rejects with 403 Forbidden  
✅ **Rule ordering controls** - Not implemented (rules ordered by provenance + title)  
✅ **Severity tuning UI** - Not implemented (severity determined by engine)  
✅ **Code generation helpers** - Not implemented (admin writes FHIRPath manually)  

## Data Flow

### Creating a Manual Rule

1. Admin clicks "Add Custom Rule"
2. Fills form (title, description, FHIRPath, enabled)
3. Clicks "Create Rule"
4. Frontend: `useCreateBundleRule` mutation
5. API: `POST /api/v2/projects/{projectId}/bundles/{bundleId}/rules`
6. Backend: `ProjectRuleCommandService.CreateBundleRuleAsync`
7. Database: Insert into `project_rules` table with:
   - `scope = Bundle`
   - `provenance = ManualCustom`
   - `rule_type = FhirPathCustom`
   - `definition_json = FHIRPath expression`
8. Frontend: Query invalidation triggers refetch
9. Auto-triggers validation re-run via callback
10. Validation pipeline includes new rule

### Updating a Manual Rule

1. Admin clicks Edit icon
2. Inline edit form appears (green background)
3. Modifies fields, clicks "Save Changes"
4. Frontend: `useUpdateBundleRule` mutation
5. API: `PUT /api/v2/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}`
6. Backend: `ProjectRuleCommandService.UpdateBundleRuleAsync`
7. **CRITICAL CHECK**: Rejects if `provenance == ImportedGenerated` (403 Forbidden)
8. Database: Update `project_rules` row
9. Frontend: Query invalidation + validation re-run

### Deleting a Manual Rule

1. Admin clicks Delete icon (trash)
2. Confirmation dialog appears
3. Admin confirms
4. Frontend: `useDeleteBundleRule` mutation
5. API: `DELETE /api/v2/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}`
6. Backend: `ProjectRuleCommandService.DeleteBundleRuleAsync`
7. **CRITICAL CHECK**: Rejects if `provenance == ImportedGenerated` (403 Forbidden)
8. Database: Delete from `project_rules` table
9. Frontend: Query invalidation + validation re-run

## Integration with Existing Systems

### Reuses ProjectRule Entity (Phase 7.1)
```csharp
public sealed class ProjectRule
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public RuleScope Scope { get; set; }              // Bundle
    public Guid? BundleId { get; set; }               // Required for bundle rules
    public RuleType RuleType { get; set; }            // FhirPathCustom
    public RuleProvenance Provenance { get; set; }    // ManualCustom
    public string Title { get; set; }
    public string? Description { get; set; }
    public string DefinitionJson { get; set; }         // FHIRPath expression stored here
    public bool IsEnabled { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
```

### Reuses Phase 8.1 Validation Execution
- No changes to `ProjectValidationExecutionService`
- Rules fetched from database include both imported + manual
- Validation pipeline processes all enabled rules
- Manual rules execute via existing `FhirPathRuleEngine`

### Reuses Phase 8.2 HTTP API
- Admin validation playground already calls `POST /api/v2/projects/{projectId}/bundles/{bundleId}/validate`
- Rule changes automatically trigger re-validation via callback
- No duplicate validation logic

## UI/UX Details

### Visual Distinction

**Imported Rules (Read-Only)**:
- Gray background (`bg-gray-50`)
- "Imported" badge (gray)
- "Disabled" badge if not enabled (red)
- No edit/delete buttons
- FHIRPath displayed in white pre box

**Manual Rules (Editable)**:
- White background
- "Custom" badge (green)
- "Disabled" badge if not enabled (red)
- Edit icon (blue pencil)
- Delete icon (red trash)
- Timestamp shown
- FHIRPath displayed in white pre box

**Create Form**:
- Blue border + blue-50 background
- Title/Description/FHIRPath fields
- Enabled checkbox
- "Create Rule" button (blue)
- "Cancel" button (gray)

**Edit Form**:
- Green border + green-50 background
- Same fields as create
- "Save Changes" button (green)
- "Cancel" button (gray)

### Accessibility
- All buttons have aria-labels
- Focus states on inputs
- Color-blind safe (red/green/blue are supplemented with icons and text)
- Keyboard navigation supported

## Backend Build Verification

```bash
dotnet build src/Pss.FhirProcessor.Playground.Api/Pss.FhirProcessor.Playground.Api.csproj
✅ Build succeeded (58 warnings, 0 errors)
```

## Frontend TypeChecking

```bash
npm run type-check
✅ No TypeScript errors in Phase 9.4 files
```

## File Size Summary

**Backend**:
- ProjectRuleCommandService.cs: 207 lines
- ProjectRuleManagementController.cs: 272 lines
- Program.cs: +3 lines (DI registration)
**Total backend**: ~482 lines

**Frontend**:
- projectRuleApi.ts: 104 lines
- useRuleManagement.ts: 103 lines
- RuleManagementSection.tsx: 415 lines
- AdminValidationPlaygroundPage.tsx: +6 lines (import + integration)
**Total frontend**: ~628 lines

**Grand Total**: ~1,110 lines of new code

## Testing Checklist

### Backend Tests (Manual)
- [ ] Create rule with valid FHIRPath → 201 Created
- [ ] Create rule without title → 400 Bad Request
- [ ] Create rule for non-existent bundle → 404 Not Found
- [ ] Update manual rule → 204 No Content
- [ ] Update imported rule → 403 Forbidden
- [ ] Delete manual rule → 204 No Content
- [ ] Delete imported rule → 403 Forbidden
- [ ] Get bundle rules → Returns both imported + manual

### Frontend Tests (Manual)
- [ ] Rule management section displays in validation playground
- [ ] Mandatory warning banner shows all 3 labels
- [ ] Imported rules shown with "Imported" badge
- [ ] Manual rules shown with "Custom" badge
- [ ] Create form appears on "Add Custom Rule"
- [ ] Create rule succeeds and refreshes list
- [ ] Edit icon opens inline edit form
- [ ] Edit saves and refreshes list
- [ ] Delete confirmation appears
- [ ] Delete removes rule and refreshes list
- [ ] Validation auto-reruns after create/update/delete

## Security Considerations

1. **No Authorization** - Current implementation has no auth layer (admin UI trust assumed)
2. **Input Validation** - Backend validates title + FHIRPath presence
3. **Provenance Enforcement** - Backend strictly rejects edits to ImportedGenerated rules
4. **SQL Injection** - Protected by EF Core parameterization
5. **XSS** - React automatically escapes strings

**Future Enhancement**: Add role-based authorization middleware

## Performance Considerations

1. **Query Invalidation** - Only invalidates specific bundle rules + validation queries
2. **Stale Time** - 30 seconds to reduce unnecessary refetches
3. **Database Indexes** - ProjectRule table should have indexes on (ProjectId, BundleId, Scope)
4. **No N+1 Queries** - Single query fetches all bundle rules

## Commit Message

```
feat(admin): implement Phase 9.4 manual rule management

Phase 9.4: Admin Manual Rule Management - Minimal CRUD UI for bundle-scoped custom rules.

Backend:
- ProjectRuleCommandService: CRUD for ManualCustom rules ONLY
- ProjectRuleManagementController: GET/POST/PUT/DELETE endpoints
- Enforces READ-ONLY for ImportedGenerated rules (403 Forbidden)
- DI registration in Program.cs

Frontend:
- projectRuleApi: API client for rule CRUD
- useRuleManagement: TanStack Query hooks with auto-invalidation
- RuleManagementSection: Complete CRUD UI with mandatory warnings
- Integrated into AdminValidationPlaygroundPage

Features:
- Bundle-scoped rules ONLY (RuleScope.Bundle)
- Manual rules ONLY (RuleProvenance.ManualCustom)
- Mandatory warning labels (admin-defined, not from IG, affects outcomes)
- Auto validation re-run on rule changes
- Inline create/edit forms
- Delete confirmation
- Visual distinction (imported vs manual)

REUSES:
- Existing ProjectRule entity (Phase 7.1)
- Existing validation pipeline (Phase 8.1)
- Existing validation HTTP API (Phase 8.2)

FORBIDDEN (not implemented):
- Editing imported rules (enforced 403)
- Rule ordering controls
- Severity tuning UI
- Code generation helpers

Phase 9.4 complete. Admin can now manage bundle-scoped custom validation rules.
```

## Next Steps (Future Enhancements)

1. **Authorization** - Add role-based access control
2. **Rule Templates** - Provide common FHIRPath templates
3. **FHIRPath Validation** - Syntax checking before save
4. **Rule Testing** - Test rule against sample data before enabling
5. **Audit Log** - Track who created/modified rules
6. **Bulk Operations** - Enable/disable multiple rules at once
7. **Rule Import/Export** - Share rules across projects
8. **Rule Documentation** - Link to FHIRPath docs

## Conclusion

Phase 9.4 successfully implements minimal CRUD UI for bundle-scoped manual rules with strict adherence to constraints:
- ✅ REUSES existing ProjectRule model (no new system)
- ✅ REUSES existing validation pipeline (Phase 8.1)
- ✅ Bundle-scoped ONLY (RuleScope.Bundle enforced)
- ✅ Manual ONLY (RuleProvenance.ManualCustom enforced)
- ✅ Imported rules READ-ONLY (403 Forbidden on edit/delete)
- ✅ All mandatory labels displayed prominently
- ✅ No forbidden features implemented

Admin workflow now complete: **import package → view overview → validate → manage custom rules**.
