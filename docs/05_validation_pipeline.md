
# 05. Validation Pipeline Specification — FHIR Processor V2

## 1. Overview
The Validation Pipeline is the orchestrated backend workflow that processes:
- the FHIR Bundle
- business validation rules
- CodeSystems/CodeMaster
- reference integrity
- navigation resolution
- unified error model

The pipeline ensures correctness, determinism, and consistency across projects.

## 2. Pipeline Execution Order (Strict)
1. **Input Parsing**
2. **Firely Structural Validation**
3. **FHIRPath Business Rule Validation**
4. **CodeMaster Validation**
5. **Reference Validation**
6. **Error Aggregation**
7. **Smart Path Navigation Mapping**
8. **Unified Error Model Assembly**
9. **Final API Response**

Each step always runs in this order. Steps may be skipped only if inputs are absent.

---

## 3. Step Details

### 3.1 Step 1 – Input Parsing
- Accepts raw JSON bundle + rules + codes
- Verifies JSON structure
- Wraps the bundle into `BundleWrapper`
- Extracts resource indexes for use by navigation engine

### 3.2 Step 2 – Firely Structural Validation
Firely Validator checks:
- Cardinality (min/max)
- Datatype correctness
- Slice constraints
- FHIR invariants
- Element presence
- Terminology if IG is loaded (optional)

Produces Firely `OperationOutcome.issue[]`.

No PSS or business rules are evaluated here.

### 3.3 Step 3 – Business Rule Validation (FHIRPath)
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
- Firely errors
- Rule engine errors
- CodeMaster errors
- Reference errors

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
