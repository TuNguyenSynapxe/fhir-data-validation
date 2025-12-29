# QuestionAnswer Rule Authoring — Full RuleForm UX Compliance

## Status: ✅ COMPLETE

QuestionAnswer rules are now **fully aligned** with the unified RuleForm architecture.

---

## Requirements Checklist

### ✅ 1. Use RuleForm.tsx for Create and Edit

**Implementation:**
- **AddRuleModal.tsx** routes QuestionAnswer to RuleForm with `mode="create"`
- **RuleEditorModal.tsx** routes QuestionAnswer to RuleForm with `mode="edit"`
- Legacy QuestionAnswerRuleForm.tsx **DELETED**

**Code:**
```tsx
// Create flow (AddRuleModal.tsx)
<RuleForm
  mode="create"
  ruleType="QuestionAnswer"
  onCancel={handleCancel}
  onSave={handleSave}
  projectBundle={projectBundle}
  projectId={projectId}
/>

// Edit flow (RuleEditorModal.tsx)
<RuleForm
  mode="edit"
  ruleType="QuestionAnswer"
  initialRule={rule}
  onCancel={onClose}
  onSave={onSave}
  projectBundle={projectBundle}
  projectId={projectId}
/>
```

---

### ✅ 2. Remove Duplicated Resource / Scope / Severity UI

**Implementation:**
QuestionAnswerConfigSection does **NOT** render:
- ❌ Resource selector (RuleForm handles via ResourceSelector)
- ❌ Instance scope selector (RuleForm handles via RuleScopeSelector)
- ❌ Severity selector (RuleForm handles via SeveritySelector)
- ❌ User hint input (RuleForm handles via UserHintInput)
- ❌ Preview panel (RuleForm handles via RulePreviewPanel)

All shared UI is rendered by RuleForm **BEFORE** calling QuestionAnswerConfigSection.

---

### ✅ 3. QuestionAnswerConfigSection ONLY Handles Rule-Specific Params

**Implementation:**
QuestionAnswerConfigSection handles **ONLY**:
- ✅ Parent iteration path (e.g., "Observation.component")
- ✅ Question set selection (QuestionSetSelector)
- ✅ Question path (relative to iteration)
- ✅ Answer path (relative to iteration)
- ✅ Constraint selection (REQUIRED, TYPE, RANGE, VALUESET)
- ✅ Runtime error code info panel (shows 6 possible codes)

**Code Structure:**
```tsx
<QuestionAnswerConfigSection
  projectId={projectId}
  resourceType={resourceType}           // READ-ONLY prop
  iterationScope={iterationScope}
  questionPath={questionPath}
  answerPath={answerPath}
  questionSetId={questionSetId}
  constraint={constraint}
  onIterationScopeChange={...}
  onQuestionPathChange={...}
  onAnswerPathChange={...}
  onQuestionSetIdChange={...}
  onConstraintChange={...}
  errors={...}
  projectBundle={projectBundle}         // READ-ONLY prop
  questionSets={questionSets}
/>
```

**Architecture Compliance:**
- Config section is **pluggable** - receives props, emits changes via callbacks
- Does **NOT** manage resource/scope/severity state
- Does **NOT** render Save/Cancel buttons
- Does **NOT** handle errorCode (runtime-determined)

---

### ✅ 4. ErrorCode Handling

**Implementation:**
- ❌ **NO** errorCode input field in QuestionAnswerConfigSection
- ✅ RuleForm displays **"Automatic at runtime"** badge (green)
- ✅ QuestionAnswerConfigSection shows **Runtime Error Code Info Panel** listing all 6 possible codes

**UI Display (RuleForm):**
```tsx
{errorCodeMode === 'runtime-determined' && (
  <div className="px-4 py-3 border border-green-200 bg-green-50 rounded-md">
    <div className="flex items-center gap-2">
      <Tag size={16} className="text-green-600" />
      <span className="text-sm font-semibold text-green-900">
        Automatic at runtime
      </span>
    </div>
    <p className="text-xs text-green-700 mt-1">
      Error code is determined based on validation outcome (see info panel above)
    </p>
  </div>
)}
```

