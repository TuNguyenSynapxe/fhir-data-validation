# Template-Based Validation Explanations — Implementation Guide

## Design Principles

### ✅ DO
- Use strict template matching
- Inject values only when present in metadata
- Mark confidence explicitly
- Keep explanations deterministic
- Omit sections gracefully when data is missing

### ❌ DO NOT
- Guess intent
- Repeat the error message
- Say "review the rule"
- Invent examples unless fully deterministic
- Change validation logic

---

## Confidence Matrix

| Rule Type | Confidence | Rationale |
|-----------|------------|-----------|
| **Required** | `high` | Presence validation is deterministic |
| **FixedValue** | `high` | Exact match validation is deterministic |
| **AllowedValues** | `high` | Enumeration validation is deterministic |
| **ArrayLength** | `high` | Cardinality validation is deterministic |
| **Regex** | `medium` | Pattern validation requires context |
| **CodeSystem** | `medium` | Terminology binding requires context |
| **CustomFHIRPath** | `low` | Cannot explain arbitrary conditions |
| **FHIR Structural** | `high` | FHIR spec is deterministic |
| **Lint / SpecHint** | `low` | Heuristic checks, advisory only |
| **Reference** | `high` | Bundle integrity is deterministic |

---

## Template Registry

### 1. Required Field

**Confidence**: `high`

```
What:
This rule requires the field `{path}` to be present.

How:
The field `{path}` is missing or empty in this resource.
Add a value to satisfy the requirement.
```

**Metadata Used**:
- `path` (required)

---

### 2. Fixed Value

**Confidence**: `high`

```
What:
This rule enforces a fixed value for `{path}` to ensure consistent data.

How:
Expected value: {expectedValue}
Actual value: {actualValue}
Update the field to match the expected value.
```

**Metadata Used**:
- `path` (required)
- `expectedValue` or `fixedValue` (optional)
- `actualValue` (optional)

---

### 3. Allowed Values

**Confidence**: `high`

```
What:
This rule restricts `{path}` to a predefined set of allowed values.

How:
The value `{actualValue}` is not allowed.
Choose one of the permitted values:
  - {value1}
  - {value2}
  - ...
```

**Metadata Used**:
- `path` (required)
- `actualValue` (optional)
- `allowedValues` (optional array)

---

### 4. Regex Pattern

**Confidence**: `medium`

```
What:
This rule validates the format of `{path}`.

How:
The value does not match the required format.
Expected pattern: {regex}
```

**Metadata Used**:
- `path` (required)
- `regex` or `pattern` (optional)

⚠️ **Do NOT attempt to explain regex semantics**.

---

### 5. Array Length

**Confidence**: `high`

```
What:
This rule enforces how many items `{path}` may contain.

How:
Current item count: {actualCount}
Allowed range: {min} to {max}
Adjust the number of items to meet this requirement.
```

**Metadata Used**:
- `path` (required)
- `actualCount` (optional)
- `min` (optional)
- `max` (optional)

---

### 6. Code System

**Confidence**: `medium`

```
What:
This rule ensures `{path}` uses codes from the correct code system.

How:
Expected code system: {codeSystem}
Verify that `coding.system` and `coding.code` are valid.
```

**Metadata Used**:
- `path` (required)
- `codeSystem` or `systemUrl` (optional)

---

### 7. Custom FHIRPath

**Confidence**: `low`

```
What:
This rule validates a project-specific condition involving `{path}`.

How:
The condition defined for this rule is not satisfied.
Review the related data and ensure the condition is met.
```

**Metadata Used**:
- `path` (required)

⚠️ **Do NOT attempt to describe the condition** unless a human-readable form is provided.

---

### 8. FHIR Structural Validation

**Confidence**: `high`

```
What:
This issue was detected during FHIR structural validation.

How:
The resource does not conform to the FHIR specification at this location.
Correct the data type or structure indicated by the error.
```

**Metadata Used**: None required.

---

### 9. Lint / SpecHint

**Confidence**: `low`

```
What:
This is a best-effort quality check to improve portability and correctness.

How:
This issue may still be accepted by permissive FHIR engines.
Review and correct it if interoperability is required.
```

**Metadata Used**: None required.

---

### 10. Reference Validation

**Confidence**: `high`

**Pattern A: REFERENCE_NOT_FOUND**
```
What:
The reference at '{path}' points to a resource that does not exist in the bundle.

How:
Ensure the referenced resource is included in the bundle,
or use an external reference if appropriate.
```

**Pattern B: REFERENCE_TYPE_MISMATCH**
```
What:
The referenced resource type does not match the expected type for this field.

How:
Change the reference to point to the correct resource type,
or verify the resource type is allowed.
```

