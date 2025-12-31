# Canonical ValidationError.details Schema Implementation Plan

> **Status:** In Progress  
> **Created:** December 31, 2025  
> **Contract:** /docs/validation-error-details-schema.md  
> **Validator:** ValidationErrorDetailsValidator.cs

---

## ✅ Completed

### Phase 1: Contract Definition
- [x] Created `/docs/validation-error-details-schema.md` - Canonical schema for 13 errorCodes
- [x] Created `ValidationErrorDetailsValidator.cs` - Runtime schema validation
- [x] Defined validation rules for all errorCodes
- [x] Set up throw-in-dev, log-in-prod pattern

---

## 🚧 Backend Implementation (In Progress)

### Phase 2: Integrate Validator

**File:** `RuleValidationError.cs`

Add validation call in constructor/setter:

```csharp
public Dictionary<string, object>? Details
{
    get => _details;
    set
    {
        _details = value;
        if (_details != null && !string.IsNullOrEmpty(ErrorCode))
        {
            ValidationErrorDetailsValidator.Validate(ErrorCode, _details);
        }
    }
}
```

**Status:** ⏳ Not implemented

---

### Phase 3: Normalize Error Emission

Need to audit and update all error creation points to emit canonical schema.

#### 3.1 FhirPathRuleEngine.cs

**Locations to update:**

| Method | ErrorCode | Current Details | Target Schema |
|--------|-----------|----------------|---------------|
| ValidateRequired | REQUIRED_FIELD_MISSING | ❌ Mixed | ✅ `{required: true}` |
| ValidateAllowedValues | VALUE_NOT_ALLOWED | ⚠️ Partial | ✅ `{actual, allowed, valueType}` |
| ValidateRegex | PATTERN_MISMATCH | ⚠️ Partial | ✅ `{actual, pattern, description?}` |
| ValidateFixedValue | FIXED_VALUE_MISMATCH | ⚠️ Partial | ✅ `{actual, expected}` |
| ValidateCodeSystemAsync | CODESYSTEM_VIOLATION | ❌ Mixed | ✅ `{expectedSystem, actualSystem}` or `{system, code, valueSet}` |
| ValidateArrayLength | ARRAY_LENGTH_OUT_OF_RANGE | ⚠️ Partial | ✅ `{min, max, actual}` |
| ValidateRequiredResources | REQUIRED_RESOURCE_MISSING | ❌ Mixed | ✅ `{requiredResourceType, actualResourceTypes}` |

**Current Issues:**
- Details contain ad-hoc keys: `source`, `resourceType`, `path`, `ruleType`, `ruleId`, `explanation`
- These should be moved to top-level error properties or removed
- `explanation` is UI text (violates contract)

**Target Pattern:**
```csharp
errors.Add(new RuleValidationError
{
    RuleId = rule.Id,
    RuleType = rule.Type,
    Severity = rule.Severity,
    ResourceType = rule.ResourceType,
    FieldPath = rule.FieldPath,
    ErrorCode = "VALUE_NOT_ALLOWED",  // ← Canonical errorCode
    Details = new Dictionary<string, object>   // ← Canonical schema only
    {
        ["actual"] = actualValue,
        ["allowed"] = allowedValues,
        ["valueType"] = "string"
    },
    EntryIndex = entryIndex,
    ResourceId = resource.Id
});
```

**Status:** ⏳ Not implemented

---

#### 3.2 ReferenceResolver.cs

**Locations:**

| Method | ErrorCode | Current Details | Target Schema |
|--------|-----------|----------------|---------------|
| ValidateResourceReferences | REFERENCE_NOT_FOUND | ❌ Mixed | ✅ `{reference, expectedType?}` |
| ValidateResourceReferences | REFERENCE_TYPE_MISMATCH | ❌ Mixed | ✅ `{reference, expectedTypes, actualType}` |

**Current Issues:**
- Details contain: `source`, `resourceType`, `path`, `reference`, `expectedTypes`, `actualType`
- Need to clean up to canonical schema only

**Status:** ⏳ Not implemented

---

#### 3.3 CodeMasterEngine.cs

**Locations:**

| Method | ErrorCode | Target Schema |
|--------|-----------|---------------|
| ValidateComponent | QUESTIONANSWER_VIOLATION | ✅ `{violation, questionCode?, answerCode?, expectedCardinality?}` |

**Note:** QuestionAnswer contract already defines this schema, but need to verify compliance.

**Status:** ⏳ Needs audit

---

#### 3.4 FirelyValidationService.cs

**Locations:**

| Method | ErrorCode | Target Schema |
|--------|-----------|---------------|
| MapFirelyError | FHIR_INVALID_PRIMITIVE | ✅ `{actual, expectedType, reason}` |
| MapFirelyError | FHIR_ARRAY_EXPECTED | ✅ `{expectedType: "array", actualType}` |