**Runtime Error Codes Shown:**
1. `ANSWER_REQUIRED` — Required answer missing
2. `INVALID_ANSWER_VALUE` — Answer type/format mismatch
3. `ANSWER_OUT_OF_RANGE` — Numeric value outside range
4. `ANSWER_NOT_IN_VALUESET` — Code not in allowed ValueSet
5. `QUESTION_NOT_FOUND` — Question not in QuestionSet
6. `QUESTIONSET_DATA_MISSING` — QuestionSet data unavailable

---

### ✅ 5. Edit Mode Behavior

**Implementation:**
- ✅ Resource selection **locked** (ResourceSelector with `disabled={mode === 'edit'}`)
- ✅ Shows **collapsed summary** with lock icon
- ✅ Helper text: "Resource type is locked for existing rules."
- ✅ All rule-specific fields **hydrated** from initialRule

**Code (RuleForm):**
```tsx
// Semantic disable: Resource type immutable in edit mode
<ResourceSelector
  value={resourceType}
  onChange={setResourceType}
  disabled={mode === 'edit'}  // LOCKED in edit mode
  projectBundle={projectBundle}
/>
```

**Edit Mode Summary Display:**
```
┌─────────────────────────────────────────┐
│ 🔒 QuestionnaireResponse                │
│    Resource type is locked for existing │
│    rules.                               │
│                                         │
│ ✅ 3 QuestionnaireResponse instances in │
│    current bundle                       │
└─────────────────────────────────────────┘
```

---

### ✅ 6. Bundle Awareness

