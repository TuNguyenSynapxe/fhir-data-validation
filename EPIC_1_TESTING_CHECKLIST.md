# EPIC 1: Testing Checklist

## Overview
This document provides a comprehensive testing checklist to verify the EPIC 1 implementation works correctly across all components.

---

## Test Scenarios

### 1. ✅ Tree View with Binding Icon

#### Test: AllLanguages ValueSet (External)
**Steps**:
1. Open Structure Definition with `all-languages` binding
2. Hover over 🔗 icon in tree view
3. Verify tooltip shows:
   - **Type**: "External Standard"
   - **Preview**: "Not available offline"

**Expected Result**: ✅ Neutral tone, no red error styling

---

#### Test: AdministrativeGender (Explicit)
**Steps**:
1. Open Structure Definition with `administrative-gender` binding
2. Hover over 🔗 icon in tree view
3. Verify tooltip shows:
   - **Type**: "Enumerated"
   - **Preview**: "Available offline"

**Expected Result**: ✅ Info blue styling

---

#### Test: SNOMED with Filters (Unsupported)
**Steps**:
1. Open Structure Definition with SNOMED ValueSet using filters
2. Hover over 🔗 icon in tree view
3. Verify tooltip shows:
   - **Type**: "Complex"
   - **Preview**: "Not available offline"

**Expected Result**: ✅ Warning amber styling

---

### 2. ✅ Element Details Panel - Binding Section

#### Test: External ValueSet
**Steps**:
1. Select element with External ValueSet binding
2. Check binding display in details panel
3. Verify message shows: "External Standard - References external standards..."

**Expected Result**: ✅ No generic "No codes available", educational explanation shown

---

#### Test: Unsupported ValueSet
**Steps**:
1. Select element with Unsupported ValueSet binding
2. Check binding display in details panel
3. Verify message shows: "Complex - Uses advanced FHIR logic..."

**Expected Result**: ✅ Educational explanation, not alarming

---

#### Test: Explicit ValueSet with Codes
**Steps**:
1. Select element with Explicit ValueSet binding
2. Check binding display in details panel
3. Verify first 3 codes displayed with "(+N more)"

**Expected Result**: ✅ Code preview shown inline

---

### 3. ✅ ValueSet Selection Drawer

#### Test: Search Results with Mixed Previewability
**Steps**:
1. Open ValueSet selection drawer
2. Search for ValueSets (e.g., "administrative")
3. Verify each result shows badge with label:
   - Explicit → "Enumerated" (blue)
   - Computed → "Computed" (blue)
   - External → "External Standard" (gray)
   - Unsupported → "Complex" (amber)

**Expected Result**: ✅ Consistent labeling, tone-based colors

---

#### Test: Tooltip on Badge
**Steps**:
1. Hover over previewability badge in search results
2. Verify tooltip shows full description from registry

**Expected Result**: ✅ Educational description shown

---

### 4. ✅ Empty State Component

#### Test: External ValueSet Empty State
**Steps**:
1. Click External ValueSet in drawer (e.g., `all-languages`)
2. Check preview panel (should be empty)
3. Verify empty state shows:
   - Icon: 🌐
   - Title: "External Standard"
   - Description: Registry explanation
   - Hint: Author guidance

**Expected Result**: ✅ No generic "No codes available", uses registry

---

#### Test: Unsupported ValueSet Empty State
**Steps**:
1. Click Unsupported ValueSet in drawer
2. Check preview panel (should be empty)
3. Verify empty state shows:
   - Icon: ⚠️
   - Title: "Complex"
   - Description: Registry explanation
   - Hint: Author guidance

**Expected Result**: ✅ Educational tone, not alarming

---

### 5. ✅ ValueSet Picker Component

#### Test: External ValueSet Selection
**Steps**:
1. Use ValueSet picker in a form
2. Select External ValueSet
3. Verify:
   - Type field shows "External Standard"
   - **No Preview button shown**
   - Description shows registry explanation

**Expected Result**: ✅ Preview button hidden for non-previewable ValueSets

---

#### Test: Explicit ValueSet Selection
**Steps**:
1. Use ValueSet picker in a form
2. Select Explicit ValueSet
3. Verify:
   - Type field shows "Enumerated"
   - **Preview button shown**
   - Clicking button opens preview modal with codes

**Expected Result**: ✅ Preview button available

---

### 6. ✅ Cardinality Mode

#### Test: Cardinality Mode Toggle
**Steps**:
1. Open tree view
2. Toggle "Cardinality Mode" ON
3. Verify:
   - Binding icons (🔗) hidden
   - Cardinality pills visible
   - Required elements show blue left border
   - Cardinality tooltips work (Required/Optional/Not Allowed)

**Expected Result**: ✅ Binding icons hidden, cardinality UI preserved

---

### 7. ✅ Visual Consistency

