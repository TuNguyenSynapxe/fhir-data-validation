# Phase 9.6 Implementation Plan — SD-Centric Validation UI

**Date:** 10 January 2026  
**Status:** 📋 PLANNING  
**Scope:** Frontend-only SD-centric refactor with explicit validation scope

---

## 🎯 Objective

Transform the validation playground UI from **bundle-centric** to **SD-centric**, wiring Phase 8.3/8.4 backend APIs to surface explicit validation scope messaging.

**Core Principle:** Users must always understand:
- Which validation ran (Base FHIR vs Base + Project Rules)
- Why rules were applied or skipped
- What "resolved/unresolved/unprofiled" means

---

## 🚫 Hard Constraints (Enforced)

- ❌ NO backend API changes
- ❌ NO validation logic
- ❌ NO rule generation
- ❌ NO heuristics
- ❌ NO success checkmarks
- ❌ NO component duplication (must reuse Phase 5)
- ❌ NO bundle-centric project structure

---

## 📊 Current State Analysis

### ✅ What Exists (Reusable)

**Backend APIs (Phase 8.3/8.4)**:
- `GET /api/v2/projects` - List projects
- `GET /api/v2/projects/{id}` - Project details
- `GET /api/v2/projects/{id}/artifacts` - Get SDs
- `GET /api/v2/projects/{id}/bundles` - Get bundles
- `GET /api/v2/projects/{id}/rules` - Get rules
- `GET /api/v2/projects/{projectId}/bundles/{bundleId}/profile` - Bundle profile state
- `POST /api/v2/projects/{projectId}/bundles/{bundleId}/profile` - Set profile
- `POST /api/v2/projects/{projectId}/bundles/{bundleId}/validate` - Validate bundle
- Public validation APIs (Phase 9.5a)

**Frontend Components (Phase 5 - DO NOT DUPLICATE)**:
- `ValidationSummary` - Reuse as-is
- `ValidationIssueRow` - Reuse as-is
- `ValidationIssueDetails` - Reuse as-is
- `AmbiguityBanner` - Reuse as-is
- `ValidationResultsView` - Reuse as-is
- `useValidationResult` hook - Reuse as-is

**Frontend Pages (Existing - WILL REFACTOR)**:
- `AdminProjectOverviewPage.tsx` - Currently bundle-centric
- `AdminValidationPlaygroundPage.tsx` - Needs scope banner
- `ProjectsPage.tsx` - Keep as-is

### ❌ What's Missing (To Be Built)

**API Integration**:
- Bundle profile resolution API client
- Project artifacts (SDs) API client

**New Components**:
- Bundle profile state indicator
- Bundle profile selector
- Validation scope banner
- SD-centric project layout

**New Pages**:
- Public read-only project view
- Public read-only validation view

---

## 📂 File Structure Plan

### New Files to Create (15 total)

```
frontend/src/
├── api/
│   └── bundleProfileApi.ts          [NEW] Phase 8.3 API integration
│
├── types/
│   └── bundleProfile.ts             [NEW] Bundle profile DTOs
│
├── components/
│   └── bundles/
│       ├── BundleProfileStateIndicator.tsx    [NEW]
│       ├── BundleProfileSelector.tsx          [NEW]
│       └── BundleCard.tsx                     [NEW]
│
├── components/
│   └── validation/
│       └── ValidationScopeBanner.tsx          [NEW]
│
├── components/
│   └── projects/
│       ├── StructureDefinitionCard.tsx        [NEW]
│       └── StructureDefinitionList.tsx        [NEW]
│
├── hooks/
│   ├── useBundleProfile.ts          [NEW]
│   └── useProjectArtifacts.ts       [NEW]
│
├── pages/
│   └── public/
│       ├── PublicProjectPage.tsx             [NEW]
│       └── PublicValidationPage.tsx          [NEW]
│
└── routes/
    └── publicRoutes.tsx             [MODIFY] Add public routes
```

### Files to Modify (5 total)

```
frontend/src/
├── api/
│   └── projectQueryApi.ts           [MODIFY] Add getProjectArtifacts
│
├── pages/admin/
│   ├── AdminProjectOverviewPage.tsx          [REFACTOR] SD-centric
│   └── AdminValidationPlaygroundPage.tsx     [MODIFY] Add scope banner
│
├── routes/
│   └── index.tsx                    [MODIFY] Add public routes
│
└── types/
    └── projectImport.ts             [MODIFY] Add artifact DTOs
```

