---
⚠️ HISTORICAL DOCUMENT  
This phase is complete. Do not use this document as a source of truth for new development.
---

# Phase 5.1 Implementation Summary

**Status:** ✅ COMPLETE  
**Date:** January 8, 2026  
**Commit:** e44d1b3

---

## What Was Implemented

Phase 5.1 implements the **foundation layer** for validation transparency: type-safe models and deterministic explainers.

### Folder Structure Created

```
frontend/src/validation/
├── model/                          ← Type-safe interfaces (NEW)
│   ├── ValidationSource.ts
│   ├── ValidationSeverity.ts
│   ├── ValidationIssue.ts
│   ├── ValidationResult.ts
│   └── index.ts
│
├── explainers/                     ← Explanation logic (NEW)
│   ├── Explanation.ts
│   ├── formatValue.ts
│   ├── explainError.ts
│   ├── explainAmbiguity.ts
│   ├── explainPolicy.ts
│   ├── explanationRegistry.ts
│   ├── index.ts
│   └── __tests__/                  ← 30 passing tests (NEW)
│       ├── explainError.test.ts
│       ├── explainAmbiguity.test.ts
│       ├── explainPolicy.test.ts
│       ├── explanationRegistry.test.ts
│       └── formatValue.test.ts
│
├── components/                     ← Empty (Phase 5.2)
├── views/                          ← Empty (Phase 5.2)
└── index.ts                        ← Updated exports
```

---

## Models (Backend Contract)

### ValidationSource
```typescript
type ValidationSource = 
  | 'StructureDefinition'  // Profile constraints
  | 'FHIRPath'             // Business rules
  | 'Reference'            // Resource references
  | 'Syntax';              // JSON structure
```

### ValidationSeverity
```typescript
type ValidationSeverity = 
  | 'error'    // Validation failure
  | 'warning'  // Potential issue
  | 'info';    // Informational finding
```

### ValidationIssue
```typescript
interface ValidationIssue {
  source: ValidationSource;
  severity: ValidationSeverity;
  errorCode: string;
  path: string;
  message: string;
  details?: {
    profile?: string;
    expected?: unknown;
    actual?: unknown;
    valueSet?: string;
    violationReason?: string;
    policyMode?: 'strict' | 'permissive';
    explanationHint?: string;
  };
}
```

### ValidationResult
```typescript
interface ValidationResult {
  issues: ValidationIssue[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalInfo: number;
    hasAmbiguity: boolean;
    policyMode: 'strict' | 'permissive';
  };
}
```

---

## Explainers (Deterministic Logic)

### Explanation Interface
```typescript
interface Explanation {
  what: string;       // What failed
  why: string;        // Why it failed
  context?: string;   // Additional context
  policy?: string;    // Policy implications
  links?: Array<{     // Related docs
    label: string; 
    href: string 
  }>;
}
```

### Primary Functions

**explainError(issue: ValidationIssue): Explanation**
- Looks up error code in registry
- Returns explanation or fallback
- Pure function (no side effects)

**explainAmbiguity(issue: ValidationIssue): Explanation | null**
- Returns explanation if `violationReason` exists
- Explicitly states "does NOT mean the data is valid"
- Returns null if not ambiguous

**explainPolicy(summaryOrIssue): string**
- Explains strict vs permissive mode
- Shows how policy affects severity

**formatValue(value: unknown): string**
- Safely formats values for display
- Handles undefined, null, objects, arrays
- Clamps long strings to 200 chars

---

## Registry Coverage

### Implemented Error Codes (9)

| **Error Code**                             | **Explanation Provided**                           |
|--------------------------------------------|----------------------------------------------------|
| `SD_CARDINALITY_MIN_VIOLATION`             | Required element missing                           |
| `SD_CARDINALITY_MAX_VIOLATION`             | Too many occurrences                               |
| `SD_FIXED_VALUE_MISSING`                   | Fixed value element missing                        |
| `SD_FIXED_VALUE_MISMATCH`                  | Value doesn't match fixed constraint               |
| `SD_PATTERN_MISSING`                       | Pattern-matching element missing                   |
| `SD_PATTERN_MISMATCH`                      | Value doesn't match pattern                        |
| `SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED`| ValueSet cannot be resolved offline                |
| `SD_REQUIRED_BINDING_MISSING`              | Required code missing                              |
| `SD_REQUIRED_BINDING_INVALID_CODE`         | Code not in required ValueSet                      |

### Extensibility

```typescript
// Register custom explanations
registerExplanation('CUSTOM_ERROR_CODE', (issue) => ({
  what: 'Custom what',
  why: 'Custom why',
  context: issue.path,
}));
```

---

## Design Principles

### 1. Pure Functions
- No API calls
- No side effects
- Deterministic output

### 2. No Heuristics
- No string parsing
- No guessing meaning
- Registry-based only

### 3. Ambiguity as First-Class
- Explicit "does NOT mean valid" warning
- Links to capabilities page
- Policy mode always shown