**Status:** ⏳ Needs audit

---

### Phase 4: Remove Legacy Fields from Details

**PROHIBITED keys in details:**
- ❌ `source` - use top-level property
- ❌ `resourceType` - use `ResourceType` property
- ❌ `path` / `fieldPath` - use `FieldPath` property
- ❌ `ruleType` - use `RuleType` property
- ❌ `ruleId` - use `RuleId` property
- ❌ `explanation` - UI text, violates contract
- ❌ `message` - UI text, violates contract
- ❌ `entryIndex` - use `EntryIndex` property
- ❌ `arrayIndex` - internal hint, removed by UnifiedErrorModelBuilder
- ❌ `_precomputedJsonPointer` - internal hint, removed by UnifiedErrorModelBuilder

**ALLOWED internal hints** (consumed by UnifiedErrorModelBuilder, removed before API response):
- ✅ `arrayIndex` - Phase 2 POCO array index hint
- ✅ `_precomputedJsonPointer` - MVP JSON fallback pointer

**Status:** ⏳ Not implemented

---

## 🎨 Frontend Implementation (Pending Backend Completion)

### Phase 5: TypeScript Discriminated Union

**File:** `frontend/src/types/validation.ts` (or similar)

```typescript
// Base error type
export interface ValidationError {
  source: "FHIR" | "Business" | "CodeMaster" | "Reference";
  severity: "error" | "warning" | "info";
  resourceType: string;
  path: string;
  jsonPointer: string;
  errorCode: string;
  message?: string;  // Deprecated, use explanation registry
  details?: ValidationErrorDetails;
  navigation?: {
    breadcrumbs: string[];
    exists: boolean;
    missingParents: string[];
  };
}

// Discriminated union for details
export type ValidationErrorDetails =
  | { errorCode: "VALUE_NOT_ALLOWED"; actual: string | null; allowed: string[]; valueType: string }
  | { errorCode: "PATTERN_MISMATCH"; actual: string | null; pattern: string; description?: string }
  | { errorCode: "FIXED_VALUE_MISMATCH"; actual: string | null; expected: string }
  | { errorCode: "REQUIRED_FIELD_MISSING"; required: true }
  | { errorCode: "REQUIRED_RESOURCE_MISSING"; requiredResourceType: string; actualResourceTypes: string[] }
  | { errorCode: "ARRAY_LENGTH_OUT_OF_RANGE"; min: number | null; max: number | null; actual: number }
  | { errorCode: "CODESYSTEM_MISMATCH"; expectedSystem: string; actualSystem: string | null }
  | { errorCode: "CODE_NOT_IN_VALUESET"; system: string; code: string; valueSet: string }
  | { errorCode: "REFERENCE_NOT_FOUND"; reference: string; expectedType?: string | null }
  | { errorCode: "REFERENCE_TYPE_MISMATCH"; reference: string; expectedTypes: string[]; actualType: string }
  | { errorCode: "FHIR_INVALID_PRIMITIVE"; actual: string; expectedType: string; reason: string }
  | { errorCode: "FHIR_ARRAY_EXPECTED"; expectedType: "array"; actualType: string }
  | { errorCode: "QUESTIONANSWER_VIOLATION"; violation: "question" | "answer" | "cardinality"; questionCode?: string | null; answerCode?: string | null; expectedCardinality?: string | null };
```

**Status:** ⏳ Not implemented

---

### Phase 6: Explanation Registry

**File:** `frontend/src/utils/errorExplanations.ts` (or similar)

```typescript
type ExplanationFn = (details?: unknown) => {
  title: string;
  description: string;
};

export const explanationRegistry: Record<string, ExplanationFn> = {
  VALUE_NOT_ALLOWED: (d) => {
    const details = d as Extract<ValidationErrorDetails, { errorCode: "VALUE_NOT_ALLOWED" }>;
    return {
      title: "Value Not Allowed",
      description: `The value "${details.actual}" is not permitted. Allowed values: ${details.allowed.join(", ")}.`
    };
  },
  
  PATTERN_MISMATCH: (d) => {
    const details = d as Extract<ValidationErrorDetails, { errorCode: "PATTERN_MISMATCH" }>;
    return {
      title: "Pattern Mismatch",
      description: details.description 
        ? `Value "${details.actual}" does not match required pattern: ${details.description}`
        : `Value "${details.actual}" does not match required pattern: ${details.pattern}`
    };
  },
  
  FIXED_VALUE_MISMATCH: (d) => {
    const details = d as Extract<ValidationErrorDetails, { errorCode: "FIXED_VALUE_MISMATCH" }>;
    return {
      title: "Fixed Value Mismatch",
      description: `Expected "${details.expected}" but found "${details.actual}".`
    };
  },
  
  REQUIRED_FIELD_MISSING: () => ({
    title: "Required Field Missing",
    description: "This field is required but was not provided."
  }),
  
  // ... (complete for all errorCodes)
};

export function explainError(error: ValidationError): { title: string; description: string } {
  const explainer = explanationRegistry[error.errorCode];
  
  if (!explainer) {
    console.warn(`Unknown errorCode: ${error.errorCode}`);
    return {
      title: "Validation Error",
      description: error.message || "A validation error occurred."
    };
  }
  
  return explainer(error.details);
}
```