---

## 🧩 Component Specifications

### 1. BundleProfileStateIndicator.tsx

**Purpose**: Visual indicator for bundle profile resolution state

**Props**:
```typescript
interface BundleProfileStateIndicatorProps {
  state: 'resolved' | 'unresolved' | 'unprofiled';
  source?: 'auto' | 'manual';
  structureDefinitionName?: string;
  readonly?: boolean;
}
```

**UI States**:
- **Resolved**: `✅ Profile linked: {sdName}` (blue badge)
- **Unresolved**: `⚠️ No profile selected` (amber badge)
- **Unprofiled**: `ℹ️ Explicitly no profile` (gray badge)

**Copy Requirements**:
- MUST be explicit (no ambiguous language)
- MUST explain impact on validation
- NO success/failure language

---

### 2. BundleProfileSelector.tsx

**Purpose**: Admin-only dropdown to manually set bundle profile

**Props**:
```typescript
interface BundleProfileSelectorProps {
  projectId: string;
  bundleId: string;
  currentState: BundleProfileState;
  structureDefinitions: StructureDefinition[];
  onUpdate: (sdId: string | null) => void;
  disabled?: boolean;
}
```

**Features**:
- Dropdown with all Bundle-type SDs
- "No profile (FHIR only)" option
- Disabled if `source=auto` and not admin
- Shows current auto-resolved SD (grayed out)
- Manual selection overrides auto

**Validation**:
- Only show Bundle-type SDs
- Confirm before clearing profile
- Show loading state during API call

---

### 3. ValidationScopeBanner.tsx

**Purpose**: Explicit banner showing which validation ran

**Props**:
```typescript
interface ValidationScopeBannerProps {
  validationScope: {
    bundleProfileState: string;
    appliedProjectRules: boolean;
    structureDefinitionId?: string;
    source?: string;
  };
  structureDefinitionName?: string;
}
```

**UI States**:

**Resolved**:
```
┌─────────────────────────────────────────────────────┐
│ ℹ️ Validation Applied:                              │
│ • Base FHIR validation ✓                            │
│ • Project rules (Patient profile) ✓                 │
│                                                      │
│ Bundle profile: Patient (auto-resolved)             │
└─────────────────────────────────────────────────────┘
```

**Unresolved**:
```
┌─────────────────────────────────────────────────────┐
│ ℹ️ Validation Applied:                              │
│ • Base FHIR validation ✓                            │
│ • Project rules ✗ (no Bundle profile selected)      │
│                                                      │
│ To apply project rules, select a Bundle profile.    │
└─────────────────────────────────────────────────────┘
```

**Unprofiled**:
```
┌─────────────────────────────────────────────────────┐
│ ℹ️ Validation Applied:                              │
│ • Base FHIR validation ✓                            │
│ • Project rules ✗ (explicitly no profile)           │
│                                                      │
│ Bundle marked as unprofiled by admin.               │
└─────────────────────────────────────────────────────┘
```

**Design Rules**:
- NO green/red colors
- Neutral blue/gray palette
- Factual language only
- Always above ValidationSummary

---

### 4. StructureDefinitionCard.tsx

**Purpose**: SD-first display with nested bundles

**Props**:
```typescript
interface StructureDefinitionCardProps {
  structureDefinition: StructureDefinitionDto;
  bundles: ProjectBundleDto[];
  rules: ProjectRuleDto[];
  onValidateBundle: (bundleId: string) => void;
  readonly?: boolean;
}
```

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ StructureDefinition: Patient                        │
│ Resource type: Patient                               │
│ Canonical: http://hl7.org/fhir/Patient              │
│                                                      │
│ Rules (12)                                           │
│ • 8 imported from SD (read-only)                    │
│ • 4 custom rules                                     │
│                                                      │
│ Sample Bundles (3)                                   │
│ ┌───────────────────────────────────────────┐      │
│ │ ✅ Bundle A (Resolved)          [Validate] │      │
│ │ ⚠️ Bundle B (Unresolved)        [Validate] │      │
│ │ ℹ️ Bundle C (Unprofiled)        [Validate] │      │
│ └───────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

---

### 5. StructureDefinitionList.tsx

**Purpose**: Render all SDs with grouped bundles

