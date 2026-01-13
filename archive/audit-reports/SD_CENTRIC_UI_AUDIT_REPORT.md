# SD-Centric Admin UI Refactor — Audit Report

**Date:** 11 January 2026  
**Scope:** Phase 1 — Frontend Bundle-Centric Assumption Audit  
**Status:** AUDIT COMPLETE — NO CODE CHANGES YET

---

## Executive Summary

The current Admin UI has **already been significantly refactored** toward an SD-centric architecture (Phase 9.6). However, there are **residual bundle-gating assumptions** in the **legacy Playground UI** that block rule authoring when bundles are missing or invalid.

**Key Finding:**  
- **Admin Project Overview** (new): Already SD-centric ✅
- **Legacy Playground UI** (old): Still bundle-gated ❌

---

## 1. Components That Assume "Bundle Must Exist Before Anything Else"

### 1.1 OverviewPanel.tsx — Rules Authoring Locked Card

**File:** `frontend/src/components/playground/Overview/OverviewPanel.tsx`  
**Lines:** 175-206

```tsx
{/* Bundle Sanity Blocking Card - Only shown when bundle structure is invalid */}
{bundleSanityState && !bundleSanityState.isValid && (
  <div className="bg-amber-50 rounded-lg border-2 border-amber-300 shadow-sm p-5">
    <div className="flex items-start gap-4">
      <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
        <AlertTriangle className="w-6 h-6 text-amber-700" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-amber-900 mb-2">
          Rules Authoring Locked
        </h3>
        <p className="text-sm text-amber-800 mb-3 leading-relaxed">
          A valid FHIR Bundle is required before rules can be created. Fix the following structural issues in your bundle:
        </p>
        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside mb-4">
          {bundleSanityState.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
        <button
          onClick={() => onOpenBundleTab?.()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-900 bg-amber-200 rounded-lg hover:bg-amber-300 transition-colors"
        >
          <FileJson className="w-4 h-4" />
          Open Bundle Editor
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
)}
```

**❌ Bundle-Centric Assumption:**  
- **Blocks rule authoring** when bundle structure is invalid
- Message: "A valid FHIR Bundle is required before rules can be created"
- CTA: "Open Bundle Editor"

**Expected SD-Centric Behavior:**  
- Rules should be authorable at the SD level, **regardless of bundle presence**
- Bundles become **sample data**, not prerequisites

---

### 1.2 OverviewPanel.tsx — Validation State Messages

**File:** `frontend/src/components/playground/Overview/OverviewPanel.tsx`  
**Lines:** 219-228

```tsx
{validationState === ValidationState.NoBundle && (
  <p className="text-sm text-gray-700 leading-relaxed">
    No bundle is currently loaded. Load a FHIR bundle in the left panel to enable validation and rule authoring.
  </p>
)}
```

**❌ Bundle-Centric Assumption:**  
- Message: "Load a FHIR bundle... **to enable validation and rule authoring**"
- Implies rule authoring requires a bundle

**Expected SD-Centric Behavior:**  
- Rule authoring is always available (SD-scoped)
- Validation requires a **sample bundle**, but authoring does not

---

### 1.3 ValidationWorkspace.tsx — No Bundle State

**File:** `frontend/src/components/shared/ValidationWorkspace.tsx`  
**Lines:** 211, 318-324

```tsx
const showNoBundleState = validationState === ValidationState.NoBundle;

// Later in render:
{showNoBundleState && (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center max-w-md">
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        No Bundle to Validate
      </h3>
      <p className="text-gray-600 mb-6">
        Load a FHIR bundle in the left panel to run validation.
        Validation will check your bundle against FHIR structural rules,
        terminology, and custom business rules.
      </p>
    </div>
  </div>
)}
```

**✅ This is appropriate for Validation tab**  
- Validation **does** require a bundle
- No rule authoring gating here

---

### 1.4 TerminologyEditor.tsx — Bundle Structure Blocking

**File:** `frontend/src/components/playground/TerminologyEditor.tsx`  
**Lines:** 23-43

