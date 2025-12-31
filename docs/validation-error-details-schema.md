# ValidationError.details Schema — FHIR Processor V2

> **Status:** Canonical Contract (December 31, 2025)  
> **Ownership:** Backend defines schema, Frontend renders explanations  
> **Rule:** Frontend MUST NOT infer, parse paths, or inspect bundle JSON

---

## Purpose

This document defines the **canonical JSON schema** for `ValidationError.details` per `errorCode`.

**Contract:**
- Backend emits structured, machine-readable `details`
- Frontend renders human-readable explanations using `errorCode + details` ONLY
- No heuristics, no path parsing, no rule-type switching

---

## Schema Rules

1. **details is OPTIONAL** — may be `null` or `undefined`
2. **If present** — MUST match schema for that `errorCode`
3. **Keys** — only defined keys allowed (no ad-hoc fields)
4. **Values** — strongly typed (no mixed types per key)
5. **No UI text** — no `message`, `explanation`, `description` in details
6. **No paths** — no `jsonPointer`, `path`, array indices

---

## Error Code Schemas

### 1. VALUE_NOT_ALLOWED

**When:** Field value not in allowed set

```typescript
{
  "actual": string | null,      // The value found
  "allowed": string[],           // List of permitted values
  "valueType": string            // Type hint: "string" | "number" | "code"
}
```

**Example:**
```json
{
  "actual": "invalid-status",
  "allowed": ["active", "inactive", "pending"],
  "valueType": "code"
}
```

---

### 2. PATTERN_MISMATCH

**When:** Field value doesn't match regex pattern

```typescript
{
  "actual": string | null,       // The value that failed
  "pattern": string,             // Regex pattern (as string)
  "description"?: string         // Optional human hint (e.g., "Phone number format")
}
```

**Example:**
```json
{
  "actual": "123",
  "pattern": "^[0-9]{4}$",
  "description": "4-digit code required"
}
```

---

### 3. FIXED_VALUE_MISMATCH

**When:** Field must have specific fixed value

```typescript
{
  "actual": string | null,       // The value found
  "expected": string             // The required value
}
```

**Example:**
```json
{
  "actual": "http://wrong.org",
  "expected": "http://required-system.org"
}
```

---

### 4. REQUIRED_FIELD_MISSING

**When:** Required field is absent or null

```typescript
{
  "required": true               // Always true (marker)
}
```

**Example:**
```json
{
  "required": true
}
```

---

### 5. REQUIRED_RESOURCE_MISSING

**When:** Bundle missing required resource type(s)

```typescript
{
  "requiredResourceType": string,    // Expected resource type
  "actualResourceTypes": string[]    // Resource types present in bundle
}
```

**Example:**
```json
{
  "requiredResourceType": "Patient",
  "actualResourceTypes": ["Observation", "Encounter"]
}
```

---

### 6. ARRAY_LENGTH_OUT_OF_RANGE

**When:** Array size violates min/max constraints

```typescript
{
  "min": number | null,          // Minimum allowed (null = no min)
  "max": number | null,          // Maximum allowed (null = no max)
  "actual": number               // Actual array length
}
```

**Example:**
```json
{
  "min": 1,
  "max": 5,
  "actual": 0
}
```

---

### 7. CODESYSTEM_MISMATCH

**When:** Coding.system doesn't match expected system URL

```typescript
{
  "expectedSystem": string,      // Required system URL
  "actualSystem": string | null  // System found (null if missing)
}
```

**Example:**
```json
{
  "expectedSystem": "http://loinc.org",
  "actualSystem": "http://snomed.info/sct"
}
```

---

### 8. CODE_NOT_IN_VALUESET

**When:** Code not found in expected valueset/codeset

```typescript
{
  "system": string,              // System URL
  "code": string,                // Code value
  "valueSet": string             // ValueSet/CodeSet identifier
}
```

**Example:**
```json
{
  "system": "http://loinc.org",
  "code": "99999-9",
  "valueSet": "observation-codes-v1"
}
```

---

### 9. REFERENCE_NOT_FOUND

**When:** Reference points to non-existent resource

```typescript
{
  "reference": string,               // Reference string (e.g., "Patient/123")
  "expectedType": string | null      // Expected target type (null if any)
}
```

**Example:**
```json
{
  "reference": "Patient/missing-id",
  "expectedType": "Patient"
}
```

---

### 10. FHIR_INVALID_PRIMITIVE

**When:** Primitive value fails FHIR datatype validation

```typescript
{
  "actual": string,              // The invalid value
  "expectedType": string,        // FHIR type (e.g., "dateTime", "decimal")
  "reason": string               // Why it failed
}
```

**Example:**
```json
{
  "actual": "2023-13-45",
  "expectedType": "dateTime",
  "reason": "Invalid month value"
}
```

---

### 11. FHIR_ARRAY_EXPECTED