**Props**:
```typescript
interface StructureDefinitionListProps {
  structureDefinitions: StructureDefinitionDto[];
  bundles: ProjectBundleDto[];
  bundleProfiles: Map<string, BundleProfileState>;
  rules: ProjectRuleDto[];
  onValidateBundle: (bundleId: string) => void;
  readonly?: boolean;
}
```

**Features**:
- List all SDs (even if no bundles)
- Group bundles under matching SD
- Show unassigned bundles separately
- Collapsible sections

---

## 🔌 API Integration Plan

### 1. bundleProfileApi.ts

```typescript
/**
 * Phase 8.3 Bundle Profile Resolution APIs
 */

export interface BundleProfileStateDto {
  state: 'resolved' | 'unresolved' | 'unprofiled';
  structureDefinitionId: string | null;
  source: 'auto' | 'manual' | null;
  canonicalUrl: string | null;
  name: string | null;
}

export interface SetBundleProfileRequest {
  structureDefinitionId: string | null; // null = unprofiled
}

/**
 * GET /api/v2/projects/{projectId}/bundles/{bundleId}/profile
 */
export async function getBundleProfileState(
  projectId: string,
  bundleId: string
): Promise<BundleProfileStateDto>;

/**
 * POST /api/v2/projects/{projectId}/bundles/{bundleId}/profile
 */
export async function setBundleProfile(
  projectId: string,
  bundleId: string,
  request: SetBundleProfileRequest
): Promise<BundleProfileStateDto>;
```

### 2. projectQueryApi.ts (ADD)

```typescript
export interface ProjectArtifactDto {
  artifactId: string;
  type: string; // 'StructureDefinition', 'ValueSet', etc.
  name: string;
  canonicalUrl?: string;
  resourceType?: string; // 'Patient', 'Observation', etc.
}

/**
 * GET /api/v2/projects/{id}/artifacts
 */
export async function getProjectArtifacts(
  projectId: string
): Promise<ProjectArtifactDto[]>;
```

---

## 📄 Page Refactoring Plan

### AdminProjectOverviewPage.tsx

**Current Structure** (Bundle-First):
```
Project Overview
├── Summary Cards (Artifacts, Bundles, Rules)
├── Bundles Section
│   └── Flat list of bundles
└── Rules Section
    ├── Imported rules
    └── Custom rules
```

**New Structure** (SD-First):
```
Project Overview
├── Summary Cards (Artifacts, Bundles, Rules)
├── StructureDefinitions Section
│   ├── StructureDefinition: Patient
│   │   ├── Rules (8 imported, 2 custom)
│   │   └── Sample Bundles
│   │       ├── Bundle A (✅ Resolved)
│   │       ├── Bundle B (⚠️ Unresolved)
│   │       └── Bundle C (ℹ️ Unprofiled)
│   │
│   ├── StructureDefinition: Observation
│   │   ├── Rules (12 imported)
│   │   └── Sample Bundles (2)
│   │
│   └── StructureDefinition: Encounter
│       └── Rules (5 imported)
│       └── (No sample bundles)
│
└── Unassigned Bundles (if any)
    └── Bundle D (⚠️ No matching SD)
```

**Refactor Steps**:
1. Fetch SDs via `getProjectArtifacts()`
2. Fetch bundle profiles for all bundles
3. Group bundles by resolved SD
4. Render SD cards with nested bundles
5. Show unassigned bundles separately

---

### AdminValidationPlaygroundPage.tsx

**Current**: Shows validation results only

**New**: Add ValidationScopeBanner above results

**Changes**:
1. Fetch bundle profile state on load
2. Fetch SD name if resolved
3. Pass metadata to ValidationScopeBanner
4. Render banner above ValidationSummary

---

### PublicProjectPage.tsx (NEW)

**Purpose**: Read-only SD-centric project view for public links

**Features**:
- Same layout as AdminProjectOverviewPage
- NO profile editing
- NO rule management
- "Validate" buttons link to public validation
- Breadcrumb: "Public Project: {name}"

**Route**: `/public/projects/:shareId`

---

### PublicValidationPage.tsx (NEW)

**Purpose**: Read-only validation with scope banner

**Features**:
- Uses public validation API
- Shows ValidationScopeBanner
- Shows ValidationResultsView
- NO editing
- NO re-run
- Breadcrumb shows project name

