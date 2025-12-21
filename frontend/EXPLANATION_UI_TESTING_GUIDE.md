# Explanation UI Testing Guide

## Quick Test Scenarios

### Test 1: High Confidence Required Rule

**Setup**: Create a Required rule for `Patient.gender`

**Expected Backend Response**:
```json
{
  "source": "PROJECT",
  "severity": "error",
  "message": "Required field missing: Patient.gender",
  "path": "Patient.gender",
  "explanation": {
    "what": "This rule requires the field `Patient.gender` to be present.",
    "how": "The field `Patient.gender` is missing or empty in this resource.\nAdd a value to satisfy the requirement.",
    "confidence": "high"
  }
}
```

**UI Verification**:
- ✅ Badge shows: 🛡️ "High confidence" (green)
- ✅ "What" section displays backend text exactly
- ✅ "How to fix" section shows multiline text:
  ```
  The field `Patient.gender` is missing or empty in this resource.
  Add a value to satisfy the requirement.
  ```
- ✅ Default state: Expanded (PROJECT source)

---

### Test 2: High Confidence FixedValue Rule

**Setup**: Create FixedValue rule for `Patient.gender` = "male"

**Expected Backend Response**:
```json
{
  "explanation": {
    "what": "This rule enforces a fixed value for `Patient.gender` to ensure consistent data.",
    "how": "Expected value: male\nActual value: female\nUpdate the field to match the expected value.",
    "confidence": "high"
  }
}
```

**UI Verification**:
- ✅ Badge shows: 🛡️ "High confidence" (green)
- ✅ "How to fix" shows formatted metadata:
  ```
  Expected value: male
  Actual value: female
  Update the field to match the expected value.
  ```

---

### Test 3: Medium Confidence CodeSystem Rule

**Setup**: Create CodeSystem rule for `Patient.maritalStatus`

**Expected Backend Response**:
```json
{
  "explanation": {
    "what": "This rule ensures `Patient.maritalStatus.coding` uses codes from the correct code system.",
    "how": "Expected code system: http://terminology.hl7.org/CodeSystem/v3-MaritalStatus\nVerify that `coding.system` and `coding.code` are valid.",
    "confidence": "medium"
  }
}
```

**UI Verification**:
- ✅ Badge shows: ⚠️ "Medium confidence" (yellow)
- ✅ "How to fix" shows code system URL
- ✅ No extra disclaimers (badge is sufficient)

---

### Test 4: Low Confidence CustomFHIRPath Rule

**Setup**: Create CustomFHIRPath rule with complex condition

**Expected Backend Response**:
```json
{
  "explanation": {
    "what": "This rule validates a project-specific condition involving `Patient.contact`.",
    "how": "The condition defined for this rule is not satisfied.\nReview the related data and ensure the condition is met.",
    "confidence": "low"
  }
}
```

**UI Verification**:
- ✅ Badge shows: ⚠️ "Low confidence — review recommended" (gray)
- ✅ "How to fix" section still rendered (backend provided it)
- ✅ No extra disclaimer text

---

### Test 5: LINT Issue (Low Confidence, No "How")

**Expected Backend Response**:
```json
{
  "source": "LINT",
  "explanation": {
    "what": "This is a best-effort quality check to improve portability and correctness.",
    "confidence": "low"
  }
}
```

