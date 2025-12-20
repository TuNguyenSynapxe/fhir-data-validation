# Rule Review Refactoring - Before/After Examples

## Overview

This document shows how the refactoring separates backend FACTS (reason codes) from frontend WORDING (user-friendly messages).

---

## Example 1: Patient.name.family (Valid Path, Not in Sample)

### Before Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-001",
  "type": "PATH_NOT_OBSERVED",
  "severity": "info",
  "message": "Path \"Patient.name.family\" not found in current bundle",
  "details": "This may be expected if the path is conditional or optional. Rule will still execute at runtime."
}
```

**UI Display:**
```
ℹ️ Path "Patient.name.family" not found in current bundle
```

### After Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-001",
  "type": "PATH_NOT_OBSERVED",
  "severity": "info",
  "message": "Path \"Patient.name.family\" not found in current bundle",
  "details": "This may be expected if the path is conditional or optional. Rule will still execute at runtime.",
  "reason": "NOT_PRESENT_IN_SAMPLE",
  "path": "Patient.name.family",
  "resourceType": "Patient"
}
```

**UI Display (via formatRuleReviewMessage):**
```
ℹ️ Path 'Patient.name.family' was not observed in the current bundle. 
   This may be expected if the element is optional or conditionally present.
```

**Improvement:**
- Clearer that this is about *observation* in *current* bundle
- Explicitly mentions "optional or conditionally present"
- More professional tone

---

## Example 2: Patient.language (Conditional Path)

### Before Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-002",
  "type": "PATH_NOT_OBSERVED",
  "severity": "info",
  "message": "Path \"Patient.language\" not found in current bundle",
  "details": "This may be expected if the path is conditional or optional. Rule will still execute at runtime."
}
```

**UI Display:**
```
ℹ️ Path "Patient.language" not found in current bundle
```

**Problem:** 
- Doesn't convey that `language` is a known conditional field in FHIR
- Same message as Example 1, even though this is a more expected case

### After Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-002",
  "type": "PATH_NOT_OBSERVED",
  "severity": "info",
  "message": "Path \"Patient.language\" not found in current bundle",
  "details": "This may be expected if the path is conditional or optional. Rule will still execute at runtime.",
  "reason": "CONDITIONAL_PATH",
  "path": "Patient.language",
  "resourceType": "Patient"
}
```

**UI Display (via formatRuleReviewMessage):**
```
ℹ️ Path 'Patient.language' is conditionally present in FHIR. 
   The rule will apply when this element exists at runtime.
```

**Improvement:**
- Explicitly identifies this as a *known* conditional path
- Reassures user this is expected FHIR behavior
- Different message than generic "not in sample" case

---

## Example 3: Patient.id.id.extension.url (Internal Schema Path)

### Before Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-003",
  "type": "PATH_NOT_OBSERVED",
  "severity": "info",
  "message": "Path \"Patient.id.id.extension.url\" not found in current bundle",
  "details": "This may be expected if the path is conditional or optional. Rule will still execute at runtime."
}
```

**UI Display:**
```
ℹ️ Path "Patient.id.id.extension.url" not found in current bundle
```

**Problem:**
- This path looks suspicious (repeated `.id.id`)
- Message doesn't explain this is an unusual but valid schema artifact
- User may think their rule is wrong

### After Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-003",
  "type": "PATH_NOT_OBSERVED",
  "severity": "info",
  "message": "Path \"Patient.id.id.extension.url\" not found in current bundle",
  "details": "This may be expected if the path is conditional or optional. Rule will still execute at runtime.",
  "reason": "INTERNAL_SCHEMA_PATH",
  "path": "Patient.id.id.extension.url",
  "resourceType": "Patient"
}
```

**UI Display (via formatRuleReviewMessage):**
```
ℹ️ This rule targets an internal FHIR element that is rarely present in instances. 
   The rule will still execute when the element exists at runtime.
```

**UI Behavior:**
- Issue is visually de-emphasized (gray background instead of blue)
- Collapsed by default if in long list (via `shouldCollapseByDefault()`)
- No path shown in message (reduces visual noise)

**Improvement:**
- Explains this is a valid but uncommon schema element
- Doesn't alarm user with path not found
- Provides education about FHIR internals
- Lower visual priority in UI

---

## Example 4: Patient.name (Array Without Index)

