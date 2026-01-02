# JSON Pointer → Breadcrumb Normalization & STRUCTURE Copy

**Date**: 2 January 2026  
**Status**: ✅ Implemented  
**Purpose**: Display-only normalization of JSON Pointer paths to FHIRPath-style breadcrumbs with clear validation phase distinction

---

## Overview

The validation engine produces issues from multiple validation phases:

- **STRUCTURE** → Pre-parse JSON structural validation (before FHIR model exists)
- **FHIR** → Post-parse HL7 model validation (Firely SDK)

STRUCTURE validation operates on raw JSON using **JSON Pointer** (RFC 6901) paths, while post-parse validation uses **FHIRPath** expressions. This document describes the display normalization strategy that ensures consistent UI presentation while preserving validation phase boundaries.

---

## Architecture

### Validation Pipeline

```
┌──────────────────┐
│  Raw JSON Text   │
└────────┬─────────┘
         │
         ├─ Parse JSON → JsonNode
         │
         ├─ JsonNodeStructuralValidator ◄── STRUCTURE validation
         │  • Validates enums, primitives, cardinality
         │  • Path: JSON Pointer "/entry/0/resource/gender"
         │  • No FHIR resource objects exist yet
         │
         ├─ Parse JsonNode → POCO objects (Firely)
         │
         └─ FirelyValidationService ◄── FHIR validation
            • Validates FHIR constraints, profiles
            • Path: FHIRPath "Bundle.entry[0].resource.gender"
            • Full FHIR resource objects available
```

### Path Format Differences

| Validation Phase | Path Format | Example | Authoritative? |
|-----------------|-------------|---------|----------------|
| STRUCTURE (Pre-Parse) | JSON Pointer | `/entry/0/resource/gender` | ✅ Yes |
| FHIR (Post-Parse) | FHIRPath | `Bundle.entry[0].resource.gender` | ✅ Yes |

**Critical Constraint**: STRUCTURE validation occurs **before the FHIR model is parsed**, so JSON Pointer paths are the only available representation.

---

## Display Normalization Strategy

### Requirements

1. **Preserve Internal Paths**: Never convert or persist JSON Pointer as FHIRPath
2. **Consistent UI Display**: All breadcrumbs should look similar to users
3. **Phase Clarity**: Users must understand which validation phase produced each issue
4. **No Semantic Conversion**: Display normalization must not imply executable FHIRPath

### Implementation

**Display-only conversion function**:

```typescript
// frontend/src/utils/smartPathFormatting.ts
export function jsonPointerToFhirPathStyle(jsonPointer: string): string {
  if (!jsonPointer || jsonPointer === '/') {
    return '';
  }

  // Split by / and filter out empty strings and numeric indices
  const parts = jsonPointer.split('/').filter(p => p && !/^\d+$/.test(p));
  
  return parts.join('.');
}
```

**Usage in IssueCard**:

```typescript
// frontend/src/components/playground/Validation/IssueCard.tsx
const displayPath = issue.location || 
  (issue.jsonPointer ? jsonPointerToFhirPathStyle(issue.jsonPointer) : 'Unknown');
```

### Display Examples

| Backend Path | Internal Storage | Display (UI) |
|--------------|------------------|--------------|
| `/entry/0/resource/gender` | `jsonPointer: "/entry/0/resource/gender"` | `entry.resource.gender` |
| `Bundle.entry[0].resource.gender` | `location: "Bundle.entry[0].resource.gender"` | `Bundle.entry[0].resource.gender` |

**Result**: Users see consistent FHIRPath-style breadcrumbs regardless of validation phase.

---

## STRUCTURE Validation Phase Clarity

### Copy Requirements (MANDATORY)

All STRUCTURE issues must be clearly labeled as pre-parse validation with explanatory text.

### Implementation

#### 1. Validation Layer Metadata

**File**: [validationLayers.ts](frontend/src/utils/validationLayers.ts)