```tsx
// Show blocking state if bundle is invalid
if (bundleSanityState && !bundleSanityState.isValid) {
  return (
    <div className="bg-amber-50 rounded-lg border-2 border-amber-300 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            Bundle Structure Invalid
          </h3>
          <p className="text-sm text-amber-800 mb-3">
            A valid FHIR Bundle structure is required before terminology can be edited. Please fix the bundle structure issues to continue.
          </p>
          
          {/* List of errors... */}
        </div>
      </div>
    </div>
  );
}
```

**❌ Bundle-Centric Assumption:**  
- Blocks **terminology editing** when bundle is invalid
- Message: "A valid FHIR Bundle structure is required before terminology can be edited"

**Expected SD-Centric Behavior:**  
- Terminology (CodeSystems/ValueSets) should be editable at project/SD level
- Bundle is just a **consumer** of terminology, not a prerequisite

---

### 1.5 ValidationSettingsEditor.tsx — Bundle Structure Blocking

**File:** `frontend/src/components/playground/Settings/ValidationSettingsEditor.tsx`  
**Lines:** 44

```tsx
A valid FHIR Bundle structure is required before validation settings can be edited. Please fix the bundle structure issues to continue.
```

**⚠️ Context-Dependent:**  
- If validation settings are **bundle-scoped** → blocking is appropriate
- If validation settings are **project/SD-scoped** → should not block

**Action Required:**  
- Clarify scope of validation settings
- If project-level → remove blocking

---

### 1.6 RuleSetMetadata.tsx — Bundle Structure Blocking

**File:** `frontend/src/components/playground/Metadata/RuleSetMetadata.tsx`  
**Lines:** 42

```tsx
A valid FHIR Bundle structure is required before metadata can be edited. Please fix the bundle structure issues to continue.
```

**❌ Bundle-Centric Assumption:**  
- Metadata should be editable regardless of bundle state
- Metadata is **project-level**, not bundle-dependent

---

## 2. Components That Block Rule Authoring When Bundle is Missing

### Summary from Section 1:
- **OverviewPanel.tsx** — "Rules Authoring Locked" card (lines 175-206)
- **OverviewPanel.tsx** — "Load a FHIR bundle... to enable rule authoring" (line 222)

These are the **only two components** that explicitly block rule authoring.

---

## 3. Components That Block Validation When Bundle is Missing

### ✅ This is CORRECT behavior

**ValidationWorkspace.tsx** (lines 211, 318-324):
- Shows "No Bundle to Validate" state
- This is **expected** — validation requires a bundle

**Action:** No changes needed for validation blocking.

---

## 4. Components with Bundle-Centric Labels/Copy/Gating

### 4.1 RuleManagementSection.tsx — Bundle-Scoped Rules

**File:** `frontend/src/components/admin/RuleManagementSection.tsx`  
**Lines:** 10-24, 177

```tsx
/**
 * Phase 9.4: Rule Management Section Component
 * 
 * SCOPE: Bundle-scoped manual rules ONLY
 * PROVENANCE: ManualCustom ONLY (ImportedGenerated rules are READ-ONLY)
 * 
 * MANDATORY LABELING:
 * - "Custom rule (admin-defined)"
 * - "Not derived from Implementation Guide"
 * - "May affect validation outcomes"
 */

// Later in UI:
Manage bundle-scoped validation rules. Imported rules are read-only.
```

**❌ Bundle-Centric Assumption:**  
- Rules are **bundle-scoped** (should be **SD-scoped**)
- API calls use `bundleId` parameter

**Expected SD-Centric Behavior:**  
- Rules should be **SD-scoped** (structureDefinitionId)
- Bundles inherit rules from their resolved SD

**⚠️ Backend API Impact:**  
- Current API: `/api/projects/{projectId}/bundles/{bundleId}/rules`
- Expected API: `/api/projects/{projectId}/structure-definitions/{sdId}/rules`

**Action Required:**  
- Clarify if backend API supports SD-scoped rules
- If not → backend changes needed (out of scope for UI-only refactor)

---

### 4.2 AdminValidationPlaygroundPage.tsx — Bundle-Centric Route

**File:** `frontend/src/pages/admin/AdminValidationPlaygroundPage.tsx`  
**Route:** `/admin/projects/:projectId/bundles/:bundleId/validate`