**Pattern C: Fallback**
```
What:
This reference validation issue was detected during bundle integrity checks.

How:
Verify that all references point to valid resources of the correct type.
```

**Metadata Used**:
- `path` (optional)
- `errorCode` (optional)

---

## Metadata Contract

### Required Fields
- `path`: FHIRPath or JSON path to the validated field

### Optional Fields (Rule-Specific)
| Field | Used By | Purpose |
|-------|---------|---------|
| `expectedValue` / `fixedValue` | FixedValue | Expected constant value |
| `actualValue` | FixedValue, AllowedValues | Current value in resource |
| `allowedValues` | AllowedValues | Array of permitted values |
| `regex` / `pattern` | Regex | Validation pattern |
| `min` | ArrayLength | Minimum cardinality |
| `max` | ArrayLength | Maximum cardinality |
| `actualCount` | ArrayLength | Current number of items |
| `codeSystem` / `systemUrl` | CodeSystem | Expected terminology system |

---

## Implementation Details

### Service Architecture

```csharp
public static class ValidationExplanationService
{
    // Entry points for each validation source
    public static ValidationIssueExplanation? ForFhirStructural(...)
    public static ValidationIssueExplanation ForSpecHint(...)
    public static ValidationIssueExplanation ForLint(...)
    public static ValidationIssueExplanation ForReference(...)
    public static ValidationIssueExplanation ForProjectRule(...)
    
    // Template registry
    private static ValidationIssueExplanation GenerateFromTemplate(...)
    
    // Individual template generators
    private static ValidationIssueExplanation GenerateRequiredExplanation(...)
    private static ValidationIssueExplanation GenerateFixedValueExplanation(...)
    private static ValidationIssueExplanation GenerateAllowedValuesExplanation(...)
    // ... etc
}
```

### Graceful Degradation

When metadata is missing:
- ✅ Still generate a "What" explanation
- ✅ Omit specific details (e.g., actual value)
- ✅ Provide general guidance in "How"
- ❌ Do NOT leave blank or say "N/A"

Example:
```csharp
// With metadata
What: This rule restricts `Patient.gender` to a predefined set of allowed values.
How: The value `unknown` is not allowed.
     Choose one of the permitted values:
       - male
       - female
       - other

// Without metadata
What: This rule restricts `Patient.gender` to a predefined set of allowed values.
How: Choose one of the permitted values defined in the rule.
```

---

## Integration Points

### 1. UnifiedErrorModelBuilder

All error sources populate explanations:

```csharp
// FHIR Structural
Explanation = ValidationExplanationService.ForFhirStructural(errorCode, path, details)

// Project Rules
Explanation = ValidationExplanationService.ForProjectRule(ruleType, path, ruleExplanation, metadata)

// Reference Validation
Explanation = ValidationExplanationService.ForReference(errorCode, path, details)

// Lint
Explanation = ValidationExplanationService.ForLint(ruleId, message)

// SpecHint
Explanation = ValidationExplanationService.ForSpecHint(reason, path)
```

### 2. RuleExplanation Model

For rule authoring (future use):

```csharp
public class RuleExplanation
{
    public required string What { get; set; }
    public string? How { get; set; }
}
```

When a user creates a rule:
1. **Auto-generate** explanation from rule type
2. **Allow editing** before saving
3. **Store** in rule metadata
4. **NOT exported** to IG (only message exported)
5. **Always "high" confidence** for user-defined rules

---

## Testing Strategy

### Unit Tests

```csharp
[Fact]
public void Required_WithPath_GeneratesHighConfidenceExplanation()
{
    var explanation = ValidationExplanationService.ForProjectRule(
        ruleType: "Required",
        path: "Patient.gender",
        ruleExplanation: null,
        metadata: null
    );
    
    Assert.Equal("high", explanation.Confidence);
    Assert.Contains("Patient.gender", explanation.What);
    Assert.NotNull(explanation.How);
}

[Fact]
public void FixedValue_WithMetadata_InjectsExpectedAndActual()
{
    var metadata = new Dictionary<string, object>
    {
        ["expectedValue"] = "male",
        ["actualValue"] = "female"
    };
    
    var explanation = ValidationExplanationService.ForProjectRule(
        ruleType: "FixedValue",
        path: "Patient.gender",
        ruleExplanation: null,
        metadata: metadata
    );
    
    Assert.Contains("male", explanation.How);
    Assert.Contains("female", explanation.How);
}

[Fact]
public void AllowedValues_WithoutMetadata_GeneratesGenericGuidance()
{
    var explanation = ValidationExplanationService.ForProjectRule(
        ruleType: "AllowedValues",
        path: "Patient.maritalStatus",
        ruleExplanation: null,
        metadata: null
    );
    
    Assert.NotNull(explanation.How);
    Assert.DoesNotContain("The value", explanation.How); // No specific value mentioned
}
```

