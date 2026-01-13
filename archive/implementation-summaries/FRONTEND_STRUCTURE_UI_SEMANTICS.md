# Frontend STRUCTURE Validation UI Semantics

**Date:** 3 January 2026  
**Status:** ✅ Locked — Frontend correctly implements STRUCTURE semantics  
**Related:** `/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md` (backend specification)

---

## Executive Summary

The frontend correctly treats **STRUCTURE** errors as **blocking** and visually distinguishes them from **advisory SPEC_HINT** findings.

**Key Contract:**
- ✅ STRUCTURE → **Red / Must Fix / Blocking**
- ✅ SPEC_HINT → **Amber / Advisory / Non-blocking**
- ✅ Clear visual distinction
- ✅ Test coverage prevents regression

---

## 1. STRUCTURE vs SPEC_HINT Semantic Contract

### Backend Contract (from `/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md`)

| Source | Meaning | Blocking | Example |
|--------|---------|----------|---------|
| **STRUCTURE** | Invalid FHIR grammar | ✅ YES | Missing required field, invalid enum value |
| **SPEC_HINT** | Advisory recommendation | ❌ NO | Optional best practices, HL7 guidance |

### Frontend Implementation

**Correctly Implements:**
- ✅ STRUCTURE errors counted in `blocking` counter
- ✅ STRUCTURE shown with red error styling
- ✅ STRUCTURE labeled "Must fix"
- ✅ SPEC_HINT excluded from `blocking` counter
- ✅ SPEC_HINT shown with amber/blue advisory styling
- ✅ SPEC_HINT labeled "Recommended"

---

## 2. Implementation Locations

### Core Logic: `validationSeverityMapper.ts`

**Blocking Sources:**
```typescript
const BLOCKING_SOURCES = new Set([
  'STRUCTURE',  // ← Phase 1 STRUCTURE validation
  'FHIR',
  'Firely',
  'Business',
  'CodeMaster',
  'Reference'
]);
```

**Advisory Sources:**
```typescript
const ADVISORY_SOURCES = new Set([
  'LINT',
  'SPEC_HINT',   // ← Never blocking
  'HL7_SPEC_HINT',
  'HL7Advisory'
]);
```

**Mapping Function:**
```typescript
export function mapFindingToUiPresentation(finding: ValidationFinding): UiPresentation {
  // STRUCTURE → Red blocking error
  if (BLOCKING_SOURCES.has(finding.source)) {
    return {
      icon: 'error',
      color: 'red',
      label: 'Blocking Issue',
      isBlocking: true,
      displaySeverity: 'error'
    };
  }
  
  // SPEC_HINT → Amber/blue advisory
  if (ADVISORY_SOURCES.has(finding.source)) {
    return {
      icon: 'warning',
      color: 'amber',
      label: 'Quality Finding',
      isBlocking: false,
      displaySeverity: 'warning'
    };
  }
}
```

### Layer Metadata: `validationLayers.ts`

**STRUCTURE:**
```typescript
case 'STRUCTURE':
  return {
    displayName: 'FHIR Structure (Pre-Parse)',
    fullName: 'FHIR Structural Validation - Pre-Parse',
    isBlocking: true,  // ← Mandatory
    explanation: 'Must be resolved to produce valid HL7 FHIR',
    badgeColor: 'bg-red-100 text-red-800 border-red-300',  // ← Red
    borderColor: 'border-l-red-500',
  };
```

**SPEC_HINT (HL7 Advisory):**
```typescript
case 'SPEC_HINT':
case 'HL7_SPEC_HINT':
case 'HL7Advisory':
  return {
    displayName: 'HL7 Advisory',
    fullName: 'HL7 Specification Advisory',
    isBlocking: false,  // ← Advisory only
    explanation: 'Recommended improvement; does not invalidate FHIR',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',  // ← Blue
    borderColor: 'border-l-blue-400',
  };
```

### UI Component: `ValidationLayerInfo.tsx`

**Explanation Box (NEW - added in this deliverable):**
```tsx
{/* Phase 1 STRUCTURE vs SPEC_HINT explanation */}
<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
  <p className="text-xs text-gray-700 leading-relaxed mb-2">
    <span className="font-semibold">STRUCTURE</span> errors prevent 
    HL7 FHIR compliance and <span className="font-semibold text-red-700">
    must be fixed</span>.
  </p>
  <p className="text-xs text-gray-700 leading-relaxed">
    <span className="font-semibold">SPEC_HINT</span> findings are 
    <span className="font-semibold text-blue-700">advisory recommendations</span> 
    that do not block validation.
  </p>
</div>
```