**✅ This is appropriate**  
- Validation **does** require a specific bundle
- Route correctly scopes to bundle

**No changes needed.**

---

### 4.3 StructureDefinitionCard.tsx — SD-Centric (Already Correct)

**File:** `frontend/src/components/projects/StructureDefinitionCard.tsx`

**✅ Already SD-centric:**
- Shows SD metadata first
- Lists sample bundles nested under SD
- Shows rule count per SD
- No bundle-gating logic

**No changes needed.**

---

## 5. New SD-Centric Components (Already Exist)

### ✅ Phase 9.6 Already Implemented SD-First Layout

**AdminProjectOverviewPage.tsx** (lines 16):
```tsx
/**
 * Phase 9.6: SD-Centric Admin Project Overview
 * 
 * Refactored from bundle-first to StructureDefinition-first layout.
 * Shows SDs with nested bundles grouped by profile state.
 */
```

**Components:**
- `StructureDefinitionList.tsx` — Lists all SDs, groups bundles by resolved profile
- `StructureDefinitionCard.tsx` — SD card with collapsible bundle list
- `BundleCard.tsx` — Bundle metadata with profile state badge

**No redesign needed** — Phase 9.6 already implemented this architecture.

---

## 6. Navigation Analysis

### Current Admin Navigation (AppRouter.tsx)

```tsx
{/* Admin Routes */}
<Route path="/admin/projects/import" element={<ProjectImportPage />} />
<Route path="/admin/projects/:projectId" element={<AdminProjectOverviewPage />} />
<Route path="/admin/projects/:projectId/bundles/:bundleId/validate" element={<AdminValidationPlaygroundPage />} />
```

**✅ Already SD-centric:**
- Primary route: `/admin/projects/:projectId` (Overview)
- Validation route: scoped to bundle (correct)

**⚠️ Missing Route:**
- SD Detail Page: `/admin/projects/:projectId/structure-definitions/:sdId`

**Action Required:**  
- Add SD Detail Page route
- Compose existing components: bundle editor, rules UI, validation trigger

---

### Current Playground Navigation (Legacy)

**Route:** `/projects/:projectId/*`  
**File:** `PlaygroundPage.tsx`

**Tabs:**
1. Overview
2. Bundle
3. Rules
4. Validation
5. Observations

**❌ Bundle-Centric:**
- Bundle is a top-level tab (should be scoped to SD)
- Rules tab shows bundle-gating warnings

**Action Required:**  
- Clarify if PlaygroundPage is **legacy** or **active**
- If legacy → deprecate
- If active → refactor to SD-centric

---

## 7. Components That Are Already SD-Centric ✅

### No changes needed:

1. **AdminProjectOverviewPage.tsx** — Phase 9.6 refactor complete
2. **StructureDefinitionList.tsx** — Groups bundles by SD
3. **StructureDefinitionCard.tsx** — SD-first card with nested bundles
4. **BundleCard.tsx** — Shows bundle profile state (RESOLVED/UNRESOLVED)
5. **AdminValidationPlaygroundPage.tsx** — Uses ValidationPipeline correctly

---

## 8. Backend API Compatibility Check

### Current API Endpoints (Inferred from Frontend Usage):

#### ✅ SD-Centric Endpoints (Already Exist):
```
GET /api/projects/{projectId}/artifacts                 // List all SDs
GET /api/projects/{projectId}/bundles                   // List all bundles
GET /api/projects/{projectId}/bundles/{bundleId}/profile // Get bundle profile state
POST /api/projects/{projectId}/bundles/{bundleId}/validate // Validate bundle
```

#### ❌ Bundle-Scoped Endpoints (Need SD-Scoped Alternative):
```
GET /api/projects/{projectId}/bundles/{bundleId}/rules
POST /api/projects/{projectId}/bundles/{bundleId}/rules
PUT /api/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}
DELETE /api/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}
```

**Action Required:**  
- Check if backend supports **SD-scoped rules**:
  ```
  GET /api/projects/{projectId}/structure-definitions/{sdId}/rules
  POST /api/projects/{projectId}/structure-definitions/{sdId}/rules
  ```
- If not → backend changes required (may be out of scope)

---