**UI Verification**:
- ✅ Badge shows: ⚠️ "Low confidence — review recommended" (gray)
- ✅ "What" section displays text
- ✅ No "How to fix" section (backend didn't provide it)
- ✅ Default state: Collapsed (LINT source)

---

### Test 6: FHIR Structural (High Confidence, No "How")

**Expected Backend Response**:
```json
{
  "source": "FHIR",
  "explanation": {
    "what": "This issue was detected during FHIR structural validation.",
    "confidence": "high"
  }
}
```

**UI Verification**:
- ✅ Badge shows: 🛡️ "High confidence" (green)
- ✅ "What" section displays text
- ✅ No "How to fix" section (backend didn't provide it)
- ✅ Default state: Expanded (FHIR source)

---

### Test 7: Missing Explanation (Backward Compatibility)

**Expected Backend Response**:
```json
{
  "source": "FHIR",
  "severity": "error",
  "message": "Element 'Patient.gender' has a minimum cardinality of 1",
  "path": "Patient.gender"
}
```

**UI Verification**:
- ✅ No explanation section rendered
- ✅ Error message displayed normally
- ✅ No console errors or warnings

---

## Manual Testing Checklist

### Visual Checks

- [ ] **Badge Positioning**: Right-aligned in header
- [ ] **Badge Colors**:
  - [ ] High = Green (`bg-green-100`, `text-green-800`)
  - [ ] Medium = Yellow (`bg-yellow-100`, `text-yellow-800`)
  - [ ] Low = Gray (`bg-gray-100`, `text-gray-700`)
- [ ] **Icons Render Correctly**:
  - [ ] InformationCircleIcon (blue, 16px)
  - [ ] WrenchScrewdriverIcon (green, 16px)
  - [ ] ShieldCheckIcon (green, 12px in badge)
  - [ ] ExclamationTriangleIcon (yellow/gray, 12px in badge)
- [ ] **Section Backgrounds**:
  - [ ] "What" = Blue-tinted (`bg-blue-50/50`)
  - [ ] "How" = Green-tinted (`bg-green-50/50`)
- [ ] **Multiline Text**: Line breaks preserved in "How to fix"

### Interaction Checks

- [ ] **Click Header**: Expands/collapses explanation
- [ ] **Event Propagation**: Clicking explanation doesn't trigger parent navigation
- [ ] **Default States**:
  - [ ] FHIR, Business, Reference → Expanded
  - [ ] LINT, SpecHint → Collapsed
- [ ] **Chevron Indicator**: Changes between ▶ (collapsed) and ▼ (expanded)

### Confidence Badge Checks

- [ ] **High Confidence**: Green with ShieldCheckIcon
- [ ] **Medium Confidence**: Yellow with ExclamationTriangleIcon
- [ ] **Low Confidence**: Gray with ExclamationTriangleIcon + "— review recommended"
- [ ] **Badge Always Visible**: Even when explanation is collapsed

### "How to Fix" Logic

- [ ] **Always Shown**: If backend provides `explanation.how`
- [ ] **Never Shown**: If backend omits `explanation.how`
- [ ] **No Filtering**: Low-confidence "how" still displayed (if backend provides it)

---

## Component-Specific Tests

### ValidationErrorItem.tsx
**Test Sources**: FHIR, Business, CodeMaster, Reference

- [ ] Confidence badge in header
- [ ] Heroicons render correctly
- [ ] `whitespace-pre-line` preserves backend formatting
- [ ] No "Low confidence disclaimer" text (badge is sufficient)

### LintIssueCard.tsx
**Test Source**: LINT

- [ ] No frontend-generated explanation text
- [ ] Only renders backend `explanation.what` and `explanation.how`
- [ ] Confidence badge in header
- [ ] Amber border (`border-l-amber-400`)

### IssueCard.tsx
**Test Sources**: All sources (ungrouped issues)

- [ ] Confidence badge in header
- [ ] No ShieldAlert icon (replaced by badge)
- [ ] Legacy explanation still supported (if new explanation missing)

---

## Regression Tests

### Ensure No Breaking Changes

- [ ] **Error Navigation**: Clicking issue still navigates to path
- [ ] **Path Breadcrumbs**: Still render correctly
- [ ] **Source Badges**: Still show correct colors
- [ ] **Severity Icons**: Still render (AlertCircle, AlertTriangle, Info)
- [ ] **Details Expansion**: Technical details still collapsible
- [ ] **Advisory Notices**: LINT/SpecHint notices still show

---

## Edge Cases

### 1. Very Long "What" Text
```json
{
  "what": "This rule requires that all instances of Patient.contact[*].relationship must be present and must contain valid codes from the ValueSet 'http://hl7.org/fhir/ValueSet/patient-contactrelationship' which is bound extensible to ensure proper semantic interoperability across systems."
}
```

**Verify**: Text wraps correctly, padding maintained

### 2. Very Long "How" Text with Multiple Lines
```json
{
  "how": "Step 1: Check Patient.contact array\nStep 2: For each contact, verify relationship field exists\nStep 3: Validate relationship.coding.system matches expected ValueSet\nStep 4: Ensure relationship.coding.code is from allowed values\nStep 5: Update invalid codes to match requirements"
}
```

**Verify**: All lines preserved, readable formatting

### 3. Special Characters in Metadata
```json
{
  "how": "Expected value: \"male\" | \"female\" | \"other\"\nActual value: <empty>\nUpdate field: Patient.gender"
}
```

**Verify**: Special characters rendered correctly (quotes, pipes, brackets)

### 4. Unicode in Explanation
```json
{
  "what": "This rule ensures Patient.name[0].given contains at least one value ⚠️"
}
```

**Verify**: Unicode characters display correctly

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Performance Checks

- [ ] **No Lag**: Opening/closing explanations is instant
- [ ] **No Re-renders**: Confidence badge doesn't cause unnecessary re-renders
- [ ] **Memory**: No memory leaks when expanding/collapsing repeatedly

---

## Accessibility Checks

- [ ] **Keyboard Navigation**: Tab to explanation header, Enter to expand
- [ ] **Screen Reader**: Confidence badge text is announced
- [ ] **Color Contrast**: All text meets WCAG AA (4.5:1 for normal text)
- [ ] **Focus Indicators**: Visible focus outline on header button

---

## Integration Test

**Full Validation Flow**:
1. Create project with multiple rule types
2. Validate bundle with errors from all sources
3. Verify all explanations render correctly
4. Check confidence badges match rule types
5. Confirm "How to fix" shows only when backend provides it

---

**Status**: Ready for testing
**Last Updated**: 2024-12-21
**Related**: EXPLANATION_UI_REFACTOR.md, EXPLANATION_UI_VISUAL_REFERENCE.md