**FHIR Structure Layer:**
```tsx
<div className="border-l-2 border-red-500 pl-3">
  <div className="flex items-center justify-between mb-1">
    <ValidationIcon source="STRUCTURE" severity="error" />
    <span className="font-semibold text-gray-900">FHIR Structure</span>
    <div className="flex items-center gap-1 text-red-700">
      <XCircle className="w-3 h-3" />
      <span className="text-xs font-semibold">Must fix</span>  {/* ← Blocking */}
    </div>
  </div>
  <p className="text-gray-600 leading-relaxed">
    Must be fixed to produce valid HL7 FHIR. Violates the HL7 FHIR specification.
  </p>
</div>
```

**Documentation Link (NEW - added in this deliverable):**
```tsx
<p className="text-xs text-blue-600 leading-relaxed mt-2">
  <a 
    href="/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md" 
    target="_blank" 
    rel="noopener noreferrer"
    className="underline hover:text-blue-800"
  >
    Learn more about STRUCTURE validation →
  </a>
</p>
```

---

## 3. Test Coverage

### Test Suite: `validationSeverityMapper.test.ts` (NEW - 18 tests)

**STRUCTURE Blocking Tests:**
```typescript
it('maps STRUCTURE errors to red blocking presentation', () => {
  const finding = createFinding('STRUCTURE', 'error');
  const result = mapFindingToUiPresentation(finding);

  expect(result.isBlocking).toBe(true);
  expect(result.color).toBe('red');
  expect(result.icon).toBe('error');
});

it('identifies STRUCTURE as blocking', () => {
  expect(isBlockingError(createFinding('STRUCTURE'))).toBe(true);
});

it('filters to include only STRUCTURE and other blocking errors', () => {
  const findings = [
    createFinding('STRUCTURE'),
    createFinding('FHIR'),
    createFinding('LINT'),
    createFinding('SPEC_HINT'),
  ];

  const blocking = filterBlockingErrors(findings);
  expect(blocking).toHaveLength(2);
  expect(blocking.map(f => f.source)).toEqual(['STRUCTURE', 'FHIR']);
});
```

**STRUCTURE vs SPEC_HINT Distinction Tests:**
```typescript
it('STRUCTURE errors are always blocking (must fix)', () => {
  const structureError = createFinding('STRUCTURE', 'error');
  const presentation = mapFindingToUiPresentation(structureError);

  expect(presentation.isBlocking).toBe(true);
  expect(presentation.label).toContain('Blocking');
});

it('SPEC_HINT findings are never blocking (advisory)', () => {
  const specHint = createFinding('SPEC_HINT', 'error');
  const presentation = mapFindingToUiPresentation(specHint);

  expect(presentation.isBlocking).toBe(false);
  expect(presentation.displaySeverity).not.toBe('error');
});

it('STRUCTURE and SPEC_HINT are visually distinct', () => {
  const structure = mapFindingToUiPresentation(createFinding('STRUCTURE'));
  const specHint = mapFindingToUiPresentation(createFinding('SPEC_HINT'));

  // STRUCTURE is red (blocking), SPEC_HINT is amber (advisory)
  expect(structure.color).toBe('red');
  expect(specHint.color).toBe('amber');

  // STRUCTURE uses error icon, SPEC_HINT uses warning icon
  expect(structure.icon).toBe('error');
  expect(specHint.icon).toBe('warning');
});
```

**Result:** ✅ All 18 tests passing

### Test Suite: `validationUICounters.test.ts` (EXTENDED - 1 new test)

**STRUCTURE Blocking Counter Test:**
```typescript
it('identifies STRUCTURE errors as blocking', () => {
  expect(isBlockingError(createError('STRUCTURE'))).toBe(true);
});
```

**Result:** ✅ Test passing (inserted between existing blocking tests)

### Test Suite: `ValidationLayerInfo.test.tsx` (NEW - 11 tests)

**STRUCTURE Semantic Tests:**
```typescript
it('renders STRUCTURE as blocking/must-fix', () => {
  const { container } = render(<ValidationLayerInfo />);
  const html = container.innerHTML;

  expect(html).toContain('FHIR Structure');
  expect(html).toContain('Must fix');
  expect(html).toContain('border-red-500');
});

it('includes STRUCTURE vs SPEC_HINT distinction', () => {
  const { container } = render(<ValidationLayerInfo />);
  const html = container.innerHTML;

  expect(html).toContain('STRUCTURE');
  expect(html).toContain('must be fixed');
  expect(html).toContain('advisory recommendations');
  expect(html).toContain('do not block validation');
});

it('includes link to STRUCTURE validation documentation', () => {
  const { container } = render(<ValidationLayerInfo />);
  const html = container.innerHTML;

  expect(html).toContain('/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md');
  expect(html).toContain('Learn more about STRUCTURE validation');
});
```