### Before Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-004",
  "type": "ARRAY_HANDLING_MISSING",
  "severity": "info",
  "message": "Path \"Patient.name\" targets an array without explicit indexing",
  "details": "Rule will apply to all array elements. This may be intentional, but consider if you need to target a specific index."
}
```

**UI Display:**
```
ℹ️ Path "Patient.name" targets an array without explicit indexing
```

### After Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-004",
  "type": "ARRAY_HANDLING_MISSING",
  "severity": "warning",
  "message": "Path \"Patient.name\" targets an array without explicit indexing",
  "details": "Rule will apply to all array elements. This may be intentional, but consider if you need to target a specific index.",
  "reason": "ARRAY_WITHOUT_INDEX",
  "path": "Patient.name"
}
```

**UI Display (via formatRuleReviewMessage):**
```
⚠️ This rule targets an array element without explicit indexing. 
   Consider specifying how the array should be evaluated 
   (e.g., using [0] for first element or omit index to apply to all).
```

**UI Behavior:**
- Amber/warning styling (changed from info to warning severity)
- More prominent than other info issues

**Improvement:**
- Provides concrete example: `[0]` for first element
- Explains both options: indexed or apply to all
- Elevated severity to warning (more actionable)

---

## Example 5: Observation Resource Not in Bundle

### Before Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-005",
  "type": "RESOURCE_NOT_PRESENT",
  "severity": "info",
  "message": "Resource type \"Observation\" not present in current bundle",
  "details": "Rule will not apply to this bundle but may apply to others."
}
```

**UI Display:**
```
ℹ️ Resource type "Observation" not present in current bundle
```

### After Refactoring

**Backend Output:**
```json
{
  "ruleId": "rule-005",
  "type": "PATH_NOT_OBSERVED",
  "severity": "info",
  "message": "Path \"Observation.status\" not found in current bundle",
  "details": "This may be expected if the path is conditional or optional. Rule will still execute at runtime.",
  "reason": "RESOURCE_NOT_PRESENT",
  "path": "Observation.status",
  "resourceType": "Observation"
}
```

**UI Display (via formatRuleReviewMessage):**
```
ℹ️ The resource 'Observation' is not present in the current bundle. 
   This rule will apply when the resource exists at runtime.
```

**Improvement:**
- Reassures that rule is valid for runtime
- Clear that absence is about *this* bundle, not the rule itself
- Professional, non-alarming tone

---

## Summary of Improvements

### Separation of Concerns
- **Backend**: Determines FACTS via `reason` codes
- **Frontend**: Determines WORDING via `formatRuleReviewMessage()`

### Benefits

1. **Clarity**: Users get context-appropriate messages
2. **Education**: Messages explain FHIR concepts (conditional paths, schema artifacts)
3. **Reassurance**: Emphasizes rules are still valid at runtime
4. **Actionability**: Provides concrete suggestions (array indexing examples)
5. **Maintainability**: Change UI copy without touching backend logic
6. **Internationalization**: Easy to add translations in future
7. **Visual Hierarchy**: Internal schema issues de-emphasized automatically

### No Behavior Changes
- ✅ Still advisory-only (no blocking)
- ✅ Still info/warning severity only (no errors)
- ✅ Rules still execute normally
- ✅ No impact on validation flow

---

## Technical Implementation

### Backend Reason Detection
```typescript
// ruleReviewEngine.ts
if (isInternalSchemaPath(fullPath)) {
  reason = 'INTERNAL_SCHEMA_PATH';
} else if (!bundleResourceTypes.has(resourceType)) {
  reason = 'RESOURCE_NOT_PRESENT';
} else if (isConditionalPath(fullPath)) {
  reason = 'CONDITIONAL_PATH';
}
```

### Frontend Message Formatting
```typescript
// ruleReviewFormatting.ts
export function formatRuleReviewMessage(issue: RuleReviewIssue): string {
  switch (issue.reason) {
    case 'NOT_PRESENT_IN_SAMPLE':
      return `Path '${path}' was not observed in the current bundle...`;
    case 'INTERNAL_SCHEMA_PATH':
      return `This rule targets an internal FHIR element...`;
    // etc.
  }
}
```

### UI Integration
```tsx
// Never display raw backend message
<p>{formatRuleReviewMessage(issue)}</p>

// Visual de-emphasis for internal paths
className={shouldCollapseByDefault(issue) ? 'opacity-75' : ''}
```

---

**Result**: Clear separation between WHAT happened (backend) and HOW to explain it (frontend).