**Route**: `/public/projects/:shareId/validate/:bundleId`

---

## 🧪 Testing Strategy

### Unit Tests

**Components to Test**:
1. `BundleProfileStateIndicator`
   - Renders correct badge for each state
   - Shows SD name when resolved
   - Shows source (auto/manual)

2. `BundleProfileSelector`
   - Lists all Bundle-type SDs
   - Disables auto-resolved option
   - Calls API on selection
   - Shows loading state

3. `ValidationScopeBanner`
   - Renders correct message for resolved
   - Renders correct message for unresolved
   - Renders correct message for unprofiled
   - Shows SD name when available

4. `StructureDefinitionCard`
   - Shows SD metadata
   - Lists rules grouped by provenance
   - Lists nested bundles with state
   - Collapses/expands

### Integration Tests

**Scenarios**:
1. **SD-centric rendering**
   - Given: Project with 3 SDs, 5 bundles
   - When: Page loads
   - Then: SDs listed, bundles grouped correctly

2. **Bundle profile state display**
   - Given: Bundle with state=resolved
   - When: Card renders
   - Then: Shows "✅ Profile linked: Patient"

3. **Manual profile selection**
   - Given: Admin selects SD from dropdown
   - When: API succeeds
   - Then: State updates, indicator changes

4. **Validation scope banner**
   - Given: Validation result with scope metadata
   - When: Results render
   - Then: Banner shows correct validation info

5. **Public read-only view**
   - Given: Public link
   - When: Page loads
   - Then: No edit controls, validate buttons work

---

## 📝 Implementation Order (10 Steps)

### Step 1: API Integration (~30 min)
- ✅ Create `bundleProfileApi.ts`
- ✅ Add `getProjectArtifacts()` to `projectQueryApi.ts`
- ✅ Create `bundleProfile.ts` types
- ✅ Update `projectImport.ts` with artifact DTOs

### Step 2: React Hooks (~20 min)
- ✅ Create `useBundleProfile()` hook
- ✅ Create `useProjectArtifacts()` hook
- ✅ Create `useBundleProfileState()` for fetching multiple states

### Step 3: Bundle Profile Components (~40 min)
- ✅ Create `BundleProfileStateIndicator.tsx`
- ✅ Create `BundleProfileSelector.tsx`
- ✅ Create `BundleCard.tsx` (bundle row with profile state)

### Step 4: Validation Scope Banner (~30 min)
- ✅ Create `ValidationScopeBanner.tsx`
- ✅ Add prop types for validation metadata
- ✅ Implement 3 UI states (resolved/unresolved/unprofiled)

### Step 5: SD Components (~50 min)
- ✅ Create `StructureDefinitionCard.tsx`
- ✅ Create `StructureDefinitionList.tsx`
- ✅ Add bundle grouping logic

### Step 6: Refactor AdminProjectOverviewPage (~60 min)
- ✅ Fetch SDs and bundle profiles
- ✅ Group bundles by SD
- ✅ Replace bundle-first with SD-first layout
- ✅ Add profile selector to each bundle
- ✅ Show rules at SD level

### Step 7: Update AdminValidationPlaygroundPage (~20 min)
- ✅ Fetch bundle profile state
- ✅ Add ValidationScopeBanner above results
- ✅ Pass metadata from validation response

### Step 8: Public Pages (~60 min)
- ✅ Create `PublicProjectPage.tsx` (read-only SD view)
- ✅ Create `PublicValidationPage.tsx` (read-only validation)
- ✅ Wire up public API endpoints
- ✅ Add public routes

### Step 9: Routing (~15 min)
- ✅ Add public routes to router
- ✅ Update navigation links
- ✅ Add breadcrumbs

### Step 10: Testing (~45 min)
- ✅ Unit tests for new components
- ✅ Integration tests for SD-centric rendering
- ✅ Manual QA of all UI states

**Total Estimated Time**: ~5-6 hours

---

## ✅ Exit Criteria

Phase 9.6 is **COMPLETE** when:

### Functional Requirements
- [x] Projects display SD-first, not bundle-first
- [x] Bundles grouped under their resolved SD
- [x] Profile state visible for each bundle
- [x] Admin can manually set/clear bundle profile
- [x] Validation scope banner shows above results
- [x] Banner accurately reflects applied validation
- [x] Public playground is read-only
- [x] Public validation shows scope

