# Stage System Refactor - Visual Comparison

## 🔴 BEFORE: Blocking System

### Validation Failed State
```
┌─────────────────────────────────────────────────────────┐
│ 🔴 ❌ Rule Editing Disabled                             │
│                                                          │
│ 🔒 Your bundle contains validation errors. Rules        │
│ cannot be edited or applied until all errors are fixed. │
│                                                          │
│ → Switch to the Validation tab to view and fix errors   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [+ Add Rule] ❌ DISABLED                                │
│  [Tree Authoring] ❌ DISABLED                            │
└─────────────────────────────────────────────────────────┘

Rules:
┌─────────────────────────────────────────────────────────┐
│  📋 Patient.name - required                              │
│      [✏️  Edit] ❌ "Fix validation errors first"          │
│      [🗑️ Delete] ❌ "Fix validation errors first"        │
└─────────────────────────────────────────────────────────┘
```

**User Experience:**
- ❌ Cannot create new rules
- ❌ Cannot edit existing rules  
- ❌ Cannot delete rules
- ❌ Red blocking banner dominates UI
- ❌ Forced to fix validation first
- ❌ Workflow blocked

---

## 🟢 AFTER: Advisory System

### Bundle Has Issues (Info)
```
┌─────────────────────────────────────────────────────────┐
│ ℹ️  Bundle Not Yet Validated                            │
│                                                          │
│ Consider validating your bundle before authoring rules  │
│ to ensure rules have proper context.                    │
│                                                          │
│ 💡 Suggestion: Run validation to check bundle structure │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [+ Add Rule] ✅ ENABLED                                 │
│  [Tree Authoring] ✅ ENABLED                             │
└─────────────────────────────────────────────────────────┘

Rules:
┌─────────────────────────────────────────────────────────┐
│  📋 Patient.name - required                              │
│      [✏️  Edit] ✅ "Edit rule"                            │
│      [🗑️ Delete] ✅ "Delete rule"                         │
└─────────────────────────────────────────────────────────┘
```

**User Experience:**
- ✅ Can create new rules anytime
- ✅ Can edit existing rules
- ✅ Can delete rules
- ✅ Blue info banner suggests best practices
- ✅ User decides when to validate
- ✅ Workflow never blocked

### Bundle Has Structural Issues (Warning)
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Bundle Has Structural Issues                        │
│                                                          │
│ Your bundle has validation errors. Rule execution may   │
│ be unreliable until structural issues are resolved.     │
│                                                          │
│ 💡 You can still author rules, but results may vary     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [+ Add Rule] ✅ ENABLED                                 │
│  [Tree Authoring] ✅ ENABLED                             │
│  [Run Validation] ✅ ENABLED                             │
└─────────────────────────────────────────────────────────┘
```

---

## Stage Progression

### Stage 1: ProjectCreated
```
┌─────────────────────────────────────────────────────────┐
│ ℹ️  Project Created - Bundle Not Yet Loaded             │
│                                                          │
│ Rules can be authored, but they won't have data context │
│ until you upload a bundle.                              │
│                                                          │
│ 💡 Suggestion: Upload a bundle to provide data context  │
└─────────────────────────────────────────────────────────┘
```

**Actions Available:**
- ✅ Create rules (will have no data context)
- ✅ Export rules
- ✅ Import rules

---

### Stage 2: BundleLoaded
```
┌─────────────────────────────────────────────────────────┐
│ ℹ️  Bundle Loaded - Not Yet Validated                   │
│                                                          │
│ Consider validating your bundle to check for structural │
│ issues before authoring rules.                          │
│                                                          │
│ 💡 Suggestion: Run FHIR validation first                │
└─────────────────────────────────────────────────────────┘
```

**Actions Available:**
- ✅ Create rules (will work, but no validation feedback)
- ✅ Edit rules
- ✅ Run validation
- ✅ View bundle tree

---

### Stage 3: StructuralValid
```
┌─────────────────────────────────────────────────────────┐
│ ✅ Bundle Validated Successfully                         │
│                                                          │
│ Your bundle is structurally valid. You can now author   │
│ rules with confidence.                                   │
│                                                          │
│ 💡 Ready to create rules and run validation             │
└─────────────────────────────────────────────────────────┘
```

**Actions Available:**
- ✅ Create rules (optimal experience)
- ✅ Edit rules
- ✅ Run rule validation
- ✅ Tree authoring with path hints

---

### Stage 4: RuleExecuted
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Rules Executed - View Results                        │
│                                                          │
│ Your rules have been validated against the bundle.      │
│ Check the Validation tab for results.                   │
│                                                          │
│ 💡 Bundle/rules changed? Re-run validation to update    │
└─────────────────────────────────────────────────────────┘
```

**Actions Available:**
- ✅ All actions available
- ✅ View validation results
- ✅ Iterate on rules based on feedback

---

## Color Coding

### Info (Blue) - Stage Descriptions
- `bg-blue-50 border-blue-300`
- Used for: ProjectCreated, BundleLoaded
- Tone: Informational, helpful
- Icon: `ℹ️  Info`