## 9. Summary of Files Needing Refactoring

| File | Lines | Issue | Action |
|------|-------|-------|--------|
| **OverviewPanel.tsx** | 175-206 | "Rules Authoring Locked" card blocks rule creation | Remove bundle sanity blocking for rules |
| **OverviewPanel.tsx** | 219-228 | "Load bundle to enable rule authoring" message | Update copy: "Load bundle to enable validation" (not authoring) |
| **TerminologyEditor.tsx** | 23-43 | Blocks terminology editing when bundle invalid | Remove bundle sanity check (terminology is SD-level) |
| **RuleSetMetadata.tsx** | 42 | Blocks metadata editing when bundle invalid | Remove bundle sanity check (metadata is project-level) |
| **ValidationSettingsEditor.tsx** | 44 | Blocks settings editing when bundle invalid | Check scope: if project-level, remove check |
| **RuleManagementSection.tsx** | 10-24, 177 | Bundle-scoped rules (should be SD-scoped) | **Backend API change needed** — check if SD-scoped rules exist |
| **AppRouter.tsx** | N/A | Missing SD Detail Page route | Add `/admin/projects/:projectId/structure-definitions/:sdId` |

---

## 10. Recommendations

### Phase 2 Implementation Priority:

#### 🚨 High Priority (Blocking Rule Authoring):
1. **OverviewPanel.tsx** — Remove "Rules Authoring Locked" card
2. **OverviewPanel.tsx** — Update "NoBundle" state copy
3. **TerminologyEditor.tsx** — Remove bundle sanity blocking

#### ⚠️ Medium Priority (UX Improvements):
4. **RuleSetMetadata.tsx** — Remove bundle sanity blocking
5. **ValidationSettingsEditor.tsx** — Clarify scope, remove blocking if project-level

#### 🔵 Low Priority (Backend Dependent):
6. **RuleManagementSection.tsx** — Refactor to SD-scoped rules (requires backend API)
7. **AppRouter.tsx** — Add SD Detail Page route (compose existing components)

---

## 11. Questions for Clarification

Before proceeding to Phase 2, please confirm:

### Q1: Backend API — SD-Scoped Rules
**Does the backend support SD-scoped rule endpoints?**
- If YES → proceed with `RuleManagementSection` refactor
- If NO → defer rule scoping to future backend work

### Q2: PlaygroundPage.tsx — Legacy or Active?
**Is `/projects/:projectId/*` (PlaygroundPage) still actively used?**
- If LEGACY → skip refactoring (focus on Admin UI only)
- If ACTIVE → refactor to SD-centric (significant work)

### Q3: Validation Settings Scope
**Are validation settings project-level or bundle-level?**
- If PROJECT-LEVEL → remove bundle sanity blocking
- If BUNDLE-LEVEL → keep blocking (validation settings require bundle)

### Q4: SD Detail Page — New Route or Modal?
**Should SD Detail Page be:**
- **Option A:** New route `/admin/projects/:projectId/structure-definitions/:sdId`
- **Option B:** Modal/drawer from AdminProjectOverviewPage (less navigation)

---

## 12. Next Steps (Phase 2 Preview)

Once clarifications are received, Phase 2 will:

1. **Remove Bundle-Gating Logic** (High Priority):
   - OverviewPanel: Remove "Rules Authoring Locked" card
   - OverviewPanel: Update "NoBundle" messaging
   - TerminologyEditor: Remove bundle sanity check

2. **Update Copy/Labels** (High Priority):
   - Replace "Load bundle to enable rule authoring" → "Load bundle to validate"
   - Clarify that rules are SD-scoped, bundles are samples

3. **Create SD Detail Page** (Medium Priority):
   - Compose existing components: bundle editor, rules UI, validation
   - Add route: `/admin/projects/:projectId/structure-definitions/:sdId`

4. **Refactor Rule Management** (Low Priority — Backend Dependent):
   - Update `RuleManagementSection` to use SD-scoped API
   - Update route params from `bundleId` to `structureDefinitionId`

---

## End of Audit Report

**Status:** AUDIT COMPLETE  
**Code Changes:** NONE (audit only)  
**Ready for Phase 2:** YES (pending clarifications)

---
