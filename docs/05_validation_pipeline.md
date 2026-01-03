# 05. Validation Pipeline Specification — FHIR Processor V2

> **Phase 1 STRUCTURE Validation:** ✅ Complete — See [PHASE_1_COMPLETE.md](../PHASE_1_COMPLETE.md)

## 1. Overview
The Validation Pipeline is the orchestrated backend workflow that processes:
- the FHIR Bundle
- **STRUCTURE validation (Phase 1)** — Pre-POCO grammar checks
- business validation rules
- CodeSystems/CodeMaster
- reference integrity
- navigation resolution
- unified error model

The pipeline ensures correctness, determinism, and consistency across projects.

## 2. Pipeline Execution Order (Strict)
1. **Input Parsing**
2. **STRUCTURE Validation (Phase 1)** — Pre-POCO grammar checks
3. **Firely Structural Validation** — POCO model validation
4. **FHIRPath Business Rule Validation**
5. **CodeMaster Validation**
6. **Reference Validation**
7. **Error Aggregation**
8. **Smart Path Navigation Mapping**
9. **Unified Error Model Assembly**
10. **Final API Response**

Each step always runs in this order. Steps may be skipped only if inputs are absent.

**Phase 1 Note:** STRUCTURE validation runs **before** Firely to catch JSON-level errors before deserialization. See [STRUCTURE Coverage Spec](./STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md).

---

## 3. Step Details

### 3.1 Step 1 – Input Parsing
- Accepts raw JSON bundle + rules + codes
- Verifies JSON structure
- Wraps the bundle into `BundleWrapper`
- Extracts resource indexes for use by navigation engine

### 3.2 Step 2 – STRUCTURE Validation (Phase 1)
**NEW — Phase 1 Complete ✅**

Pre-POCO validation using `JsonNodeStructuralValidator`:
- FHIR `id` grammar (1-64 chars, `[A-Za-z0-9.-]`)
- FHIR `string` vs `markdown` (no newlines in string)
- FHIR `code` lexical (no whitespace/control chars)
- FHIR `value[x]` exclusivity (only one variant)
- FHIR `Reference` grammar (format and combinations)
- FHIR `Extension` grammar (url required, shape validation)
- FHIR `uri`/`url`/`canonical` grammar (RFC 3986)

**Produces:** `Source = "STRUCTURE"` errors (blocking)

**Documentation:**
- [STRUCTURE Coverage Spec](./STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md)
- [STRUCTURE Guardrails](./STRUCTURE_VALIDATION_GUARDRAILS.md)
- [Phase 1 Complete](../PHASE_1_COMPLETE.md)

### 3.3 Step 3 – Firely Structural Validation
Firely Validator checks:
- Cardinality (min/max)
- Datatype correctness
- Slice constraints
- FHIR invariants
- Element presence
- Terminology if IG is loaded (optional)

Produces Firely `OperationOutcome.issue[]` → `Source = "FHIR"` or `"Firely"`.

**Note:** STRUCTURE validation (Step 2) catches many errors before Firely, improving error messages and preventing deserialization failures.

No PSS or business rules are evaluated here.

### 3.4 Step 4 – Business Rule Validation (FHIRPath)
Uses RuleEngineService to:
- Compile FHIRPath expressions
- Evaluate required/regex/allowedValues/CodeSystem/ArrayLength rules
- Perform data comparisons
- Returns rule-specific validation errors with resource context

Strictly avoids duplicating Firely responsibilities.

### 3.4 Step 4 – CodeMaster Validation
Used primarily for Observation.component[*].

Validates:
- Component question codes exist in CodeMaster
- Allowed answers match CodeMaster definitions
- Multi-value vs single-value correctness
- Screening-type consistency

Produces errors labeled `"source": "CodeMaster"`.

### 3.5 Step 5 – Reference Validation
Ensures:
- Referenced resources exist
- Reference type matches allowed target types
- Reference format is valid (urn:uuid, resourceType/id)

Produces `"source": "Reference"` errors.

### 3.6 Step 6 – Error Aggregation
Merges:
- **STRUCTURE errors** (Phase 1) — Pre-POCO grammar
- Firely errors — POCO model validation
- Rule engine errors — Business rules
- CodeMaster errors — Terminology validation
- Reference errors — Resource references

Each error is normalized into a common intermediate structure:
```
{
  type, severity, resourceType, path, errorCode, message, rawPath, details
}
```

### 3.7 Step 7 – Smart Path Navigation Mapping
SmartPathNavigationService converts:
- Firely issue “Expression” → JSON Pointer
- Rule DSL “path” → JSON Pointer
**Array Element Precision (Phase 2 Complete):**
- POCO validation: Tracks array indices via `ITypedElement.Location`
- JSON fallback: Navigates ISourceNode tree with recursive indexing
- Both paths produce identical index-aware pointers (e.g., `/entry/0/resource/identifier/1/system`)
Adds:
- breadcrumbs[]
- missingParents[]
- exists flag

### 3.8 Step 8 – Unified Error Model Assembly
Builds the final public-facing format:
```
{
  "source": "...",
  "severity": "...",
  "resourceType": "...",
  "path": "...",
  "jsonPointer": "...",
  "errorCode": "...",
  "message": "...",
  "details": {...}
}
```

### 3.9 Step 9 – API Response
Returns:
- errors[]
- summary (counts by type)
- navigation metadata

---

## 4. Pipeline Guarantees
- Deterministic output
- No bundle mutation
- Full path resolution
- Consistent error model
- Supports project-specific rules without touching backend code

EOF