**Implementation:**
- ✅ ResourceSelector receives `projectBundle` prop
- ✅ Calculates resource count: `projectBundle.entry.filter(e => e.resource?.resourceType === value).length`
- ✅ Shows **green message** if resources found: "3 QuestionnaireResponse instances in current bundle"
- ✅ Shows **amber warning** if not found: "Not found in current bundle. This rule will not run unless this resource appears."
- ✅ Works in **both create and edit modes**
- ✅ Non-blocking advisory UX (doesn't prevent rule creation)

**Code (ResourceSelector):**
```tsx
const resourceCount = useMemo(() => {
  if (!value || !projectBundle?.entry) return 0;
  return projectBundle.entry.filter((e: any) => 
    e.resource?.resourceType === value
  ).length;
}, [value, projectBundle]);

const bundleStatus = useMemo(() => {
  if (resourceCount > 0) {
    return {
      type: 'success' as const,
      message: `${resourceCount} ${value} ${resourceCount === 1 ? 'instance' : 'instances'} in current bundle`,
    };
  }
  return {
    type: 'warning' as const,
    message: `Not found in current bundle. This rule will not run unless this resource appears.`,
  };
}, [resourceCount, value]);
```

---

### ✅ 7. Preview Panel is Shared RulePreviewPanel

**Implementation:**
- ✅ RuleForm uses **shared RulePreviewPanel** component
- ✅ Same preview panel used by ALL rule types
- ✅ Collapsible panel with example runtime error
- ❌ QuestionAnswerConfigSection does NOT render its own preview

**Code (RuleForm):**
```tsx
<RulePreviewPanel
  resourceType={resourceType}
  errorCode={computedErrorCode}
  severity={severity}
  fieldPath={fieldPath}
  userHint={userHint}
  collapsed={!showPreview}
  onToggle={() => setShowPreview(!showPreview)}
/>
```

---

## Architecture Verification

### Component Hierarchy (QuestionAnswer Create/Edit)

```
RuleForm (SINGLE ENTRY POINT)
├── Header (Title, X button)
├── 1️⃣ ResourceSelector (SHARED) ← projectBundle passed
│   └── Bundle awareness (green/amber message)
├── 2️⃣ RuleScopeSelector (SHARED)
│   └── Opens InstanceScopeDrawer
├── 3️⃣ QuestionAnswerConfigSection (RULE-SPECIFIC)
│   ├── Conceptual model hint
│   ├── Parent iteration path
│   ├── QuestionSetSelector
│   ├── RelativePathFields (question, answer)
│   ├── FhirPathPreview
│   ├── QuestionAnswerConstraintSelector
│   └── Runtime error code info (6 codes)
├── 4️⃣ SeveritySelector (SHARED)
├── 5️⃣ ErrorCode Display (CENTRALIZED)
│   └── "Automatic at runtime" (green badge)
├── 6️⃣ UserHintInput (SHARED)
├── 7️⃣ RulePreviewPanel (SHARED)
└── Footer (Cancel, Save)
```

### Data Flow

```
User Action → RuleForm State Update → QuestionAnswerConfigSection Receives Props
                                    → User Interaction → Callback Invoked
                                                       → RuleForm State Updated
                                                       → QuestionAnswerConfigSection Re-renders
```

**Key Points:**
- State lives in **RuleForm**
- Config section is **controlled component**
- No duplicate state management
- No direct DOM mutations

---

## File Changes Summary

### ❌ Deleted Files
- `frontend/src/components/playground/Rules/rule-types/question-answer/QuestionAnswerRuleForm.tsx`

### ✅ Modified Files
- `frontend/src/components/playground/Rules/rule-types/question-answer/index.ts`
  - Removed export of QuestionAnswerRuleForm
  - Added comment: "QuestionAnswerRuleForm removed - use RuleForm with ruleType='QuestionAnswer'"

### ✅ Existing Compliant Files (No Changes Needed)
- `frontend/src/components/playground/Rules/RuleForm.tsx` ← Already routes QuestionAnswer correctly
- `frontend/src/components/playground/Rules/rule-types/question-answer/QuestionAnswerConfigSection.tsx` ← Already properly scoped
- `frontend/src/components/playground/Rules/add-rule/AddRuleModal.tsx` ← Already uses RuleForm
- `frontend/src/components/playground/Rules/RuleEditorModal.tsx` ← Already uses RuleForm
- `frontend/src/components/playground/Rules/common/ResourceSelector.tsx` ← Already bundle-aware

---

## Build Status

```bash
npm run build
✓ 2632 modules transformed.
dist/index.html                   0.58 kB │ gzip:   0.38 kB
dist/assets/index-BrjDlwAm.css   49.95 kB │ gzip:   8.61 kB
dist/assets/index-B-AB3p9z.js   774.25 kB │ gzip: 209.19 kB
✓ built in 4.49s
```

**Result:** ✅ Build successful with 0 TypeScript errors

---

## Testing Checklist

### Create QuestionAnswer Rule
- [ ] Open AddRuleModal
- [ ] Select "Question & Answer" rule type
- [ ] Verify ResourceSelector shows with grid (create mode)
- [ ] Select "QuestionnaireResponse" resource
- [ ] Verify grid collapses to summary
- [ ] Verify bundle status shows (green if found, amber if not)
- [ ] Verify RuleScopeSelector shows
- [ ] Configure iteration scope (e.g., "QuestionnaireResponse.item")
- [ ] Verify QuestionAnswerConfigSection renders
- [ ] Select question set
- [ ] Configure question/answer paths
- [ ] Select constraint (e.g., REQUIRED)
- [ ] Verify runtime error code info panel shows 6 codes
- [ ] Verify SeveritySelector shows
- [ ] Verify "Automatic at runtime" badge shows (green)
- [ ] Add user hint (optional)
- [ ] Verify RulePreviewPanel shows
- [ ] Click "Create Rule"
- [ ] Verify rule saved with correct params

### Edit QuestionAnswer Rule
- [ ] Open existing QuestionAnswer rule
- [ ] Verify RuleForm opens (not legacy form)
- [ ] Verify ResourceSelector shows LOCKED summary
- [ ] Verify lock icon displayed
- [ ] Verify "Resource type is locked for existing rules" message
- [ ] Verify bundle status shows
- [ ] Verify NO "Change" button (edit mode)
- [ ] Verify RuleScopeSelector hydrated
- [ ] Verify iteration scope hydrated
- [ ] Verify question set hydrated
- [ ] Verify question/answer paths hydrated
- [ ] Verify constraint hydrated
- [ ] Verify runtime error code info shows
- [ ] Verify severity hydrated
- [ ] Verify "Automatic at runtime" badge shows
- [ ] Verify user hint hydrated
- [ ] Modify constraint
- [ ] Click "Save Changes"
- [ ] Verify rule updated

### Bundle Awareness
- [ ] Create QuestionAnswer rule for resource NOT in bundle
- [ ] Verify amber warning: "Not found in current bundle..."
- [ ] Verify rule can still be saved (non-blocking)
- [ ] Create QuestionAnswer rule for resource IN bundle
- [ ] Verify green message: "X QuestionnaireResponse instances in current bundle"
- [ ] Edit existing rule
- [ ] Verify bundle status shows in locked summary

---

## Compliance Matrix

| Requirement | Status | Notes |
|-------------|--------|-------|
| Use RuleForm for create | ✅ | AddRuleModal routes to RuleForm |
| Use RuleForm for edit | ✅ | RuleEditorModal routes to RuleForm |
| Remove duplicated Resource UI | ✅ | ConfigSection doesn't render ResourceSelector |
| Remove duplicated Scope UI | ✅ | ConfigSection doesn't render RuleScopeSelector |
| Remove duplicated Severity UI | ✅ | ConfigSection doesn't render SeveritySelector |
| ConfigSection only rule params | ✅ | Only iteration, question set, paths, constraint |
| No errorCode input | ✅ | ConfigSection omits errorCode field |
| "Automatic at runtime" badge | ✅ | RuleForm shows green badge |
| Show 6 possible error codes | ✅ | ConfigSection shows info panel |
| Resource locked in edit | ✅ | ResourceSelector disabled={mode === 'edit'} |
| Show resource summary in edit | ✅ | Collapsed view with lock icon |
| Bundle awareness | ✅ | ResourceSelector checks projectBundle |
| QuestionnaireResponse support | ✅ | Included in RESOURCE_ICONS |
| Shared preview panel | ✅ | RuleForm uses RulePreviewPanel |
| Legacy form deleted | ✅ | QuestionAnswerRuleForm.tsx removed |
| Build successful | ✅ | 0 TypeScript errors |

---

## Architecture Benefits

### ✅ Consistency
- QuestionAnswer rules use **identical UX skeleton** as Required and Pattern rules
- All rules follow: Resource → Scope → Config → Severity → ErrorCode → UserHint → Preview
- No UX drift between rule types

### ✅ Maintainability
- **Single source of truth** for shared UI
- Changes to ResourceSelector automatically apply to QuestionAnswer rules
- No duplicate resource selector implementations

### ✅ Governance
- ErrorCode handling is **centralized** in RuleForm
- QuestionAnswer rules automatically show "Automatic at runtime"
- No way to bypass runtime error code governance

### ✅ Type Safety
- All QuestionAnswer state typed in RuleForm
- QuestionAnswerConfigSection has explicit props interface
- No implicit state dependencies

### ✅ Bundle Awareness
- Advisory UX automatically shows resource availability
- Same behavior across ALL rule types
- Non-blocking (informs but doesn't prevent rule creation)

---

## Next Steps

1. ✅ **COMPLETE:** QuestionAnswer rules fully aligned with RuleForm
2. ⏳ **PENDING:** End-to-end UI testing
3. ⏳ **PENDING:** Migrate remaining rule types (FixedValue, AllowedValues, CodeSystem, ArrayLength)
4. ⏳ **PENDING:** Delete legacy editor in RuleEditorModal

---

**Status:** ✅ FULLY COMPLIANT  
**Date:** 29 December 2025  
**Files Deleted:** 1 (QuestionAnswerRuleForm.tsx)  
**Files Modified:** 1 (index.ts)  
**Breaking Changes:** None (legacy form was deprecated, removal is cleanup)  
**Build Status:** ✅ Successful (0 errors)