### Integration Tests

```bash
# Validate with project containing Required rule
curl -X POST http://localhost:5000/api/projects/{id}/validate -d '{"mode":"full"}'

# Verify explanation structure
jq '.errors[0].explanation' response.json
{
  "what": "This rule requires the field `Patient.gender` to be present.",
  "how": "The field `Patient.gender` is missing or empty in this resource. Add a value to satisfy the requirement.",
  "confidence": "high"
}
```

---

## Frontend Display

### Confidence-Based Rendering

| Confidence | Display Logic |
|------------|---------------|
| `high` | Show "What" + "How" + confidence badge |
| `medium` | Show "What" + "How" + confidence badge |
| `low` | Show "What" only + disclaimer |

### Low Confidence Disclaimer

```
Note: This is a heuristic check with low confidence.
Manual review recommended.
```

---

## Future Enhancements

### 1. Token Replacement

Support template tokens in custom rule explanations:

```
What: This rule requires {resource}.{path} to be present.
How: Add a value for {path}. Example: "{leaf}": "<value>"
```

Tokens:
- `{resource}` → Resource type (e.g., "Patient")
- `{path}` → Full path (e.g., "Patient.gender")
- `{leaf}` → Leaf field (e.g., "gender")
- `{expectedValue}` → Fixed value
- `{allowedValues}` → List of permitted values
- `{min}`, `{max}` → Cardinality bounds
- `{regex}` → Pattern string
- `{codeSystem}` → Code system URL

### 2. Localization

Template registry supports multiple languages:

```csharp
private static ValidationIssueExplanation GenerateRequiredExplanation(
    string path, 
    string language = "en")
{
    return language switch
    {
        "en" => new ValidationIssueExplanation { ... },
        "fr" => new ValidationIssueExplanation { ... },
        _ => GenerateRequiredExplanation(path, "en") // Fallback
    };
}
```

### 3. Grouped Explanations

Detect repeated patterns (e.g., 50 Lint issues with same "What"):
- Show shared explanation once at group level
- Individual messages remain unique
- Improves UI readability

---

## Maintenance

### Adding New Templates

1. **Add to confidence matrix** (above)
2. **Define template wording** (follow existing format)
3. **Implement generator method** (private static)
4. **Add to template registry** (GenerateFromTemplate switch)
5. **Write unit tests** (positive + negative cases)
6. **Update documentation** (this file)

### Modifying Templates

1. **Review impact** on existing explanations
2. **Update template wording** (this file)
3. **Update generator method** (ValidationExplanationService.cs)
4. **Update tests** if assertions changed
5. **Document change** in changelog

---

## Anti-Patterns

### ❌ BAD: Repeating the error message
```csharp
What = error.Message; // DON'T DO THIS
```

### ✅ GOOD: Explaining the constraint
```csharp
What = "This rule requires the field `{path}` to be present.";
```

---

### ❌ BAD: Guessing intent
```csharp
How = "You probably want to add a gender value because patients need gender.";
```

### ✅ GOOD: Stating facts
```csharp
How = "The field `{path}` is missing or empty. Add a value to satisfy the requirement.";
```

---

### ❌ BAD: Saying "review the rule"
```csharp
How = "Review the rule definition in the rules file.";
```

### ✅ GOOD: Providing actionable guidance
```csharp
How = "Choose one of the permitted values: male, female, other.";
```

---

### ❌ BAD: Inventing examples
```csharp
How = "Example: \"gender\": \"male\" (or try \"female\" or \"non-binary\")";
```

### ✅ GOOD: Deterministic examples only
```csharp
// Only when actual/expected values are in metadata
How = $"Expected value: {expectedValue}\nUpdate the field to match.";
```

---

## Changelog

### 2025-12-21 — Initial Implementation
- ✅ Created template registry with 10 rule types
- ✅ Implemented confidence-based generation
- ✅ Graceful degradation for missing metadata
- ✅ Backward compatible (optional explanations)
- ✅ Build succeeded with 0 errors

---

## References

- `/docs/08_unified_error_model.md` — Error model specification
- `ValidationIssueExplanation.cs` — Model definition
- `ValidationExplanationService.cs` — Template implementation
- `UnifiedErrorModelBuilder.cs` — Integration points