#### Test: Tone-based Styling
**Steps**:
1. Check all components with different previewability types
2. Verify tone consistency:
   - **info** (Enumerated/Computed): Blue badges
   - **neutral** (External Standard): Gray badges
   - **warning** (Complex): Amber badges

**Expected Result**: ✅ Consistent colors across all components

---

#### Test: Tree Remains Clean
**Steps**:
1. View tree in Normal mode
2. Verify:
   - Only 🔗 icon shown (no text badges)
   - Icon positioned immediately after element name (left-aligned)
   - Cardinality pill on right side
   - Required elements have blue left border

**Expected Result**: ✅ Clean, non-cluttered tree view

---

### 8. ✅ Backward Compatibility

#### Test: Legacy API Consumers
**Steps**:
1. Check API responses
2. Verify ValueSetSummary still has:
   - `previewability` field (new, authoritative)
   - `capability` field (legacy, optional)
3. Verify no API signature changes

**Expected Result**: ✅ Zero breaking changes

---

### 9. ✅ Keyboard Accessibility

#### Test: Tooltip Navigation
**Steps**:
1. Use Tab key to navigate tree
2. Focus on element with binding
3. Verify tooltip appears on focus
4. Press Escape to close

**Expected Result**: ✅ Keyboard-accessible tooltips

---

### 10. ✅ Error Cases

#### Test: Unknown ValueSet
**Steps**:
1. Select element with invalid/missing ValueSet URL
2. Check binding display
3. Verify error shows: "Unknown ValueSet" (not generic message)

**Expected Result**: ✅ Graceful error handling

---

#### Test: API Failure
**Steps**:
1. Simulate API failure (network error)
2. Check components show appropriate error message
3. Verify no crash or undefined errors

**Expected Result**: ✅ Graceful degradation

---

## Regression Testing

### ✅ Previous Features Still Work

1. **Binding strength editing** - Can change Required/Preferred/Extensible/Example
2. **ValueSet override** - Can replace base ValueSet with new one
3. **Clear override** - Can revert to base binding
4. **Tree expansion** - Expand/collapse still works
5. **Element selection** - Click to select element in details panel
6. **Search functionality** - ValueSet search still works
7. **Layer filtering** - HL7/PSS/Project layer filter works
8. **Code preview modal** - Opens with correct codes for previewable ValueSets

---

## Performance Testing

### ✅ No Performance Degradation

1. **Tree rendering** - Should be same speed as before
2. **Search** - No delay in ValueSet search
3. **Tooltip display** - Instant on hover
4. **Badge rendering** - No layout shifts

---

## Cross-Component Consistency

### ✅ Same Labels Everywhere

Verify these labels appear consistently across all components:

| Previewability | Expected Label |
|----------------|----------------|
| Explicit | "Enumerated" |
| Computed | "Computed" |
| External | "External Standard" |
| Unsupported | "Complex" |

**Check in**:
- ✅ Tree tooltip
- ✅ Details panel
- ✅ Search drawer badges
- ✅ Empty states
- ✅ Picker component

---

## Browser Compatibility

### ✅ Test in Multiple Browsers

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Verify**:
- Tooltips display correctly
- CSS styling consistent
- Icons render properly
- No console errors

---

## Acceptance Criteria Sign-off

| # | Criteria | Status | Notes |
|---|----------|--------|-------|
| 1 | No generic "No codes available" | ✅ | All replaced with registry explanations |
| 2 | External standards clearly explained | ✅ | "External Standard - References external standards..." |
| 3 | Tree visually clean | ✅ | Only 🔗 icon, no text badges |
| 4 | Required elements obvious | ✅ | Blue border + cardinality styling |
| 5 | No false preview implications | ✅ | Preview buttons hidden for External/Unsupported |
| 6 | No API breaks | ✅ | Zero backend changes |
| 7 | Consistent labeling | ✅ | Single source of truth |
| 8 | No red for External | ✅ | Neutral gray tone |

---

## Test Sign-off

**Tester**: ___________________  
**Date**: ___________________  
**Result**: ✅ PASS / ❌ FAIL  
**Notes**: _____________________

---

## Known Issues

*(None at this time)*

---

## Post-Deployment Verification

After deploying to production:

1. ✅ Test with real ValueSets from HL7 spec
2. ✅ Monitor for console errors
3. ✅ Check analytics for user confusion indicators
4. ✅ Gather user feedback on new terminology

---

## Rollback Plan

If critical issues found:

1. Revert git commit (changes are isolated)
2. No database migration needed
3. No API changes to rollback
4. Frontend-only change, safe to revert

---

## Next Testing Phase

After EPIC 1 acceptance:

- [ ] User acceptance testing with real authors
- [ ] A/B test new labels vs old labels
- [ ] Gather feedback on educational tone
- [ ] Monitor ValueSet selection patterns