### 4. Safe Fallbacks
- Unknown error codes get default explanation
- Missing details handled gracefully
- No crashes on null/undefined

---

## Test Coverage

### Test Files (5 files, 30 tests, all passing)

**explainError.test.ts** (4 tests)
- Registry lookup for known codes
- Fallback for unknown codes
- Missing details handling

**explainAmbiguity.test.ts** (5 tests)
- Returns explanation when violationReason exists
- Includes "does NOT mean valid" warning
- Returns null when not ambiguous
- Policy mode shown correctly
- Links to documentation

**explainPolicy.test.ts** (6 tests)
- Strict mode explanation
- Permissive mode explanation
- Works with summary or issue
- Unknown policy handling
- Policy label generation

**explanationRegistry.test.ts** (6 tests)
- Registry contains all 9 error codes
- Custom registration works
- Default fallback works
- Missing details handled

**formatValue.test.ts** (9 tests)
- Undefined/null → "(missing)"
- String/number/boolean rendered directly
- Objects → JSON with 200 char limit
- Circular references → "(complex value)"

### Run Tests
```bash
npm test -- src/validation/explainers/__tests__ --run
```

---

## What's NOT in Phase 5.1

Phase 5.1 is **foundation only**. The following are deliberately NOT implemented:

❌ **UI Components** (Phase 5.2)
- ValidationSummary
- ValidationIssueRow
- ValidationIssueDetails
- AmbiguityBanner

❌ **Views** (Phase 5.2)
- ValidationResultsView
- ValidationCapabilitiesView

❌ **Pages/Routes** (Phase 5.3)
- /validation/results
- /validation/capabilities

❌ **Product Features** (Forever OUT OF SCOPE)
- Project listing
- Upload flows
- Bundle browsing
- Rule authoring
- Terminology browsing

---

## Integration with Existing Code

### Legacy Compatibility

The main index.ts preserves legacy exports while adding new Phase 5.1 exports:

```typescript
// Phase 5.1 - New structure
export * from './model';
export * from './explainers';

// Legacy Phase 6 exports (deprecated)
export { 
  explainError as legacyExplainError, 
  type ExplainableError 
} from "./explainError";
```

### Migration Path

Existing code can continue using legacy exports while new code uses Phase 5.1:

```typescript
// OLD (still works)
import { explainError as legacyExplainError } from '@/validation';

// NEW (Phase 5.1)
import { explainError, type ValidationIssue } from '@/validation';
```

---

## Next Steps

### Phase 5.2: UI Components (Week 2)

Create React components under `frontend/src/validation/components/`:

1. **ValidationSummary**
   - Shows error/warning/info counts
   - Policy mode badge
   - Ambiguity indicator

2. **ValidationIssueRow**
   - Severity icon
   - Error code
   - Short message
   - Path
   - Expandable details

3. **ValidationIssueDetails**
   - Uses `explainError()` from Phase 5.1
   - Shows what/why/context/policy
   - Links to documentation

4. **AmbiguityBanner**
   - Uses `explainAmbiguity()` from Phase 5.1
   - Prominent warning
   - Link to capabilities page

### Phase 5.3: Views & Pages (Week 3)

1. **ValidationResultsView**
   - Composes Phase 5.2 components
   - No business logic (all in explainers)

2. **ValidationCapabilitiesView**
   - Renders `/docs/public/WHAT_WE_VALIDATE.md`
   - Read-only, informational

3. **Route Pages**
   - `/validation/results`
   - `/validation/capabilities`

---

## Verification

### Commit Details
- **Commit:** e44d1b3
- **Files Changed:** 19
- **Insertions:** 1669 lines
- **Tests:** 30 passing

### Structure Verified
```bash
ls -R frontend/src/validation/
```

Output:
```
frontend/src/validation/:
components/  explainers/  index.ts  model/  views/

frontend/src/validation/model/:
ValidationIssue.ts  ValidationResult.ts  
ValidationSeverity.ts  ValidationSource.ts  index.ts

frontend/src/validation/explainers/:
Explanation.ts  __tests__/  explainAmbiguity.ts  
explainError.ts  explainPolicy.ts  explanationRegistry.ts  
formatValue.ts  index.ts

frontend/src/validation/explainers/__tests__/:
explainAmbiguity.test.ts  explainError.test.ts  
explainPolicy.test.ts  explanationRegistry.test.ts  
formatValue.test.ts
```

---

## Architecture Compliance

Phase 5.1 follows Phase 5 specification:

✅ **Models:** Type-safe, matches backend contract  
✅ **Explainers:** Deterministic, registry-based  
✅ **Tests:** Comprehensive coverage  
✅ **Folder Structure:** Strict adherence to spec  
✅ **No UI Yet:** Components deferred to Phase 5.2  
✅ **No Scope Violations:** No project mgmt, uploads, etc.

---

**Phase 5.1 Status: ✅ COMPLETE**

Ready for Phase 5.2 (UI Components).