```typescript
case 'STRUCTURE':
  return {
    displayName: 'FHIR Structure (Pre-Parse)',  // ← Includes "(Pre-Parse)"
    fullName: 'FHIR Structural Validation - Pre-Parse',
    isBlocking: true,  // ← Must-fix
    explanation: 'This check validates the raw JSON structure before the FHIR model is parsed. It must be resolved to produce valid HL7 FHIR. Issues include invalid enum values, incorrect data types, and missing required fields.',
    badgeColor: 'bg-red-100 text-red-800 border-red-300',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
  };
```

#### 2. Issue Card Banner

**File**: [IssueCard.tsx](frontend/src/components/playground/Validation/IssueCard.tsx)

```tsx
{/* STRUCTURE (Pre-Parse) Notice */}
{isStructureSource && (
  <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-800">
    <p className="font-medium">🔍 FHIR Structure (Pre-Parse)</p>
    <p className="mt-0.5 text-gray-700">
      This check validates the raw JSON structure before the FHIR model is parsed. 
      It must be resolved to produce valid HL7 FHIR.
    </p>
  </div>
)}
```

#### 3. Hierarchical Grouping Label

**File**: [ValidationResultList.tsx](frontend/src/components/playground/Validation/ValidationResultList.tsx)

```tsx
{/* Sub-group A: FHIR Structure (Pre-Parse) */}
{fhirStructureIssues.length > 0 && (
  <div className="ml-7 space-y-2">
    <div className="flex items-center gap-2 mt-4">
      <div className="w-0.5 h-6 bg-red-300"></div>
      <h4 className="text-sm font-semibold text-gray-700">
        FHIR Structure (Pre-Parse)
      </h4>
      <span className="text-xs text-gray-500">({fhirStructureIssues.length})</span>
    </div>
    <p className="text-xs text-gray-600 ml-3 mb-2">
      JSON structural validation performed before FHIR model parsing
    </p>
    ...
  </div>
)}
```

### Forbidden Terms for STRUCTURE

**NEVER use the following terms for STRUCTURE issues**:

- ❌ "Advisory"
- ❌ "Non-blocking"
- ❌ "Warning"
- ❌ "Recommendation"
- ❌ "Optional"

**Always use**:

- ✅ "Must fix"
- ✅ "Pre-Parse"
- ✅ "Required for HL7 FHIR compliance"
- ✅ "Blocking"

---

## Visual Presentation