**When:** Field should be array but is single value (spec hint)

```typescript
{
  "expectedType": "array",       // Always "array"
  "actualType": string           // Type found (e.g., "object", "string")
}
```

**Example:**
```json
{
  "expectedType": "array",
  "actualType": "object"
}
```

---

### 12. REFERENCE_TYPE_MISMATCH

**When:** Referenced resource type doesn't match expected type(s)

```typescript
{
  "reference": string,               // Reference string
  "expectedTypes": string[],         // Allowed target types
  "actualType": string               // Actual target type
}
```

**Example:**
```json
{
  "reference": "Observation/123",
  "expectedTypes": ["Patient", "Group"],
  "actualType": "Observation"
}
```

---

### 13. QUESTIONANSWER_VIOLATION

**When:** Observation component violates question/answer contract

```typescript
{
  "violation": "question" | "answer" | "cardinality",
  "questionCode": string | null,     // Question code (if relevant)
  "answerCode": string | null,       // Answer code (if relevant)
  "expectedCardinality": string | null  // "single" | "multiple" (if relevant)
}
```

**Example:**
```json
{
  "violation": "answer",
  "questionCode": "Q001",
  "answerCode": "INVALID_ANS",
  "expectedCardinality": null
}
```

---

## Frontend Contract

**MUST:**
- Use `errorCode` to select explanation template
- Cast `details` to typed schema
- Render human-readable explanation

**MUST NOT:**
- Parse `jsonPointer` or `path`
- Infer array indices
- Read raw bundle JSON
- Switch on rule type
- Contain business logic

**Example Frontend Logic:**
```typescript
function explainError(error: ValidationError): string {
  switch (error.errorCode) {
    case "VALUE_NOT_ALLOWED": {
      const d = error.details as ValueNotAllowedDetails;
      return `Value "${d.actual}" not allowed. Permitted: ${d.allowed.join(", ")}`;
    }
    case "REQUIRED_FIELD_MISSING":
      return "This field is required but was not provided";
    default:
      return "Validation error";
  }
}
```

---

## Backend Contract

**MUST:**
- Emit `details` matching schema for `errorCode`
- Validate schema at runtime (throw in Development, log in Production)
- Never emit:
  - UI text in `details`
  - JSON paths
  - Ad-hoc keys
  - Legacy fields (`message`, `violationType`, etc.)

**Runtime Validation:**
```csharp
ValidationErrorDetailsValidator.Validate(errorCode, details);
// Throws InvalidOperationException if schema violated (Development)
// Logs warning (Production)
```

---

## Migration Notes

**Old pattern (PROHIBITED):**
```json
{
  "details": {
    "message": "Value not allowed",
    "expectedValue": "X",
    "actualValue": "Y",
    "violationType": "value"
  }
}
```

**New pattern (REQUIRED):**
```json
{
  "errorCode": "FIXED_VALUE_MISMATCH",
  "details": {
    "expected": "X",
    "actual": "Y"
  }
}
```

---

## Validation Rules Summary

| errorCode | Required Keys | Optional Keys | Value Types |
|-----------|---------------|---------------|-------------|
| VALUE_NOT_ALLOWED | actual, allowed, valueType | - | string/null, string[], string |
| PATTERN_MISMATCH | actual, pattern | description | string/null, string, string |
| FIXED_VALUE_MISMATCH | actual, expected | - | string/null, string |
| REQUIRED_FIELD_MISSING | required | - | boolean |
| REQUIRED_RESOURCE_MISSING | requiredResourceType, actualResourceTypes | - | string, string[] |
| ARRAY_LENGTH_OUT_OF_RANGE | min, max, actual | - | number/null, number/null, number |
| CODESYSTEM_MISMATCH | expectedSystem, actualSystem | - | string, string/null |
| CODE_NOT_IN_VALUESET | system, code, valueSet | - | string, string, string |
| REFERENCE_NOT_FOUND | reference | expectedType | string, string/null |
| FHIR_INVALID_PRIMITIVE | actual, expectedType, reason | - | string, string, string |
| FHIR_ARRAY_EXPECTED | expectedType, actualType | - | string, string |
| REFERENCE_TYPE_MISMATCH | reference, expectedTypes, actualType | - | string, string[], string |
| QUESTIONANSWER_VIOLATION | violation | questionCode, answerCode, expectedCardinality | string, string/null×3 |

---

## Extension Policy

**Adding new errorCode:**
1. Define schema in this document
2. Add to `ValidationErrorDetailsValidator`
3. Add to frontend TypeScript types
4. Add to frontend explanation registry
5. Add unit tests (backend + frontend)

**DO NOT:**
- Create errorCode without schema
- Add ad-hoc details fields
- Mix concerns (one errorCode, one schema)

---

**Contract Owner:** Backend Team  
**Last Updated:** December 31, 2025  
**Next Review:** On new errorCode additions
