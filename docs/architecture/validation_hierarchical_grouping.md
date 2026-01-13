# Validation Page Hierarchical Grouping

**Date**: 2025-01-XX  
**Status**: ✅ Implemented  
**File**: `frontend/src/components/playground/Validation/ValidationResultList.tsx`

---

## Overview

The Validation page now displays results in a strict **3-tier semantic hierarchy** that clearly communicates fix expectations and authority sources. This structure allows developers to answer "What must I fix?" in under 5 seconds.

---

## Visual Structure

```
Validation Results
│
├─ ❌ Project Rules (Must fix)
│   └─ Project-specific business rule violations
│
├─ ❌ FHIR Correctness (Must fix)
│   ├─ FHIR Structure (STRUCTURE source)
│   ├─ FHIR Model Validation (FHIR/Firely source)
│   ├─ Terminology Validation (CodeMaster source)
│   └─ Reference Validation (Reference source)
│
└─ ⚠️ Governance Review (Recommended)
    ├─ HL7 Advisory (SPEC_HINT source)
    └─ Best Practice (LINT source)
```

---

## Tier Definitions

### Tier 1: Project Rules (Must Fix)

**Icon**: ❌ (Red)  
**Badge**: "Must fix" (red background)  
**Sources**: `PROJECT`, `Business`  
**Description**: Issues that violate project-specific business rules and policies.

**Fix Expectation**: BLOCKING - Must be resolved before submission.

---

### Tier 2: FHIR Correctness (Must Fix)

**Icon**: ❌ (Red)  
**Badge**: "Must fix" (red background)  
**Description**: Structural and model validation issues that prevent HL7 FHIR compliance.

**Sub-groups** (all must-fix):

#### A. FHIR Structure
- **Source**: `STRUCTURE`
- **Purpose**: JSON structural validation (syntax, required fields, typing)
- **Example**: Missing required fields, incorrect data types, malformed JSON

#### B. FHIR Model Validation
- **Source**: `FHIR`, `Firely`
- **Purpose**: Firely SDK validation (cardinality, constraints, profiles)
- **Example**: Cardinality violations, profile constraints, invalid references

#### C. Terminology Validation
- **Source**: `CodeMaster`
- **Purpose**: Code validation against terminology servers
- **Example**: Invalid codes, missing display values

#### D. Reference Validation
- **Source**: `Reference`
- **Purpose**: Reference integrity validation
- **Example**: Broken references, circular dependencies

**Fix Expectation**: BLOCKING - Bundle is not HL7-compliant FHIR without these fixes.

---

### Tier 3: Governance Review (Recommended)

**Icon**: ⚠️ (Amber)  
**Badge**: "Recommended" (blue background)  
**Description**: Best-practice recommendations and advisory notices. Addressing these improves quality but does not affect HL7 validity.

**Sub-groups** (non-blocking):

#### A. HL7 Advisory
- **Source**: `SPEC_HINT`
- **Purpose**: Advisory notices from HL7 specification
- **Example**: Deprecated fields, better practice suggestions

#### B. Best Practice
- **Source**: `LINT`
- **Purpose**: Custom linting rules for consistency and maintainability
- **Example**: Missing optional fields, inconsistent naming

**Fix Expectation**: NON-BLOCKING - Bundle is HL7-compliant but may benefit from improvements.

---

## Design Decisions

### 1. STRUCTURE and Firely are Siblings

**Rationale**: Both validate HL7 FHIR correctness but at different layers:
- STRUCTURE validates JSON structure
- Firely validates FHIR model constraints