**Status:** ⏳ Not implemented

---

### Phase 7: UI Integration

Update error rendering components to:
- Use `explainError(error)` instead of reading `error.message`
- Remove path parsing logic
- Remove rule-type switching
- Remove bundle JSON inspection

**Files to update:**
- Error list components
- Error detail panels
- Validation result summaries

**Status:** ⏳ Not implemented

---

## 🧪 Testing Requirements

### Backend Tests (Pending)

**File:** `ValidationErrorDetailsValidatorTests.cs`

```csharp
[Fact]
public void ValueNotAllowed_ValidSchema_PassesValidation()
{
    var details = new Dictionary<string, object>
    {
        ["actual"] = "invalid",
        ["allowed"] = new[] { "valid1", "valid2" },
        ["valueType"] = "string"
    };
    
    // Should not throw
    ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details);
}

[Fact]
public void ValueNotAllowed_MissingAllowed_ThrowsInDevelopment()
{
    var details = new Dictionary<string, object>
    {
        ["actual"] = "invalid",
        ["valueType"] = "string"
    };
    
    #if DEBUG
    Assert.Throws<InvalidOperationException>(() =>
        ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
    );
    #endif
}
```

**Status:** ⏳ Not implemented

---

### Frontend Tests (Pending)

**File:** `errorExplanations.test.ts`

```typescript
describe("explanationRegistry", () => {
  it("VALUE_NOT_ALLOWED renders correct explanation", () => {
    const error: ValidationError = {
      errorCode: "VALUE_NOT_ALLOWED",
      details: {
        actual: "invalid",
        allowed: ["valid1", "valid2"],
        valueType: "string"
      }
    };
    
    const result = explainError(error);
    
    expect(result.title).toBe("Value Not Allowed");
    expect(result.description).toContain("invalid");
    expect(result.description).toContain("valid1, valid2");
  });
  
  it("unknown errorCode shows fallback", () => {
    const error: ValidationError = {
      errorCode: "UNKNOWN_CODE",
      message: "Fallback message"
    };
    
    const result = explainError(error);
    
    expect(result.title).toBe("Validation Error");
    expect(result.description).toBe("Fallback message");
  });
});
```

**Status:** ⏳ Not implemented

---

## 📊 Progress Tracking

| Phase | Status | Completion |
|-------|--------|------------|
| 1. Contract Definition | ✅ Complete | 100% |
| 2. Integrate Validator | ⏳ Pending | 0% |
| 3. Normalize FhirPathRuleEngine | ⏳ Pending | 0% |
| 3.2 Normalize ReferenceResolver | ⏳ Pending | 0% |
| 3.3 Audit CodeMasterEngine | ⏳ Pending | 0% |
| 3.4 Audit FirelyValidationService | ⏳ Pending | 0% |
| 4. Remove Legacy Fields | ⏳ Pending | 0% |
| 5. TypeScript Types | ⏳ Pending | 0% |
| 6. Explanation Registry | ⏳ Pending | 0% |
| 7. UI Integration | ⏳ Pending | 0% |
| 8. Backend Tests | ⏳ Pending | 0% |
| 9. Frontend Tests | ⏳ Pending | 0% |

**Overall Progress:** 10% (1/10 phases complete)

---

## 🚫 Breaking Changes

This refactor introduces breaking changes to `ValidationError.details` structure:

**Before:**
```json
{
  "details": {
    "source": "ProjectRule",
    "resourceType": "Patient",
    "path": "identifier.system",
    "ruleType": "AllowedValues",
    "ruleId": "rule-001",
    "actual": "invalid",
    "allowed": ["valid1", "valid2"],
    "explanation": "Value not allowed"
  }
}
```

**After:**
```json
{
  "details": {
    "actual": "invalid",
    "allowed": ["valid1", "valid2"],
    "valueType": "string"
  }
}
```

**Migration:** Frontend must update to use explanation registry instead of reading ad-hoc details keys.

---

## 📝 Next Steps

1. **Backend Lead:** Implement Phase 2 (validator integration)
2. **Backend Team:** Update error emission points (Phase 3)
3. **Frontend Lead:** Implement TypeScript types (Phase 5)
4. **Frontend Team:** Build explanation registry (Phase 6)
5. **QA:** Write comprehensive tests (Phase 8-9)

---

**Document Owner:** Backend Team  
**Last Updated:** December 31, 2025  
**Next Review:** After Phase 3 completion