### STRUCTURE Issue Display

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 FHIR Structure (Pre-Parse)                          │
│ This check validates the raw JSON structure before     │
│ the FHIR model is parsed. It must be resolved to       │
│ produce valid HL7 FHIR.                                 │
├─────────────────────────────────────────────────────────┤
│ 🔴 Patient                                              │
│                                                         │
│ entry.resource.gender                                   │ ← Display breadcrumb
│                                                         │
│ Invalid value                                           │
│ The value "malex" is not allowed for this field.       │
├─────────────────────────────────────────────────────────┤
│ [FHIR Structure (Pre-Parse)]  [❌ Must fix]           │
└─────────────────────────────────────────────────────────┘
```

### FHIR Issue Display (for comparison)

```
┌─────────────────────────────────────────────────────────┐
│ 🔴 Patient                                              │
│                                                         │
│ Bundle.entry[0].resource.gender                         │ ← FHIRPath
│                                                         │
│ Cardinality violation                                   │
│ Expected 1 occurrence, found 0                          │
├─────────────────────────────────────────────────────────┤
│ [HL7 Spec]  [❌ Must fix]                              │
└─────────────────────────────────────────────────────────┘
```

**Key Difference**: STRUCTURE issues have pre-parse banner and "(Pre-Parse)" label.

---

## Behavioral Constraints

### What Display Normalization Does

✅ Converts JSON Pointer to FHIRPath-style string for UI display  
✅ Makes breadcrumbs look consistent across all validation phases  
✅ Improves user readability of paths

### What Display Normalization Does NOT Do

❌ Change validation authority  
❌ Convert JSON Pointer to executable FHIRPath  
❌ Mask validation phase differences  
❌ Allow copying STRUCTURE paths as real FHIRPath expressions  
❌ Modify internal storage of paths  
❌ Change blocking/must-fix semantics

---

## Acceptance Criteria

### ✅ Path Display Consistency

**Test**: Create STRUCTURE error + FHIR error, view in UI

**Expected**:
- STRUCTURE: `entry.resource.gender` (converted from `/entry/0/resource/gender`)
- FHIR: `Bundle.entry[0].resource.gender` (native FHIRPath)
- Both display in similar FHIRPath-style format

**Actual**: ✅ Both display consistently

---

### ✅ Validation Phase Distinction

**Test**: View STRUCTURE error in issue card

**Expected**:
- Banner: "🔍 FHIR Structure (Pre-Parse)"
- Badge: "FHIR Structure (Pre-Parse)"
- Section label: "FHIR Structure (Pre-Parse)" with description
- No "Advisory", "Non-blocking", or "Warning" language

**Actual**: ✅ All phase indicators present

---

### ✅ Internal Path Preservation

**Test**: Inspect issue object in browser console

**Expected**:
```json
{
  "source": "STRUCTURE",
  "jsonPointer": "/entry/0/resource/gender",  // ← Preserved exactly
  "location": null
}
```

**Actual**: ✅ JSON Pointer preserved in original format

---

### ✅ No Semantic Conversion

**Test**: Copy path from UI, attempt to use in FHIRPath evaluator

**Expected**:
- Display path is NOT executable FHIRPath
- Display path is just a visual breadcrumb
- Copying path should not imply it can be used as FHIRPath query

**Actual**: ✅ Display path is clearly for navigation/display only

---

## Files Modified

### 1. validationLayers.ts
**Change**: Updated STRUCTURE metadata  
**Lines**: 101-111  
**Impact**: Badge now shows "(Pre-Parse)", explanation clarifies JSON-level validation

### 2. IssueCard.tsx
**Change**: Added STRUCTURE banner notice  
**Lines**: 48-57  
**Impact**: Every STRUCTURE issue has pre-parse explanation banner

### 3. ValidationResultList.tsx
**Change**: Updated hierarchical section label  
**Lines**: 169-178  
**Impact**: Section header clarifies "(Pre-Parse)" and includes description

### 4. smartPathFormatting.ts
**Change**: No changes (function already exists)  
**Lines**: 278-290  
**Impact**: Display normalization already working correctly

---

## Summary

### Path Handling

- **Internal Storage**: JSON Pointer preserved exactly as returned by backend
- **Display Layer**: JSON Pointer converted to FHIRPath-style breadcrumb for UI only
- **No Semantic Conversion**: Display normalization does not create executable FHIRPath

### Validation Phase Clarity

- **STRUCTURE issues**: Clearly labeled "(Pre-Parse)" in 3 locations (badge, banner, section)
- **Explanatory text**: Users understand STRUCTURE validates raw JSON before FHIR parsing
- **No advisory language**: STRUCTURE is always "Must fix", never "Advisory/Non-blocking/Warning"

### User Experience

- **Consistent breadcrumbs**: All paths display in similar FHIRPath-style format
- **Phase awareness**: Users understand when validation happened (pre vs post parse)
- **Clear authority**: STRUCTURE issues have same visual weight as FHIR issues (both must-fix)

---

## Out of Scope

- ❌ Backend path format changes
- ❌ Validation logic modifications
- ❌ Export behavior changes
- ❌ Overview tab updates

---

## Future Enhancements

1. **Path tooltips**: Hover over breadcrumb to see original JSON Pointer
2. **Copy path button**: Copy JSON Pointer vs display breadcrumb (user choice)
3. **Phase filter**: Filter by pre-parse vs post-parse validation
4. **Validation timeline**: Visual timeline showing validation phases

---

**Status**: ✅ Fully implemented  
**Build**: ✅ Successful  
**Next Steps**: User acceptance testing