They are **not hierarchically related** (one doesn't contain the other). They are both part of the same authority: "HL7 FHIR Specification".

### 2. CodeMaster and Reference under FHIR Correctness

**Rationale**: Invalid codes or broken references make a bundle non-compliant, so they belong under "FHIR Correctness" (must-fix tier), not "Governance Review".

### 3. Visual Hierarchy Emphasizes Fix Priority

- **Must-fix sections**: Red ❌ icons, bold headers, red accent bars
- **Recommended sections**: Amber/Blue icons, softer emphasis, blue accent bars
- **Sub-groups**: Indented with vertical bars, item counts for quick scanning

### 4. No "Blocking/Non-blocking" Language

**Replaced with**:
- "Must fix" (for correctness issues)
- "Recommended" (for advisory/quality issues)

This aligns with HL7 compliance model and removes confusion about workflow gates (which are not implemented).

---

## Source Mapping

| Backend Source | Frontend Tier | Sub-group | Badge |
|----------------|---------------|-----------|-------|
| `PROJECT` | Project Rules | - | Must fix |
| `Business` | Project Rules | - | Must fix |
| `STRUCTURE` | FHIR Correctness | FHIR Structure | Must fix |
| `FHIR` | FHIR Correctness | FHIR Model Validation | Must fix |
| `Firely` | FHIR Correctness | FHIR Model Validation | Must fix |
| `CodeMaster` | FHIR Correctness | Terminology Validation | Must fix |
| `Reference` | FHIR Correctness | Reference Validation | Must fix |
| `SPEC_HINT` | Governance Review | HL7 Advisory | Recommended |
| `LINT` | Governance Review | Best Practice | Recommended |

---

## Implementation Details

### File: `ValidationResultList.tsx`

**Key Changes**:

1. **Hierarchical Grouping Logic**:
   ```typescript
   // Tier 1
   const projectRulesIssues = sortedIssues.filter(i => 
     i.source === 'PROJECT' || i.source === 'Business'
   );

   // Tier 2: FHIR Correctness
   const fhirStructureIssues = sortedIssues.filter(i => i.source === 'STRUCTURE');
   const fhirModelIssues = sortedIssues.filter(i => i.source === 'FHIR');
   const codeMasterIssues = sortedIssues.filter(i => i.source === 'CodeMaster');
   const referenceIssues = sortedIssues.filter(i => i.source === 'Reference');

   // Tier 3: Governance Review
   const hl7AdvisoryIssues = sortedIssues.filter(i => i.source === 'SPEC_HINT');
   const bestPracticeIssues = sortedIssues.filter(i => i.source === 'LINT');
   ```

2. **Visual Hierarchy**:
   - Top-level sections: Bold headers, large icons, badges
   - Sub-groups: Indented with vertical accent bars, smaller headers, item counts
   - Individual issues: Further indented, standard IssueCard component

3. **Responsive Rendering**:
   - Only show tiers/sub-groups that have issues
   - Empty sections are completely hidden
   - Zero-state message when all filters applied

---

## User Experience

### Before Hierarchical Grouping

```
❌ Validation Failed

[Flat list of all errors]
• Project Rule: Missing required metadata
• STRUCTURE: Invalid JSON type
• FHIR: Cardinality violation
• LINT: Missing optional field
• SPEC_HINT: Consider using new field
```

**Problems**:
- No clear separation between must-fix and recommendations
- Developer must scan entire list to find blocking issues
- No authority context (why is this error here?)

### After Hierarchical Grouping

```
❌ Project Rules (Must fix)
  Issues that violate project-specific business rules and policies.
  • Project Rule: Missing required metadata

❌ FHIR Correctness (Must fix)
  Structural and model validation issues that prevent HL7 FHIR compliance.
  
  ├─ FHIR Structure (2)
  │   • Invalid JSON type
  │   • Missing required field
  │
  └─ FHIR Model Validation (1)
      • Cardinality violation

⚠️ Governance Review (Recommended)
  Best-practice recommendations and advisory notices.
  
  ├─ HL7 Advisory (1)
  │   • Consider using new field
  │
  └─ Best Practice (1)
      • Missing optional field
```

**Benefits**:
- Clear separation: Must-fix at top, recommendations at bottom
- Developer can immediately see "2 must-fix sections, 1 recommendation section"
- Authority context provided in section descriptions
- Sub-groups show related issues together (e.g., all FHIR structural issues)

---

## Acceptance Criteria

✅ **Criterion 1**: Developer can answer "What must I fix?" in <5 seconds  
- **Result**: Yes - All must-fix items are in red ❌ sections at the top

✅ **Criterion 2**: STRUCTURE and Firely are siblings under "FHIR Correctness"  
- **Result**: Yes - Both shown as sub-groups under same parent

✅ **Criterion 3**: No "blocking/non-blocking" language  
- **Result**: Yes - Uses "Must fix" and "Recommended" badges

✅ **Criterion 4**: Visual hierarchy matches semantic hierarchy  
- **Result**: Yes - Indentation, icons, colors all reinforce authority levels

✅ **Criterion 5**: Build succeeds without errors  
- **Result**: Yes - Verified with `npm run build`

---

## Related Documentation

- [Unified Error Model](./08_unified_error_model.md) - Backend error structure
- [Validation Layers](./validationLayers.ts) - Source metadata and styling
- [Validation UI Counters](./validationUICounters.ts) - Counter logic (mustFix, recommendations)
- [Frontend Validation Semantics Audit](./FRONTEND_VALIDATION_SEMANTICS_AUDIT.md) - Initial analysis

---

## Future Enhancements

1. **Collapsible Sections**: Allow users to collapse/expand tiers and sub-groups
2. **Filtering by Tier**: Quick filter buttons: "Show Must-fix Only", "Show All"
3. **Issue Count Badges**: Show counts in tier headers: "FHIR Correctness (5)"
4. **Quick Jump Links**: Table of contents at top to jump to specific sub-groups
5. **Export by Tier**: Export must-fix issues separately from recommendations

---

## Migration Notes

### Breaking Changes
- None - This is a pure visual/organizational refactor
- Backend continues to emit same error structure
- Frontend continues to accept same ValidationError interface

### Legacy Support
- Old section headers removed: "FHIR Standard Hints", "Quality Checks"
- New section headers introduced: "Project Rules", "FHIR Correctness", "Governance Review"
- All source filters still work as before

---

**Status**: ✅ Implemented and verified  
**Next Steps**: User acceptance testing, gather feedback on visual hierarchy
