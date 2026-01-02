# 🧾 Frontend Validation Semantics Audit Report

**Date:** 2 January 2026  
**Context:** Backend returns `source: "STRUCTURE"` with `severity: "error"` for invalid FHIR, but frontend treats STRUCTURE errors as non-blocking.

---

## Executive Summary

**CRITICAL FINDING:** There is a **semantic mismatch** between backend intent and frontend interpretation.

- **Backend:** Returns `source: "STRUCTURE"` for JSON structural validation errors (enum violations, invalid primitives, cardinality errors)
- **Frontend:** Does NOT recognize "STRUCTURE" as a source and has NO logic to handle it
- **Result:** STRUCTURE errors fall through to default handling and are **MISCLASSIFIED**

**Impact:** HL7 FHIR structural errors that MUST be fixed for HL7 compliance are not visually distinguished from advisory findings.

---

## 1️⃣ Severity Handling

### Where severity is interpreted

**File:** [frontend/src/hooks/useValidationState.ts](frontend/src/hooks/useValidationState.ts#L134-L161)

```typescript
function countBlockingErrors(result: ValidationResult): number {
  return result.errors.filter(error => {
    // Only count errors (not warnings or info)
    if (error.severity?.toLowerCase() !== 'error') {
      return false;
    }
    
    // Exclude advisory sources (SPEC_HINT is non-blocking)
    if (error.source?.toUpperCase() === 'SPEC_HINT') {
      return false;
    }
    
    return true;
  }).length;
}
```

**File:** [frontend/src/hooks/useValidationState.ts](frontend/src/hooks/useValidationState.ts#L189-L213)

```typescript
function buildBreakdown(result: ValidationResult) {
  result.errors.forEach(error => {
    const source = normalizeSource(error.source);
    const isError = error.severity?.toLowerCase() === 'error';
    const isWarning = error.severity?.toLowerCase() === 'warning';
    
    // ... categorize by source
  });
}
```

### Is severity treated differently?

**YES** - Severity is checked in multiple places:

1. **Error counting** (`countBlockingErrors`): Only `severity === 'error'` counts as blocking
2. **Warning counting** (`countWarnings`): Only `severity === 'warning'` counts as warning
3. **Breakdown by source**: Errors and warnings are counted separately per source
4. **UI presentation**: Severity determines icon/color (red=error, amber=warning, blue=info)

### Is severity overridden?

**YES** - The frontend **OVERRIDES** backend severity based on SOURCE in some cases:

**File:** [frontend/src/utils/validationSeverityMapper.ts](frontend/src/utils/validationSeverityMapper.ts#L31-L86)

```typescript
const ADVISORY_SOURCES = new Set([
  'LINT', 'Lint', 'lint',
  'SPECHINT', 'SpecHint', 'SPEC_HINT',
  'HL7_SPEC_HINT', 'HL7Advisory', 'HL7_ADVISORY'
]);

// LINT findings → Amber warning style (NEVER blocking)
if (ADVISORY_SOURCES.has(finding.source)) {
  return {
    icon: 'warning',
    color: 'amber',
    label: 'Quality Finding',
    isBlocking: false,
    displaySeverity: 'warning'  // ← OVERRIDE
  };
}
```

**Evidence:**  
- If `source === 'LINT'` and `severity === 'error'`, frontend displays it as **warning** (amber)
- If `source === 'SPECHINT'` and `severity === 'error'`, frontend displays it as **info** (blue)

---

## 2️⃣ Source-Based Behavior

### Hardcoded source assumptions

**File:** [frontend/src/utils/validationLayers.ts](frontend/src/utils/validationLayers.ts#L49-L134)

```typescript
export const getLayerMetadata = (source: string) => {
  switch (normalized) {
    case 'LINT':
      return { isBlocking: false, ... };  // NON-BLOCKING
      
    case 'SPEC_HINT':
      return { isBlocking: false, ... };  // NON-BLOCKING
      
    case 'FHIR':
    case 'Firely':
      return { isBlocking: true, ... };   // BLOCKING
      
    case 'PROJECT':
    case 'Business':
    case 'BusinessRules':
      return { isBlocking: true, ... };   // BLOCKING
      
    case 'CodeMaster':
      return { isBlocking: true, ... };   // BLOCKING
      
    case 'Reference':
      return { isBlocking: true, ... };   // BLOCKING
      
    default:
      return { isBlocking: false, ... };  // UNKNOWN → NON-BLOCKING
  }
};
```

**File:** [frontend/src/utils/validationUICounters.ts](frontend/src/utils/validationUICounters.ts#L48-L56)

```typescript
const BLOCKING_SOURCES = ['FHIR', 'Business', 'CodeMaster', 'Reference'] as const;
const QUALITY_SOURCES = ['LINT'] as const;
const GUIDANCE_SOURCES = ['SPECHINT'] as const;

export const isBlockingError = (error: ValidationError): boolean => {
  return BLOCKING_SOURCES.includes(error.source as any);
};
```

### Source determines UI presentation

**YES** - Source is the PRIMARY driver of UI behavior:

| Source | Color | Icon | Blocking | Badge | Border |
|--------|-------|------|----------|-------|--------|
| LINT | Yellow | ⚠️ Warning | ❌ No | "Lint (Best-effort)" | yellow |
| SPEC_HINT | Blue | ℹ️ Info | ❌ No | "HL7 Advisory" | blue |
| FHIR / Firely | Red | ❌ Error | ✅ YES | "FHIR Structural" | red |
| Business / PROJECT | Purple | ❌ Error | ✅ YES | "Project Rule" | purple |
| CodeMaster | Orange | ❌ Error | ✅ YES | "Code System" | orange |
| Reference | Rose | ❌ Error | ✅ YES | "Reference Validation" | rose |
| **STRUCTURE** | **Gray** | **❓ Unknown** | **❌ No** | **Unknown** | **gray** |

**CRITICAL:** `source: "STRUCTURE"` is NOT in the recognized source list and falls to **default (non-blocking)**.

---

## 3️⃣ Definition of "Blocking"

### What "blocking" means in frontend

**Blocking** means:
1. **Error counter**: Counts toward "blocking errors" total
2. **Status message**: Shows "Validation Failed" (not "Passed with Warnings")
3. **Visual styling**: Red error icon and border (not amber/blue)
4. **Semantic meaning**: "Must be fixed before bundle is valid"

**File:** [frontend/src/utils/validationUICounters.ts](frontend/src/utils/validationUICounters.ts#L125-L155)

```typescript
export const getValidationStatusText = (counters) => {
  if (counters.blocking > 0) {
    return {
      label: 'Validation Failed',
      message: `${counters.blocking} blocking issue(s) must be fixed before the bundle is valid.`,
      variant: 'failed',
    };
  }
  
  if (counters.quality > 0 || counters.guidance > 0) {
    return {
      label: 'Validation Passed with Warnings',
      message: `${advisoryCount} advisory check(s) detected. These do not block validation.`,
      variant: 'warning',
    };
  }
  
  return {
    label: 'Validation Passed',
    message: 'No blocking or advisory issues detected.',
    variant: 'success',
  };
};
```

### Where blocking is enforced

**Display only** - No button disablement or navigation guards found.

Blocking status affects:
- ✅ **Error counters** in header
- ✅ **Status badges** (red "Failed" vs green "Passed")
- ✅ **Status messages** ("must be fixed" vs "advisory")
- ✅ **Visual styling** (red borders vs amber/blue)
- ❌ **NOT enforced:** No buttons disabled, no export prevention, no workflow gates

**Locations:**
1. [ValidationPanel.tsx](frontend/src/components/playground/Validation/ValidationPanel.tsx) - Status display
2. [ValidationLayerInfo.tsx](frontend/src/components/playground/Validation/ValidationLayerInfo.tsx) - Layer descriptions
3. [IssueCard.tsx](frontend/src/components/playground/Validation/IssueCard.tsx) - Individual error cards
4. [IssueGroupCard.tsx](frontend/src/components/playground/Validation/IssueGroupCard.tsx) - Grouped error display

---

## 4️⃣ Mismatch Analysis (CRITICAL)

| Case | Backend Meaning | Frontend Behavior | Intentional? | Root Cause |
|------|----------------|-------------------|--------------|------------|
| **STRUCTURE + error** | **Invalid FHIR** | **Non-blocking (gray/unknown)** | ❌ **ACCIDENTAL** | **Source not recognized** |
| PROJECT + error | Business violation | Blocking (purple) | ✅ Correct | Recognized source |
| LINT + error | Advisory | Non-blocking (amber) | ✅ Intentional | Advisory by design |
| FHIR + error | Firely structural | Blocking (red) | ✅ Correct | Recognized source |

### Root Cause: Source Name Mismatch

**Backend emits:**
```json
{
  "source": "STRUCTURE",
  "severity": "error",
  "errorCode": "INVALID_ENUM_VALUE",
  "message": "Invalid enum value 'malex' at Patient.gender"
}
```

**Frontend expects:**
```typescript
const BLOCKING_SOURCES = ['FHIR', 'Business', 'CodeMaster', 'Reference'];
// ❌ 'STRUCTURE' is NOT in this list
```

**Result:**
- `source: "STRUCTURE"` falls to `default` case
- Default case returns `isBlocking: false`
- STRUCTURE errors displayed with gray styling and "unknown" badge
- Not counted as blocking errors

### Is this intentional?

**NO - This is accidental** due to:

1. **Backend code comment mismatch:**  
   File: `JsonNodeStructuralValidator.cs`
   ```csharp
   // All errors emitted are STRUCTURE authority with ERROR severity.
   return new ValidationError {
       Source = "STRUCTURE",  // ← Backend uses "STRUCTURE"
       Severity = "error"
   };
   ```

2. **Frontend does not recognize "STRUCTURE":**  
   File: `validationLayers.ts`
   ```typescript
   // No case for 'STRUCTURE'
   case 'FHIR':  // ← Frontend expects "FHIR"
   case 'Firely':
     return { isBlocking: true, ... };
   ```

3. **Semantic intent:**  
   - Backend: "STRUCTURE" = Pre-POCO structural validation (cardinality, enums, primitives)
   - Backend intent: These are **blocking** FHIR compliance errors
   - Frontend: No knowledge of "STRUCTURE" source
   - Frontend result: Falls to default non-blocking

---

## 5️⃣ Terminology & UX Copy Review

### User-facing terminology for advisory sources

**File:** [IssueCard.tsx](frontend/src/components/playground/Validation/IssueCard.tsx#L61-L65)

```tsx
{isAdvisorySource && (
  <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
    <p className="font-medium">ℹ️ Advisory - Non-blocking</p>
    <p className="mt-0.5 text-gray-700">
      This is a recommendation that does not prevent validation or rule editing.
    </p>
  </div>
)}
```

**Advisory sources defined as:**
```typescript
const isAdvisorySource = 
  issue.source === 'LINT' || 
  issue.source === 'HL7Advisory' || 
  issue.source === 'Lint' || 
  issue.source === 'HL7_SPEC_HINT';
```

**❌ "STRUCTURE" is NOT in advisory sources** but would be treated as non-blocking by default.

### Terms that could misrepresent STRUCTURE errors

**If STRUCTURE errors fall to default (unknown source):**

1. **ValidationLayerInfo.tsx:**
   ```tsx
   default:
     return {
       displayName: source,  // Shows "STRUCTURE"
       fullName: source,
       isBlocking: false,   // ← WRONG for STRUCTURE
       explanation: 'Additional validation check.',  // ← VAGUE
       badgeColor: 'bg-gray-100 text-gray-800',  // ← Gray (unknown)
     };
   ```

2. **No explicit "non-blocking" label** for unknown sources, but:
   - Gray badge implies lower severity
   - Not counted in blocking errors
   - Status shows "Validation Passed with Warnings" even with STRUCTURE errors

---

## 6️⃣ Compliance Alignment Check

### Company Policy
> "HL7 STRUCTURE errors must be resolved to achieve HL7 compliance"

### Does frontend communicate this?

**❌ NO** - Frontend does NOT visually communicate that STRUCTURE errors are mandatory because:

1. **STRUCTURE errors are NOT recognized** as a blocking source
2. **Falls to default** (non-blocking, gray badge)
3. **Status message:** "Validation Passed with Warnings" (even with STRUCTURE errors present)
4. **No visual distinction** from optional advisory findings
5. **No "must fix" language** for STRUCTURE errors

### Minimal changes needed

**Option 1: Map STRUCTURE → FHIR (Recommended)**

Change backend to emit `source: "FHIR"` instead of `"STRUCTURE"`:

```csharp
// backend/src/Pss.FhirProcessor.Engine/Validation/JsonNodeStructuralValidator.cs
return new ValidationError {
    Source = "FHIR",  // ← Change from "STRUCTURE"
    Severity = "error"
};
```

**Why:** Frontend already handles FHIR as blocking with correct styling.

**Option 2: Add STRUCTURE to frontend (Alternative)**

Add "STRUCTURE" to frontend blocking sources:

```typescript
// frontend/src/utils/validationUICounters.ts
const BLOCKING_SOURCES = [
  'FHIR', 
  'STRUCTURE',  // ← Add this
  'Business', 
  'CodeMaster', 
  'Reference'
] as const;

// frontend/src/utils/validationLayers.ts
case 'STRUCTURE':
  return {
    displayName: 'FHIR Structural Validation',
    fullName: 'FHIR Structural Validation - Pre-POCO',
    isBlocking: true,  // ← MANDATORY
    explanation: 'FHIR structural validation performed before parsing. Must be fixed for HL7 compliance.',
    badgeColor: 'bg-red-100 text-red-800 border-red-300',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
  };
```

**Why:** Explicit handling of STRUCTURE as a distinct validation phase.

---

## 7️⃣ Recommendation Section

### Current State Matrix

| Source | Severity | Frontend Interpretation | Visual | isBlocking | Counted As | Status Impact |
|--------|----------|------------------------|--------|------------|------------|---------------|
| STRUCTURE | error | Unknown → Non-blocking | Gray | ❌ False | Advisory | "Passed with Warnings" |
| STRUCTURE | warning | Unknown → Non-blocking | Gray | ❌ False | Advisory | "Passed with Warnings" |
| FHIR | error | Blocking | Red | ✅ True | Blocking | "Validation Failed" |
| PROJECT | error | Blocking | Purple | ✅ True | Blocking | "Validation Failed" |
| LINT | error | Non-blocking (override) | Amber | ❌ False | Quality | "Passed with Warnings" |
| SPEC_HINT | error | Non-blocking (override) | Blue | ❌ False | Guidance | "Passed with Warnings" |

### Proposed Matrix (Option 1: Backend Change)

**Backend change:** Emit `source: "FHIR"` instead of `"STRUCTURE"`

| Source | Severity | Frontend Interpretation | Visual | isBlocking | Counted As | Status Impact |
|--------|----------|------------------------|--------|------------|------------|---------------|
| FHIR | error | Blocking | Red | ✅ True | Blocking | "Validation Failed" |
| PROJECT | error | Blocking | Purple | ✅ True | Blocking | "Validation Failed" |
| LINT | error | Non-blocking (advisory) | Amber | ❌ False | Quality | "Passed with Warnings" |
| SPEC_HINT | error | Non-blocking (advisory) | Blue | ❌ False | Guidance | "Passed with Warnings" |

**Impact:**
- ✅ STRUCTURE errors immediately recognized as FHIR structural errors
- ✅ Treated as blocking (red, counts toward failure)
- ✅ Status shows "Validation Failed" when STRUCTURE errors present
- ✅ Minimal code change (backend only)
- ✅ No frontend changes needed
- ❌ Loses distinction between Firely validation and JSON structural validation (acceptable trade-off)

### Proposed Matrix (Option 2: Frontend Change)

**Frontend change:** Add STRUCTURE to blocking sources + styling

| Source | Severity | Frontend Interpretation | Visual | isBlocking | Counted As | Status Impact |
|--------|----------|------------------------|--------|------------|------------|---------------|
| STRUCTURE | error | Blocking | Red | ✅ True | Blocking | "Validation Failed" |
| STRUCTURE | warning | Warning | Amber | ❌ False | Warning | "Passed with Warnings" |
| FHIR | error | Blocking | Red | ✅ True | Blocking | "Validation Failed" |
| PROJECT | error | Blocking | Purple | ✅ True | Blocking | "Validation Failed" |
| LINT | error | Non-blocking (advisory) | Amber | ❌ False | Quality | "Passed with Warnings" |
| SPEC_HINT | error | Non-blocking (advisory) | Blue | ❌ False | Guidance | "Passed with Warnings" |

**Impact:**
- ✅ STRUCTURE errors explicitly recognized
- ✅ Distinction between pre-POCO (STRUCTURE) and Firely (FHIR) validation
- ✅ Respects severity: STRUCTURE+warning stays warning, STRUCTURE+error blocks
- ❌ Requires frontend changes in 3 files
- ✅ More accurate semantic model

---

## Summary of Findings

### Critical Issues

1. **❌ Source name mismatch:** Backend emits "STRUCTURE", frontend expects "FHIR"
2. **❌ Semantic gap:** STRUCTURE errors are MANDATORY but displayed as OPTIONAL
3. **❌ Compliance risk:** HL7 structural errors not visually distinguished from advisory findings

### Source Handling

- **Severity:** Respected in most cases, but OVERRIDDEN for LINT/SPEC_HINT
- **Source:** PRIMARY driver of blocking behavior (more important than severity)
- **Blocking:** Display-only (no workflow enforcement)

### UX Terminology

- **Advisory sources:** Clearly labeled "Non-blocking" with explanation
- **Unknown sources:** Fall to gray "unknown" styling with no explanation
- **STRUCTURE errors:** Currently fall to "unknown" category

### Recommendation

**✅ Option 1 (Backend Change)** is recommended:
- Change `Source = "STRUCTURE"` → `Source = "FHIR"` in `JsonNodeStructuralValidator.cs`
- Minimal code change
- Immediate compliance with frontend expectations
- STRUCTURE errors treated as blocking FHIR errors

**Alternative: Option 2 (Frontend Change)** if distinction between STRUCTURE and FHIR is important:
- Add STRUCTURE to blocking sources list
- Add STRUCTURE case to layer metadata
- Update normalizeSource to recognize STRUCTURE
- Preserves semantic distinction

---

## Files Requiring Changes

### Option 1: Backend Change Only

1. **backend/src/Pss.FhirProcessor.Engine/Validation/JsonNodeStructuralValidator.cs**
   - Change all `Source = "STRUCTURE"` to `Source = "FHIR"`
   - Lines: 433, 464, 494, 524, 560, 591

### Option 2: Frontend Change Required

1. **frontend/src/utils/validationLayers.ts**
   - Add case for 'STRUCTURE' with blocking=true
   - Add 'STRUCTURE' to normalizeSource function

2. **frontend/src/utils/validationUICounters.ts**
   - Add 'STRUCTURE' to BLOCKING_SOURCES array

3. **frontend/src/utils/validationSeverityMapper.ts**
   - Add 'STRUCTURE' to BLOCKING_SOURCES set

---

## Conclusion

The frontend correctly implements source-based validation semantics with clear visual hierarchy and blocking logic. However, **the "STRUCTURE" source is not recognized**, causing HL7 structural errors to be misclassified as non-blocking advisory findings.

**Action Required:** Align backend/frontend source naming convention (either change backend to "FHIR" or add frontend support for "STRUCTURE").
