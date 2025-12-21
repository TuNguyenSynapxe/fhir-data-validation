# Validation Source Labeling — Visual Reference

## Label Comparison: Before vs After

### LINT Validation
**Before**: `Lint (Best-Effort)` — amber/yellow badge  
**After**: `Lint (Best-effort)` — yellow badge  
**Change**: Normalized capitalization, clearer yellow badge

### HL7 Advisory (SPEC_HINT)
**Before**: `HL7 Advisory` — cyan badge  
**After**: `HL7 Advisory` — blue badge  
**Change**: Changed from cyan to blue for better visual distinction

### FHIR Validation
**Before**: `FHIR Validation`  
**After**: `FHIR Structural Validation`  
**Change**: Added "Structural" to clarify it's about FHIR structure, not business rules

### Reference Validation
**Before**: `Project Rule` ❌ (WRONG!)  
**After**: `Reference Validation` ✅  
**Change**: Complete relabel — no longer called a "rule"

### CodeMaster
**Before**: `Project Rule` ❌ (WRONG!)  
**After**: `Code System Validation` ✅  
**Change**: Distinct label clarifying it's system code validation

### Project Rules
**Before**: `Project Rules`  
**After**: `Project Rule` (singular)  
**Change**: Singular form for consistency

---

## Group Header Format

### Before
```
MISSING_REQUIRED_FIELD (3 occurrences)
```
**Problem**: User can't immediately tell the source

### After
```
HL7 Advisory — MISSING_REQUIRED_FIELD (3 occurrences)
```
**Solution**: Source label comes first, answers "Did I create this?"

---

## Legend Tooltip

### Before
Showed 4 validation layers:
1. Lint (Best-Effort)
2. HL7 Advisory
3. FHIR Validation
4. Project Rules

**Missing**: Reference Validation wasn't shown separately

### After
Shows 5 validation layers:
1. Lint (Best-effort)
2. HL7 Advisory
3. FHIR Structural Validation
4. **Reference Validation** ← NEW
5. Project Rule

---

## Badge Colors

| Source | Color | Border | Usage |
|--------|-------|--------|-------|
| LINT | Yellow | `border-l-yellow-400` | Non-blocking portability |
| SPEC_HINT | Blue | `border-l-blue-400` | Non-blocking advisory |
| FHIR | Red | `border-l-red-500` | Blocking structural |
| Reference | Rose | `border-l-rose-500` | Blocking integrity |
| PROJECT | Purple | `border-l-purple-500` | Blocking user rule |
| CodeMaster | Orange | `border-l-orange-500` | Blocking system |

---

## Blocking Indicators

### Format
Non-blocking: `🟢 Blocking: NO` (green badge with CheckCircle icon)  
Blocking: `🔴 Blocking: YES` (red badge with XCircle icon)

### Mapping
- LINT → Non-blocking
- SPEC_HINT → Non-blocking
- FHIR → Blocking
- Reference → Blocking
- PROJECT → Blocking
- CodeMaster → Blocking

---

## Key Messages (Tooltips)

### LINT
"Best-effort portability check. Some FHIR engines may accept this, others may reject it."

### SPEC_HINT
"Guidance from the HL7 FHIR specification. Advisory only and does not block validation."

### FHIR
"FHIR structural validation performed by the Firely engine."

### Reference
"Ensures referenced resources exist within the bundle. **This is not a rule.**"

### PROJECT
"Rule defined by your project configuration."

### CodeMaster
"Code system validation performed by the system."

---

## User Questions Answered

### "Did I create this error?"
✅ **YES** if badge shows: `Project Rule` (purple)  
❌ **NO** for all other sources (LINT, HL7, FHIR, Reference, CodeMaster)

### "Is this blocking validation?"
✅ Check the blocking indicator:
- `Blocking: YES` (red) → Must fix
- `Blocking: NO` (green) → Advisory only

### "What does 'Reference Validation' mean?"
✅ Tooltip explains: "Ensures referenced resources exist within the bundle. This is not a rule."  
✅ Clear distinction from user-defined rules

### "Why is there an HL7 Advisory when Firely passed?"
✅ Tooltip explains: "Advisory only and does not block validation."  
✅ Non-blocking indicator reinforces this

---

## Example Error Cards

### Example 1: Reference Error
```
🔴 Reference Validation — BROKEN_REFERENCE (1 occurrence)

Badge: [Reference Validation] [🔴 Blocking: YES]
Tooltip: "Ensures referenced resources exist within the bundle. This is not a rule."
```

### Example 2: HL7 Advisory
```
ℹ️ HL7 Advisory — MISSING_REQUIRED_FIELD (3 occurrences)

Badge: [HL7 Advisory] [🟢 Blocking: NO]
Tooltip: "Guidance from the HL7 FHIR specification. Advisory only and does not block validation."
```

### Example 3: Project Rule
```
🔴 Project Rule — VALUE_OUT_OF_RANGE (2 occurrences)

Badge: [Project Rule] [🔴 Blocking: YES]
Tooltip: "Rule defined by your project configuration."
```

---

**Status**: ✅ Complete — All visual elements updated for clarity