**Regression Prevention Tests:**
```typescript
it('ensures STRUCTURE is never labeled as optional', () => {
  const { container } = render(<ValidationLayerInfo />);
  const html = container.innerHTML;

  const structureSection = html.split('FHIR Structure')[1]?.split('HL7 Spec')[0] || '';
  
  expect(structureSection).not.toContain('optional');
  expect(structureSection).not.toContain('advisory');
  expect(structureSection).not.toContain('quality');
});

it('ensures STRUCTURE always has blocking indicators', () => {
  const { container } = render(<ValidationLayerInfo />);
  const html = container.innerHTML;

  const structureSection = html.split('FHIR Structure')[1]?.split('HL7 Spec')[0] || '';
  
  const hasBlockingTerm = 
    structureSection.includes('Must fix') ||
    structureSection.includes('must be fixed') ||
    structureSection.includes('blocking');
  
  expect(hasBlockingTerm).toBe(true);
});

it('snapshot: full component rendering', () => {
  const { container } = render(<ValidationLayerInfo />);
  expect(container).toMatchSnapshot();
});
```

**Result:** ✅ All 11 tests passing (includes snapshot baseline)

---

## 4. Visual Hierarchy

### Color Coding

| Source | Color | Icon | Label | Blocking |
|--------|-------|------|-------|----------|
| **STRUCTURE** | 🔴 Red (`border-red-500`) | ❌ Error | "Must fix" | ✅ YES |
| **FHIR/Firely** | 🔴 Red | ❌ Error | "Must fix" | ✅ YES |
| **Business** | 🟣 Purple | ⚠️ Error | "Must fix" | ✅ YES |
| **CodeMaster** | 🔴 Red | ❌ Error | "Must fix" | ✅ YES |
| **Reference** | 🔴 Red | ❌ Error | "Must fix" | ✅ YES |
| **LINT** | 🟡 Amber (`border-amber-400`) | ⚠️ Warning | "Recommended" | ❌ NO |
| **SPEC_HINT** | 🔵 Blue (`border-blue-400`) | ℹ️ Info | "Recommended" | ❌ NO |

### Status Messages

**When blocking errors present:**
```
❌ Validation Failed
3 blocking issue(s) must be fixed before the bundle is valid.
```

**When only advisory findings:**
```
✅ Validation Passed with Warnings
2 quality finding(s) detected. Review recommended.
```

**When no issues:**
```
✅ HL7-Compliant
No validation issues detected.
```

---

## 5. Deliverable 3 Changes Summary

### Changes Made

1. **Added STRUCTURE vs SPEC_HINT explanation box** to `ValidationLayerInfo.tsx`
   - Clear distinction between mandatory and advisory
   - Prominent placement at top of tooltip
   - Blue info box styling

2. **Added documentation link** to `ValidationLayerInfo.tsx`
   - Links to `/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md`
   - Opens in new tab
   - Clear call-to-action text

3. **Created test suite** `validationSeverityMapper.test.ts`
   - 18 comprehensive tests
   - Verifies STRUCTURE → red blocking
   - Verifies SPEC_HINT → amber advisory
   - Tests visual distinction

4. **Extended test suite** `validationUICounters.test.ts`
   - Added STRUCTURE blocking test
   - Maintains consistency with other blocking sources

5. **Created test suite** `ValidationLayerInfo.test.tsx`
   - 11 comprehensive tests
   - Snapshot test prevents UI regression
   - Regression prevention tests
   - Verifies explanation box content

### Test Results

```
✅ validationSeverityMapper.test.ts: 18/18 passing
✅ validationUICounters.test.ts: STRUCTURE test passing
✅ ValidationLayerInfo.test.tsx: 11/11 passing
✅ Snapshot baseline created
```

---

## 6. Compliance Verification

### ✅ Requirement: STRUCTURE always shown as "Must Fix" / Red / Blocking

**Evidence:**
- `validationSeverityMapper.ts` → `BLOCKING_SOURCES` includes `'STRUCTURE'`
- `validationLayers.ts` → `isBlocking: true` for STRUCTURE
- `ValidationLayerInfo.tsx` → "Must fix" label with red styling
- Tests enforce red color (`border-red-500`) and "Must fix" label

### ✅ Requirement: No STRUCTURE error labeled as advisory/quality/optional

**Evidence:**
- `BLOCKING_SOURCES` is distinct from `ADVISORY_SOURCES`
- STRUCTURE never mapped to amber/blue advisory styling
- Regression test: `ensures STRUCTURE is never labeled as optional`
- Regression test: `ensures STRUCTURE always has blocking indicators`

### ✅ Requirement: Validation overview includes STRUCTURE vs SPEC_HINT explanation

**Evidence:**
- `ValidationLayerInfo.tsx` explanation box:
  - "STRUCTURE errors prevent HL7 FHIR compliance and must be fixed"
  - "SPEC_HINT findings are advisory recommendations that do not block validation"
- Test verifies explanation text present

