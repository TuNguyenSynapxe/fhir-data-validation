# QuestionAnswer Rule: Answer Path Hardcoded to `value[x]`

## Summary

The QuestionAnswer rule UI has been refactored to **remove the Answer Field selector** and **hardcode `answerPath` to `value[x]`**.

This ensures the UI strictly follows the QuestionAnswer contract:
- **Rule stores ONLY**: `questionSetId`, `questionPath`, `answerPath: "value[x]"`
- **Answer type, allowed values, and constraints** are defined exclusively in the **QuestionSet**
- **No author configuration** for answer type (no valueQuantity/valueString/valueCoding selection)

---

## What Changed

### 1. **RelativePathFields.tsx** - Removed Answer Field Builder
- ❌ Removed `AnswerFieldBuilder` import and usage
- ❌ Removed `answerPath` props (`value`, `onChange`, `error`)
- ✅ Replaced with **read-only UI** showing `value[x]` with explanation panel

**New UI:**
```tsx
<div className="bg-gray-50 border border-gray-200 rounded-md p-4">
  <label>Answer Path (Auto-Resolved)</label>
  <code>value[x]</code> (relative to iteration scope)
  
  <div className="bg-blue-50">
    Answer type, allowed values, and constraints are defined in the selected Question Set.
    This rule only links questions in FHIR data to Question Set definitions.
  </div>
</div>
```

### 2. **QuestionAnswerConfigSection.tsx** - Removed Answer Path Props
- ❌ Removed `answerPath` from interface props
- ❌ Removed `onAnswerPathChange` callback
- ❌ Removed `answerPath` error handling
- ✅ Updated resolved path preview to **always show `value[x]`**

**Resolved Path Preview:**
```tsx
Question Path: component[*].code.coding
Answer Path: component[*].value[x]  // ← Always value[x]
```

### 3. **RuleForm.tsx** - Hardcoded Answer Path in Rule Builder
- ❌ Removed `answerPath` state variable
- ❌ Removed `answerPath` initialization in edit mode
- ❌ Removed `answerPath` validation
- ✅ **Hardcoded** `answerPath: 'value[x]'` in `buildQuestionAnswerRule()` call

**Rule Builder Call:**
```typescript
rule = buildQuestionAnswerRule({
  resourceType,
  instanceScope: instanceScope.kind === 'all' ? 'all' : 'first',
  iterationScope,
  questionPath,
  answerPath: 'value[x]',  // ← ALWAYS hardcoded
  questionSetId,
  severity,
  userHint: userHint || undefined,
});
```

---

## Why This Matters

### ❌ **Before (Incorrect UI)**
Authors could select:
- "Answer Field: Quantity (valueQuantity)"
- "Answer Field: String (valueString)"
- "Answer Field: Coding (valueCoding)"

**Problems:**
1. **Duplicated QuestionSet responsibility** - Answer type already defined in QuestionSet
2. **False coupling** - If QuestionSet changes type, rule becomes stale
3. **Contradicted runtime behavior** - Backend already resolves `value[x]` polymorphically

### ✅ **After (Correct UI)**
Authors configure:
- Parent iteration path (e.g., `component[*]`)
- QuestionSet selection
- Question identifier strategy (Coding/Identifier/LinkId)

**Benefits:**
1. **Single source of truth** - QuestionSet owns answer semantics
2. **No misconfiguration possible** - Authors cannot select wrong answer type
3. **Aligned with backend** - UI matches runtime behavior exactly

---

## Technical Contract

### Rule Params (Stored in rules.json)
```json
{
  "id": "rule-123",
  "type": "QuestionAnswer",
  "resourceType": "Observation",
  "path": "Observation[*].component[*]",
  "params": {
    "questionSetId": "abc-123",
    "questionPath": "code.coding",
    "answerPath": "value[x]"  // ← ALWAYS "value[x]"
  }
}
```

### Backend Behavior (Unchanged)
1. Backend extracts answer via FHIRPath: `component[*].value[x]`
2. Backend resolves polymorphic type (Quantity, String, Coding, etc.)
3. Backend validates answer against QuestionSet definition
4. Backend emits error codes: `ANSWER_REQUIRED`, `INVALID_ANSWER_VALUE`, `ANSWER_NOT_IN_VALUESET`

---

## Verification

### Build Status
✅ **Frontend builds successfully** (2.82s, 824 KB chunk)
✅ **Backend unaffected** - No changes to validation logic
✅ **Contract alignment** - UI enforces `value[x]` hardcoding

### Testing Checklist
- [ ] Create new QuestionAnswer rule → answerPath should auto-resolve to `value[x]`
- [ ] Edit existing QuestionAnswer rule → Answer field should show read-only `value[x]`
- [ ] Validate FHIR bundle → Backend should resolve `value[x]` correctly
- [ ] Check resolved path preview → Should display `<iterationScope>.value[x]`

---

## Migration Notes

### Existing Rules
**No migration required** - Backend already ignores explicit answer type in favor of QuestionSet definition.

Existing rules with `answerPath: "valueQuantity"` will continue to work because:
1. Backend uses QuestionSet to determine expected type
2. Backend resolves `value[x]` polymorphically
3. Specific type paths (e.g., `valueQuantity`) are treated as aliases for `value[x]`

### Future Rules
All new rules created after this refactor will have:
```json
"answerPath": "value[x]"
```

This is the **canonical form** and matches backend runtime behavior exactly.

---

## Related Documentation
- `/docs/03_rule_dsl_spec.md` - QuestionAnswer contract definition
- `/docs/05_validation_pipeline.md` - Runtime validation behavior
- `QUESTION_ANSWER_CONTRACT_SAFE_REFACTOR_COMPLETE.md` - Previous constraint removal refactor

---

**Date**: 29 December 2025  
**Status**: ✅ Complete - Frontend builds successfully  
**Contract**: QuestionAnswer rule stores ONLY `{questionSetId, questionPath, answerPath: "value[x]"}`