### Warning (Amber) - Attention Needed
- `bg-amber-50 border-amber-300`
- Used for: StructuralIssues, RulesChanged
- Tone: Cautionary but permissive
- Icon: `⚠️  AlertTriangle`

### Success (Green) - Optimal State
- `bg-green-50 border-green-300`
- Used for: StructuralValid, RuleExecuted successfully
- Tone: Positive reinforcement
- Icon: `✅ CheckCircle`

### ❌ NEVER USED: Error (Red) - Blocking
- ~~`bg-red-50 border-red-300`~~
- ~~Icon: `❌ XCircle`, `🔒 Lock`~~
- **REMOVED**: No blocking states

---

## Messaging Tone Comparison

### 🔴 BEFORE (Imperative/Blocking)
- "Rule Editing **Disabled**"
- "**Cannot** be edited or applied"
- "**Must** fix errors first"
- "**Fix** validation errors first"
- "**Prevented** from creating rules"

### 🟢 AFTER (Suggestive/Permissive)
- "**Consider** validating bundle first"
- "**May be** unreliable"
- "**Suggestion**: Run validation"
- "**You can still** author rules"
- "**Ready to** create rules"

---

## Button State Comparison

### 🔴 BEFORE
```tsx
<button
  disabled={true}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
  title="Fix validation errors first"
>
  ✏️  Edit
</button>
```

**Visual**: Greyed out, cursor changes to "not-allowed"

### 🟢 AFTER
```tsx
<button
  className="... hover:bg-blue-50"
  title="Edit rule"
>
  ✏️  Edit
</button>
```

**Visual**: Always enabled, normal hover effects

---

## Advisory Examples by Scenario

### Scenario 1: Just Created Project
```
Stage: ProjectCreated
Advisory: INFO (Blue)
Message: "Project created - bundle not yet loaded"
Suggestions: ["Upload a bundle to provide data context"]
Actions: All enabled, but rules have no context
```

### Scenario 2: Bundle Uploaded, Not Validated
```
Stage: BundleLoaded
Advisory: INFO (Blue)
Message: "Bundle loaded - not yet validated"
Suggestions: ["Run FHIR validation to check structure"]
Actions: All enabled, validation recommended
```

### Scenario 3: Bundle Has Validation Errors
```
Stage: BundleLoaded
Advisory: WARNING (Amber)
Message: "Bundle has structural issues"
Suggestions: ["Fix structural issues for reliable rule execution"]
Actions: All enabled, but execution may be unreliable
```

### Scenario 4: Bundle Valid
```
Stage: StructuralValid
Advisory: SUCCESS (Green)
Message: "Bundle validated successfully"
Suggestions: ["Ready to author rules with confidence"]
Actions: All enabled, optimal experience
```

### Scenario 5: Rules Changed After Validation
```
Stage: StructuralValid (stale)
Advisory: INFO (Blue)
Message: "Rules have changed since last validation"
Suggestions: ["Re-run validation to see updated results"]
Actions: All enabled, re-validation suggested
```

---

## Key Differences Summary

| Aspect | BEFORE (Blocking) | AFTER (Advisory) |
|--------|------------------|------------------|
| **Rule Creation** | ❌ Blocked when validation fails | ✅ Always available |
| **Rule Editing** | ❌ Blocked when validation fails | ✅ Always available |
| **Validation** | ❌ Required before rules | ✅ Suggested, not required |
| **Banner Color** | 🔴 Red (error) | 🔵 Blue/🟡 Amber (info/warning) |
| **Banner Tone** | Imperative ("Cannot", "Must") | Suggestive ("Consider", "May") |
| **Button States** | Disabled when blocked | Always enabled |
| **User Control** | System decides workflow | User decides workflow |
| **Error Handling** | Stops user entirely | Informs user of implications |

---

## Implementation Status

✅ **COMPLETE**: All blocking logic removed  
✅ **COMPLETE**: Advisory components created  
📋 **PENDING**: Integration of advisory banners  
📋 **PENDING**: User acceptance testing

---

## Testing Scenarios

### ✅ Test 1: Create Project
1. Create new project
2. Navigate to Rules tab
3. **VERIFY**: Tab is accessible, no errors
4. **VERIFY**: "Add Rule" button is enabled
5. **VERIFY**: Advisory shows: "Bundle not yet loaded"

### ✅ Test 2: Load Invalid Bundle
1. Upload bundle with validation errors
2. Navigate to Rules tab
3. **VERIFY**: All buttons still enabled
4. **VERIFY**: Can create/edit/delete rules
5. **VERIFY**: Advisory shows warning (amber), not error (red)

### ✅ Test 3: Edit Rules Without Validation
1. Load valid bundle
2. Don't run validation
3. Try to create rule
4. **VERIFY**: Rule creation works
5. **VERIFY**: Advisory suggests validation, doesn't block

### ✅ Test 4: Never Blocked
1. Create project
2. Load invalid bundle
3. Try every action: create, edit, delete, toggle, export
4. **VERIFY**: Nothing is ever disabled
5. **VERIFY**: No red blocking banners

---

**Philosophy**: *Inform, don't restrict. Suggest, don't command. Guide, don't block.*