### ✅ Requirement: Link to STRUCTURE Coverage page

**Evidence:**
- `ValidationLayerInfo.tsx` includes link:
  - `/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md`
  - "Learn more about STRUCTURE validation →"
- Test verifies link present

### ✅ Requirement: Snapshot tests prevent UI regression

**Evidence:**
- `ValidationLayerInfo.test.tsx` includes snapshot test
- Snapshot baseline created
- Any UI changes will fail tests

---

## 7. Developer Guidelines

### When Adding New Validation Sources

**Blocking Source:**
```typescript
// 1. Add to BLOCKING_SOURCES in validationSeverityMapper.ts
const BLOCKING_SOURCES = new Set([
  'STRUCTURE',
  'FHIR',
  'NEW_BLOCKING_SOURCE',  // ← Add here
]);

// 2. Add case to validationLayers.ts
case 'NEW_BLOCKING_SOURCE':
  return {
    displayName: 'New Source',
    isBlocking: true,  // ← Must be true
    badgeColor: 'bg-red-100 text-red-800',  // ← Red for blocking
  };

// 3. Add test to validationSeverityMapper.test.ts
it('identifies NEW_BLOCKING_SOURCE as blocking', () => {
  expect(isBlockingError(createFinding('NEW_BLOCKING_SOURCE'))).toBe(true);
});
```

**Advisory Source:**
```typescript
// 1. Add to ADVISORY_SOURCES in validationSeverityMapper.ts
const ADVISORY_SOURCES = new Set([
  'LINT',
  'SPEC_HINT',
  'NEW_ADVISORY_SOURCE',  // ← Add here
]);

// 2. Add case to validationLayers.ts
case 'NEW_ADVISORY_SOURCE':
  return {
    displayName: 'New Advisory',
    isBlocking: false,  // ← Must be false
    badgeColor: 'bg-amber-100 text-amber-800',  // ← Amber/blue for advisory
  };

// 3. Add test to validationSeverityMapper.test.ts
it('identifies NEW_ADVISORY_SOURCE as non-blocking', () => {
  expect(isBlockingError(createFinding('NEW_ADVISORY_SOURCE'))).toBe(false);
});
```

### NEVER Do This

❌ **Don't make STRUCTURE advisory:**
```typescript
// WRONG - violates contract
case 'STRUCTURE':
  return {
    isBlocking: false,  // ❌ STRUCTURE must always be blocking
  };
```

❌ **Don't use advisory colors for STRUCTURE:**
```typescript
// WRONG - confuses users
case 'STRUCTURE':
  return {
    badgeColor: 'bg-amber-100',  // ❌ Must be red
    borderColor: 'border-blue-400',  // ❌ Must be red
  };
```

❌ **Don't label STRUCTURE as "Recommended":**
```typescript
// WRONG - misleading terminology
<span>Recommended</span>  // ❌ Use "Must fix" for STRUCTURE
```

---

## 8. Maintenance

### When Backend Changes STRUCTURE Implementation

1. ✅ **No frontend changes needed** if:
   - Backend still emits `source: "STRUCTURE"`
   - Backend still emits `severity: "error"`
   - New error codes added (frontend is code-agnostic)

2. ⚠️ **Frontend changes needed** if:
   - Backend changes source name (update `BLOCKING_SOURCES`)
   - Backend adds new blocking sources (add to `BLOCKING_SOURCES`)
   - Backend deprecates STRUCTURE (coordinate migration)

### Regular Verification

**Monthly:**
- Run full test suite: `npm test`
- Verify snapshot still valid
- Check for new validation sources in backend

**Per Release:**
- Review `STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md` for backend changes
- Verify UI matches backend contract
- Update tests if backend adds new rules

**On Backend Changes:**
- Check if new error codes need frontend message mapping
- Verify blocking status of new sources
- Update tests for new validation sources

---

## 9. Related Documentation

- **Backend Specification:** `/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md`
- **Backend Guardrails:** `/docs/STRUCTURE_VALIDATION_GUARDRAILS.md`
- **Frontend Semantics Audit:** `/FRONTEND_VALIDATION_SEMANTICS_AUDIT.md`
- **Error Message Mapping:** `/frontend/src/constants/errorMessages.ts`

---

## 10. Conclusion

✅ **Frontend STRUCTURE semantics are correctly implemented and tested.**

**Key Achievements:**
- STRUCTURE always treated as blocking (red, "Must fix")
- SPEC_HINT always treated as advisory (amber/blue, "Recommended")
- Clear visual distinction prevents user confusion
- Comprehensive test coverage prevents regression
- Documentation link provides learning path
- Snapshot test locks UI semantics

**No further frontend changes needed for STRUCTURE validation.**

---

**Status:** ✅ **COMPLETE** — Frontend correctly implements Phase 1 STRUCTURE contract.