### UI Requirements
- [x] NO green success states
- [x] NO misleading "passed" language
- [x] Explicit factual copy only
- [x] Ambiguity always visible
- [x] Neutral color palette

### Technical Requirements
- [x] Reuses Phase 5 validation components
- [x] NO backend API changes
- [x] NO validation logic added
- [x] NO heuristics
- [x] All tests pass

### User Understanding
- [x] User knows which validation ran
- [x] User knows why rules applied/skipped
- [x] User understands resolved/unresolved/unprofiled
- [x] No false confidence created

---

## 🎨 Design System

### Colors

**Profile States**:
- Resolved: `bg-blue-50 border-blue-200 text-blue-800`
- Unresolved: `bg-amber-50 border-amber-200 text-amber-800`
- Unprofiled: `bg-gray-50 border-gray-200 text-gray-800`

**Validation Scope Banner**:
- Background: `bg-blue-50`
- Border: `border-blue-200`
- Text: `text-blue-900`
- Icon: Lucide `Info` (blue)

**Icons**:
- Resolved: `CheckCircle2` (blue)
- Unresolved: `AlertCircle` (amber)
- Unprofiled: `Info` (gray)
- SD Card: `FileCode` (purple)

### Typography

**Headings**:
- SD Name: `text-lg font-semibold text-gray-900`
- Bundle Name: `text-sm font-medium text-gray-900`
- Section Headers: `text-base font-medium text-gray-900`

**Body**:
- Metadata: `text-xs text-gray-600`
- Helper text: `text-sm text-gray-500`
- Banner text: `text-sm text-blue-900`

---

## 📊 Metrics & Success Indicators

**User Confusion Reduction**:
- Users understand "unresolved" ≠ error
- Users know when rules apply
- Users don't assume validation is "complete"

**Code Quality**:
- Zero component duplication
- Zero backend changes
- All reuse requirements met

**Test Coverage**:
- 100% of new components tested
- All UI states verified
- Public/admin paths tested

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests pass
- [ ] No console errors
- [ ] No accessibility violations
- [ ] Manual QA completed

### Deployment
- [ ] Frontend build succeeds
- [ ] Backend APIs responding (Phase 8.3/8.4)
- [ ] Database migration applied (Phase 8.3)

### Post-Deployment
- [ ] Verify public links work
- [ ] Verify profile selection works
- [ ] Verify validation scope appears
- [ ] Verify read-only enforcement

---

## 🧠 Key Architectural Decisions

### 1. Why SD-First?
- **Truth**: SDs define validation rules
- **Clarity**: Bundles are samples, not definitions
- **Scalability**: 100 SDs + 1000 bundles = organized by 100 categories

### 2. Why Explicit Scope Banner?
- **Transparency**: Users always know what validated
- **Education**: Teaches difference between base FHIR and project rules
- **No Surprises**: Never hide why validation behaved differently

### 3. Why No Success States?
- **Reality**: FHIR validation is never "complete"
- **Honesty**: Absence of errors ≠ data is correct
- **Responsibility**: Don't create false confidence

### 4. Why Manual Override?
- **Control**: Admins know their data better than heuristics
- **Explicitness**: No hidden auto-matching
- **Auditability**: Source tracked (auto vs manual)

---

## 📚 Reference Documentation

### Backend (Already Built)
- [Phase 8.3 Implementation](./PHASE_8_3_IMPLEMENTATION_COMPLETE.md)
- [Phase 8.4 Implementation](./PHASE_8.4_COMPLETE.md)
- [docs/08_unified_error_model.md](./docs/08_unified_error_model.md)

### Frontend (To Be Updated)
- Validation components in `src/validation/components/`
- Project query hooks in `src/hooks/`

---

## ✅ Approval Required

**Before proceeding, confirm:**

1. **Scope Approved**: All components listed are necessary?
2. **Design Approved**: UI mockups and copy acceptable?
3. **Timeline Approved**: 5-6 hours implementation time acceptable?
4. **No Backend Changes**: Understood no APIs will be added?
5. **Reuse Enforced**: Phase 5 components will be reused as-is?

**Sign-off**: _______________  
**Date**: _______________

---

**END OF PHASE 9.6 IMPLEMENTATION PLAN**

---

**Next Step**: Upon approval, proceed with Step 1 (API Integration)
