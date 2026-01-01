# JSON Node Validation Coverage Report
**Generated:** 2025-12-31  
**Scope:** Pre-Firely validation enforcement audit  
**Type:** READ-ONLY baseline assessment

---

## Summary Table

| Category | Coverage | Enforcement Layer | Notes |
|----------|----------|-------------------|-------|
| Enum validation | ⚠️ **Partial** | Firely (strict parse only) | Caught only if strict parsing attempted; silent skip if lenient used first |
| Primitive formats | ⚠️ **Partial** | Firely (POCO parse) + Lint (advisory) | No JSON node enforcement; Firely throws, Lint warns |
| Array vs object | ✅ **Yes** | Lint (advisory) | LintValidationService detects schema violations (LINT_004, LINT_005) |
| Cardinality (min/max) | ❌ **No** | Project Rules + Firely only | No JSON node cardinality checks; schema-driven checks are Lint-level only |
| Required fields | ⚠️ **Partial** | Project Rules + Lint (advisory) | Required rule type exists; Lint checks FHIR schema required fields |
| Unknown elements | ✅ **Yes** | Lint (advisory) | Detected via `AcceptUnknownMembers = false` in strict parse |
| Multi-error support | ✅ **Yes** | ValidateJsonAsync | ISourceNode validation returns all errors in one pass |
| jsonPointer accuracy | ✅ **Yes** | NavigateToPathInSourceNodeAll | Array indices preserved; format: `/entry/N/resource/field/index` |

---

## Detailed Findings

### 🔹 Category: Enum Validation

**Coverage:** ⚠️ **Partial**

**Code Path:**
- **File:** ValidationPipeline.cs → ParseBundleWithContext()
- **Lines:** 446-505
- **Detection Logic:**
  1. Try strict parsing first: `AllowUnrecognizedEnums = false`
  2. If strict fails, catch exception and map via `FirelyExceptionMapper.MapToValidationError()`
  3. Fall back to lenient: `AllowUnrecognizedEnums = true`
  4. Lenient parse succeeds, bundle returned for downstream processing

**Strict Parser Configuration (Line 448-451):**
```csharp
var strictParser = new FhirJsonParser(new ParserSettings
{
    AcceptUnknownMembers = false,
    AllowUnrecognizedEnums = false  // ← Catches "malex"
});
```

**Lenient Parser Configuration (Line 483-486):**
```csharp
var parser = new FhirJsonParser(new ParserSettings
{
    AcceptUnknownMembers = true,
    AllowUnrecognizedEnums = true  // ← Accepts "malex" silently
});
```

**FirelyExceptionMapper Pattern (FirelyExceptionMapper.cs, lines 33-43):**
```csharp
var enumMatch = Regex.Match(exceptionMessage, 
    @"Literal '([^']+)' is not a valid value for enumeration '([^']+)'(?:\s*\(at\s+([^\)]+)\))?",
    RegexOptions.IgnoreCase);

if (enumMatch.Success)
{
    var invalidValue = enumMatch.Groups[1].Value;      // "malex"
    var enumType = enumMatch.Groups[2].Value;          // "AdministrativeGender"
    var location = enumMatch.Groups[3].Success ? enumMatch.Groups[3].Value : null;
    
    return CreateInvalidEnumError(invalidValue, enumType, location, exceptionMessage, rawBundleJson);
}
```

**Example Caught (Strict Parse):**
```json
{ "gender": "male" }  // ✅ Valid enum, passes strict
```

**Example Skipped (Lenient Parse):**
```json
{ "gender": "malex" }  // ⚠️ Caught by strict, mapped to INVALID_ENUM_VALUE, but lenient still accepts
```

**Error Captured:**
- **ErrorCode:** `INVALID_ENUM_VALUE`
- **Canonical Schema:** `{ actual: "malex", allowed: ["male", "female", "other", "unknown"], valueType: "enum" }`
- **Severity:** `error`
- **Source:** `FHIR`

**Reason for Partial Coverage:**
1. **Strict parsing DOES catch enum errors** (ValidationPipeline.cs:453)
2. **Error IS mapped** via FirelyExceptionMapper (ValidationPipeline.cs:489-490)
3. **Bundle with invalid enum still returned** for downstream processing (lenient parse succeeds)
4. **Business rules CAN run** against lenient POCO, but POCO property access throws `InvalidCastException`
5. **Current Issue:** Mapped error has empty `path`/`jsonPointer` when location extraction fails (CreateInvalidEnumError lines 128-136)

**Case Sensitivity:**
- Firely SDK enforces exact enum value match (case-sensitive)
- "Male" ≠ "male" (first would fail strict parse)

**Silent Skip Scenario:**
- If `ValidateJsonAsync()` is used instead of POCO path (FhirPathRuleEngine.cs:148)
- JSON node validation (`ISourceNode`) does NOT validate enum values at all
- Only text values accessible via `node.Text` - no type checking

---

### 🔹 Category: Primitive Format Validation

**Coverage:** ⚠️ **Partial**

**Code Paths:**

1. **Firely POCO Parsing (Authoritative)**
   - **File:** ValidationPipeline.cs → ParseBundleWithContext()
   - **Lines:** 453, 487
   - **Behavior:** Throws exception on invalid date/dateTime/boolean/decimal/integer
   - **Pattern:** FirelyExceptionMapper.cs lines 88-96

2. **Lint Validation (Advisory)**
   - **File:** LintValidationService.cs
   - **Lines:** 28-30 (regex definitions)
   - **Behavior:** Best-effort validation using regex patterns
   - **Rules:** LINT_INVALID_DATE, LINT_INVALID_DATETIME, LINT_INVALID_BOOLEAN, etc.

**Firely Primitive Pattern (FirelyExceptionMapper.cs:88-96):**
```csharp
var invalidPrimitiveMatch = Regex.Match(exceptionMessage,
    @"Literal '([^']+)' cannot be parsed as an? (\w+)",
    RegexOptions.IgnoreCase);

if (invalidPrimitiveMatch.Success)
{
    var invalidValue = invalidPrimitiveMatch.Groups[1].Value;  // "1960-05-15x"
    var expectedType = invalidPrimitiveMatch.Groups[2].Value;  // "date"
    return CreateInvalidPrimitiveError(invalidValue, expectedType, exceptionMessage, rawBundleJson);
}
```

**Lint Regex Patterns (LintValidationService.cs:28-30):**
```csharp
private static readonly Regex DateRegex = new(@"^\d{4}(-\d{2}(-\d{2})?)?$", RegexOptions.Compiled);
private static readonly Regex DateTimeRegex = new(@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$", RegexOptions.Compiled);
private static readonly Regex TimeRegex = new(@"^\d{2}:\d{2}:\d{2}(\.\d+)?$", RegexOptions.Compiled);
```

**Example Caught (Firely):**
```json
{ "birthDate": "1960-05-15" }  // ✅ Valid date
```

**Example Caught (Firely throws):**
```json
{ "birthDate": "1960-05-15x" }  // ❌ Invalid date → FHIR_INVALID_PRIMITIVE
```

**Example Warned (Lint only):**
```json
{ "birthDate": "15/05/1960" }  // ⚠️ Wrong format, Lint warns, Firely rejects
```

**JSON Node Validation:**
- **NO primitive validation** in `ValidateRuleOnSourceNode()` (FhirPathRuleEngine.cs:327-573)
- ISourceNode only provides `.Text` property - no type awareness
- Relies entirely on Firely POCO parsing or Lint pre-checks

**Error Granularity:**
- **Firely:** Per-field error with jsonPointer (when extractable)
- **Lint:** Advisory warnings with jsonPointer
- **JSON Node:** None (skips primitive validation)

---

### 🔹 Category: Array vs Object Shape

**Coverage:** ✅ **Yes** (Lint advisory only)

**Code Path:**
- **File:** LintValidationService.cs → ValidateResourceStructure()
- **Lines:** 533-585 (schema-based cardinality checks)
- **Catalog:** LintRuleCatalog.cs lines 163-189

**Detection Logic:**
1. Load FHIR schema for resource type via `IFhirSchemaService`
2. For each JSON property, check if `element.Max` indicates array (`Max = "*"`) or object (`Max = "1"`)
3. Compare expected schema type vs actual JSON type (`JsonValueKind.Array` vs `JsonValueKind.Object`)
4. Emit `LINT_004` (array expected, object provided) or `LINT_005` (object expected, array provided)

**Schema Check (LintValidationService.cs:533-544):**
```csharp
// Schema-based validation: check if actual JSON type matches expected cardinality
if (element.Max == "*" || (int.TryParse(element.Max, out var maxInt) && maxInt > 1))
{
    // Schema expects array
    if (jsonProperty.Value.ValueKind != JsonValueKind.Array)
    {
        var schemaCardinality = element.Max == "*" ? "an array (0..*)" : $"an array (0..{element.Max})";
        issues.Add(CreateIssue(
            "LINT_004",
            $"Property '{propertyName}' is defined as {schemaCardinality} in FHIR specification. This payload uses a different structure.",
            // ... details
        ));
    }
}
```

**Example Caught:**
```json
{ "identifier": { "value": "12345" } }  // ❌ LINT_004: Should be array
{ "gender": ["male"] }  // ❌ LINT_005: Should be object
```

**Firely Behavior:**
- Firely POCO parsing also detects array/object mismatch
- Throws `StructuralTypeException` or similar
- Caught by ValidationPipeline strict parse → mapped to error

**JSON Node Validation:**
- **NO enforcement** in `ValidateRuleOnSourceNode()`
- ISourceNode `.Children()` accepts both array and non-array
- Navigation succeeds regardless of schema

**ErrorCode Used:**
- **Lint:** `LINT_004` (array expected), `LINT_005` (object expected)
- **Firely:** Varies (mapped via FirelyExceptionMapper pattern 6, line 101)

---

### 🔹 Category: Cardinality (min/max)

**Coverage:** ❌ **No** (JSON node level)  
**Partial:** ⚠️ Project Rules + Firely ToTypedElement

**Enforcement Layers:**

1. **Project Rules: ArrayLength**
   - **File:** FhirPathRuleEngine.cs → ValidateArrayLength()
   - **Lines:** 1284-1403
   - **Scope:** User-defined rules with `min`/`max` params
   - **Limitation:** Requires rule authoring; not automatic

2. **Firely ToTypedElement (Node-based)**
   - **File:** FirelyValidationService.cs → ValidateAsync()
   - **Lines:** 83-84
   - **Behavior:** `ToTypedElement()` validates cardinality during traversal
   - **Limitation:** SDK 5.10.3 still throws on critical errors despite `ErrorMode.Report`

3. **Lint Validation (Advisory)**
   - **File:** LintValidationService.cs → CheckRequiredFields()
   - **Lines:** 892-914
   - **Behavior:** Checks `element.Min` for required fields (min ≥ 1)
   - **Limitation:** Advisory only; does not enforce max cardinality

**Code Reference - ArrayLength Rule (FhirPathRuleEngine.cs:1329-1354):**
```csharp
if (rule.Params.ContainsKey("min"))
{
    var minValue = rule.Params["min"];
    int min = minValue is JsonElement jsonMin ? jsonMin.GetInt32() : Convert.ToInt32(minValue);
    
    if (count < min)
    {
        // Canonical schema: { min, max, actual }
        var details = new Dictionary<string, object>
        {
            ["min"] = min,
            ["max"] = max,
            ["actual"] = count
        };
        // ... emit ARRAY_LENGTH_OUT_OF_RANGE
    }
}
```

**Firely ToTypedElement Comments (FirelyValidationService.cs:50-52):**
```csharp
// IMPORTANT: Firely SDK 5.10.3 limitation
// - ToTypedElement() with ErrorMode.Report doesn't fully collect all errors - it still throws on critical errors
// - No ExceptionNotification annotation type exists in 5.10.3
```

**Example Caught (Project Rule):**
```json
// Rule: identifier min=1
{ "identifier": [] }  // ❌ ARRAY_LENGTH_OUT_OF_RANGE (actual=0, min=1)
```

**Example NOT Caught (No JSON Node Check):**
```json
// No project rule defined
{ "identifier": [] }  // ⚠️ Passes if no rule; Firely may warn based on profile
```

**Reason for Missing Coverage:**
- **No automatic cardinality enforcement** at JSON node level
- `NavigateToPathInSourceNodeAll()` returns all children without cardinality checks
- `ValidateRuleOnSourceNode()` only validates if explicit rule exists (REQUIRED, ARRAYLENGTH)
- FHIR schema min/max constraints not enforced in JSON node validation path

---

### 🔹 Category: Required Field Presence

**Coverage:** ⚠️ **Partial**

**Enforcement Layers:**

1. **Project Rules: Required**
   - **File:** FhirPathRuleEngine.cs → ValidateRequired()
   - **Lines:** 952-1003
   - **Behavior:** Checks if FHIRPath expression returns empty result
   - **ErrorCode:** `REQUIRED_FIELD_MISSING` or custom `rule.ErrorCode`

2. **JSON Node Validation: Required**
   - **File:** FhirPathRuleEngine.cs → ValidateRuleOnSourceNode() case "REQUIRED"
   - **Lines:** 340-369
   - **Behavior:** Uses `NavigateToPathInSourceNodeAll()` to check field existence
   - **ErrorCode:** `FIELD_REQUIRED`

3. **Lint Validation (Advisory)**
   - **File:** LintValidationService.cs → CheckRequiredFields()
   - **Lines:** 892-914
   - **Scope:** FHIR schema required fields (min=1 or min>1)
   - **RuleId:** `LINT_006`

**POCO Path (ValidateRequired, FhirPathRuleEngine.cs:969-989):**
```csharp
var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
var isMissing = result == null || !result.Any();
var isAllEmpty = !isMissing && result.All(r => string.IsNullOrWhiteSpace(GetValueAsString(r)));

if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR") && (isMissing || isAllEmpty))
{
    errors.Add(new RuleValidationError
    {
        RuleId = rule.Id,
        RuleType = rule.Type,
        ErrorCode = rule.ErrorCode ?? "REQUIRED_FIELD_MISSING",
        // ... canonical schema: { required: true }
    });
}
```

**JSON Node Path (ValidateRuleOnSourceNode, FhirPathRuleEngine.cs:343-368):**
```csharp
case "REQUIRED":
    var matches = NavigateToPathInSourceNodeAll(resource, fieldPath, entryIndex);
    
    if (!matches.Any())
    {
        // Field doesn't exist at all
        var jsonPointer = $"/entry/{entryIndex}/resource/{fieldPath.Replace(".", "/")}";
        
        errors.Add(new RuleValidationError
        {
            ErrorCode = ValidationErrorCodes.FIELD_REQUIRED,
            Details = new Dictionary<string, object>
            {
                ["source"] = "ProjectRule",
                ["required"] = true,
                ["_precomputedJsonPointer"] = jsonPointer
            }
        });
    }
    break;
```

**Example Caught:**
```json
{ }  // ❌ Missing required "gender" field
```

**Behavior When Parent Missing:**
- **POCO Path:** FHIRPath returns empty → `isMissing = true`
- **JSON Node:** Navigation returns empty list → `!matches.Any()`
- **Both emit error** for missing field

**Nested Required Fields:**
- **POCO:** Handles via FHIRPath (e.g., `name.given`)
- **JSON Node:** Handles via dot-notation navigation
- **Limitation:** If parent missing, nested check may not run (depends on navigation logic)

---

### 🔹 Category: Unknown Elements

**Coverage:** ✅ **Yes** (Strict parse + Lint)

**Code Paths:**

1. **Strict Parsing (ValidationPipeline.cs:450)**
   ```csharp
   var strictParser = new FhirJsonParser(new ParserSettings
   {
       AcceptUnknownMembers = false,  // ← Rejects unknown properties
       AllowUnrecognizedEnums = false
   });
   ```

2. **Lenient Parsing (ValidationPipeline.cs:483)**
   ```csharp
   var parser = new FhirJsonParser(new ParserSettings
   {
       AcceptUnknownMembers = true,  // ← Ignores unknown properties
       AllowUnrecognizedEnums = true
   });
   ```

3. **Lint Validation**
   - **File:** LintValidationService.cs → ValidateResourceStructure()
   - **Behavior:** Checks JSON properties against FHIR schema
   - **RuleId:** `LINT_003` (unknown property)

**FirelyExceptionMapper Pattern (FirelyExceptionMapper.cs:48-74):**
```csharp
// Pattern 2: Unknown element
var unknownMatch = Regex.Match(exceptionMessage, 
    @"Encountered unknown element '([^']+)'",
    RegexOptions.IgnoreCase);

if (unknownMatch.Success)
{
    var unknownElement = unknownMatch.Groups[1].Value;
    var location = unknownMatch.Groups[2].Success ? unknownMatch.Groups[2].Value : null;
    return CreateUnknownElementError(unknownElement, location, exceptionMessage, rawBundleJson);
}
```

**Example Caught:**
```json
{ "gender": "male", "customField": "value" }  // ❌ Strict parse rejects "customField"
```

**Profile-Specific Elements:**
- **Not enforced** at JSON node level
- Requires profile-aware validation (Firely Validator with StructureDefinition)
- Current implementation: Base R4 schema only

**Ignored vs Reported:**
- **Strict Parse:** Reports unknown element as error
- **Lenient Parse:** Ignores unknown element (for downstream SPEC_HINT)
- **JSON Node:** No validation (ISourceNode accepts any property)

---

### 🔹 Category: Multiple Error Reporting

**Coverage:** ✅ **Yes**

**Implementation:**
- **File:** FhirPathRuleEngine.cs → ValidateJsonAsync()
- **Lines:** 148-311
- **Behavior:** Accumulates errors in `List<RuleValidationError>` without early abort

**Early-Abort Logic:**
- **None** in JSON node validation
- All rules processed sequentially
- All errors collected before return

**Code Evidence (FhirPathRuleEngine.cs:285-300):**
```csharp
foreach (var rule in matchingRules)
{
    try
    {
        if (!ShouldValidateResource(sourceResourceNode, rule, resourceType))
        {
            _logger.LogTrace("Resource doesn't match filter, skipping");
            continue;  // ← Skip this rule, continue to next
        }
        
        var ruleErrors = ValidateRuleOnSourceNode(sourceResourceNode, rule, entryIndex, resourceType);
        errors.AddRange(ruleErrors);  // ← Accumulate all errors
    }
    catch (Exception ex)
    {
        _logger.LogError("Error validating rule: {Message}", ex.Message);
        // Continue with other rules ← No abort on exception
    }
}
```

**Comparison to Firely:**
- **Firely SDK 5.10.3:** `ToTypedElement()` with `ErrorMode.Report` intended for multi-error, but still throws on critical errors (FirelyValidationService.cs:50-52)
- **JSON Node:** True multi-error collection without exceptions

**Example:**
```json
{
  "gender": "malex",        // Error 1: Invalid enum
  "identifier": [],         // Error 2: Array too short
  "name": { "family": "" }  // Error 3: Empty required field
}
```
All three errors returned in single validation pass.

---

### 🔹 Category: jsonPointer Accuracy

**Coverage:** ✅ **Yes**

**Implementation:**
- **File:** FhirPathRuleEngine.cs → NavigateToPathInSourceNodeAll()
- **Lines:** 633-689
- **Method:** NavigateRecursive()

**Array Index Preservation:**
```csharp
// MVP rule: ALWAYS treat as array-capable and emit index
// Even if children.Count == 1, still emit /part/0
for (int i = 0; i < children.Count; i++)
{
    var nextPointer = $"{currentPointer}/{part}/{i}";  // ← Index always included
    NavigateRecursive(children[i], parts, partIndex + 1, nextPointer, results);
}
```

**Pointer Format:**
- **Absolute:** Yes (starts with `/entry/{index}/resource`)
- **Array Indices:** Yes (format: `/field/0`, `/field/1`, etc.)
- **Nested Arrays:** Yes (format: `/identifier/0/extension/2`)

**Example Pointers:**
```json
{
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "identifier": [
          { "system": "..." },  // ← /entry/0/resource/identifier/0
          { "system": "..." }   // ← /entry/0/resource/identifier/1
        ],
        "gender": "male"        // ← /entry/0/resource/gender/0 (treated as array)
      }
    }
  ]
}
```

**Ambiguity:**
- **None** for array elements (index always included)
- **Intentional:** Scalar fields treated as single-element arrays for consistency
  - `gender` → `/entry/0/resource/gender/0` (not `/entry/0/resource/gender`)
  - Rationale: Uniform pointer format simplifies navigation logic (comment at line 654)

---

## Firely Dependency Matrix

| Validation Type | JSON Node | Project Rules | Firely Only |
|-----------------|-----------|---------------|-------------|
| **Enum values** | ❌ | ❌ | ✅ (strict parse) |
| **Primitive formats** | ❌ | ❌ | ✅ (POCO parse) |
| **Cardinality** | ❌ | ⚠️ (if rule defined) | ✅ (ToTypedElement) |
| **Profile invariants** | ❌ | ❌ | ✅ |
| **Terminology** | ❌ | ✅ (CodeSystem rule) | ⚠️ (basic only) |
| **Reference resolution** | ❌ | ✅ (Reference rule) | ⚠️ (structure only) |
| **Unknown elements** | ❌ | ❌ | ✅ (strict parse) |
| **Required fields** | ✅ (if rule) | ✅ (Required rule) | ✅ (ToTypedElement) |
| **Array/object shape** | ❌ | ❌ | ✅ (POCO parse) |
| **Fixed values** | ✅ (if rule) | ✅ (FixedValue rule) | ❌ |
| **Allowed values** | ✅ (if rule) | ✅ (AllowedValues rule) | ❌ |
| **Regex patterns** | ✅ (if rule) | ✅ (Regex rule) | ❌ |

**Legend:**
- ✅ = Fully enforced
- ⚠️ = Partially enforced or conditional
- ❌ = Not enforced

---

## Final Verdict

### Is JSON node validation safe as first-line enforcement?

**No** - JSON node validation (ISourceNode-based) is NOT safe as sole enforcement mechanism.

**Reasons:**

1. **No Enum Validation:** ISourceNode provides only `.Text` property - cannot verify enum membership
2. **No Primitive Type Checking:** Cannot validate date/dateTime/boolean/decimal formats at node level
3. **No Automatic Cardinality:** Requires explicit project rules; no automatic min/max enforcement
4. **No Array/Object Shape Enforcement:** Navigation accepts any structure; Lint provides advisory warnings only

**Safe Uses:**
- ✅ **Fallback validation** when POCO parsing fails (structural errors prevent POCO creation)
- ✅ **Business rule evaluation** (Required, AllowedValues, FixedValue, Regex, ArrayLength)
- ✅ **Multi-error collection** without early abort

**Unsafe Uses:**
- ❌ **Primary structural validation** (cannot replace Firely POCO parsing)
- ❌ **Type enforcement** (enums, primitives)
- ❌ **Schema compliance** (cardinality, unknown elements)

---

### What errors can still be silently skipped today?

1. **Invalid Enum Values (lenient parse path)**
   - **Scenario:** `ValidateJsonAsync()` called without prior POCO parse attempt
   - **Example:** `{ "gender": "malex" }` → ISourceNode returns text "malex", no validation
   - **Mitigation:** Always attempt strict POCO parse first (current ValidationPipeline strategy)

2. **Invalid Primitive Formats (JSON node path)**
   - **Scenario:** Date/boolean/decimal validation skipped in ISourceNode path
   - **Example:** `{ "birthDate": "1960-05-15x" }` → ISourceNode returns text, no format check
   - **Mitigation:** Lint pre-validation can warn; Firely parse required for enforcement

3. **Unknown Elements (lenient parse)**
   - **Scenario:** `AcceptUnknownMembers = true` allows extra properties
   - **Example:** `{ "customField": "value" }` → Ignored by lenient parser
   - **Mitigation:** Strict parse first, capture errors, then fall back to lenient

4. **Cardinality Violations (no project rule)**
   - **Scenario:** Array too short/long but no ArrayLength rule defined
   - **Example:** `{ "identifier": [] }` when min=1 required by profile
   - **Mitigation:** ToTypedElement validation or explicit project rules

5. **POCO Property Access Failures (lenient parse)**
   - **Scenario:** Invalid enum stored in lenient POCO, `InvalidCastException` on property access
   - **Example:** `Patient.Gender` throws when value is "malex"
   - **Mitigation:** Strict parse first to catch enum errors before POCO creation

---

### What validation must happen before Firely to avoid silent failures?

**Critical Pre-Firely Checks:**

1. **Strict Enum Validation**
   - **Why:** Lenient parse accepts invalid enums but blocks POCO property access
   - **How:** Try strict parse first, map exceptions, fall back to lenient
   - **Status:** ✅ Implemented (ValidationPipeline.cs:446-505)

2. **Lint Pre-Validation (Advisory)**
   - **Why:** Provides fast feedback on common errors without full POCO parsing
   - **How:** LintValidationService regex checks + schema validation
   - **Status:** ✅ Implemented (LintValidationService.cs)

3. **JSON Syntax Validation**
   - **Why:** Invalid JSON prevents all downstream processing
   - **How:** `System.Text.Json.JsonDocument.Parse()` or `FhirJsonNode.Parse()`
   - **Status:** ✅ Implicit (parse attempts catch syntax errors)

**Non-Critical (Firely-Equivalent):**
- Primitive format validation (Firely catches during POCO parse)
- Unknown elements (strict parse catches before lenient fallback)
- Cardinality (ToTypedElement validates during traversal)

---

## Code Location Reference

### Key Files

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| **ValidationPipeline.cs** | Strict-then-lenient parse strategy | 443-510 |
| **FhirPathRuleEngine.cs** | Business rule validation (POCO + JSON node) | 148-311 (ValidateJsonAsync), 327-573 (ValidateRuleOnSourceNode) |
| **FirelyValidationService.cs** | Node-based structural validation | 31-177 (ToTypedElement traversal) |
| **FirelyExceptionMapper.cs** | Exception → ValidationError mapping | 30-96 (enum, primitive, unknown patterns) |
| **LintValidationService.cs** | Pre-Firely advisory validation | 1-975 (regex, schema checks) |
| **NavigateToPathInSourceNodeAll** | JSON pointer generation | 633-689 (recursive navigation) |

### Critical Methods

- **ParseBundleWithContext()** (ValidationPipeline.cs:443) - Strict/lenient strategy
- **ValidateJsonAsync()** (FhirPathRuleEngine.cs:148) - JSON node rule validation
- **ValidateRuleOnSourceNode()** (FhirPathRuleEngine.cs:327) - ISourceNode business rules
- **MapToValidationError()** (FirelyExceptionMapper.cs:22) - Exception pattern matching
- **NavigateRecursive()** (FhirPathRuleEngine.cs:653) - JSON pointer construction

---

## Validation Pipeline Flow

```
1. Lint Pre-Validation (Advisory)
   ↓
2. Strict POCO Parse Attempt
   ├─ Success → Use POCO for all validation
   └─ Failure → Map error + Fall back to lenient parse
      ↓
3. Lenient POCO Parse
   ├─ Success → Use POCO for business rules (with captured strict errors)
   └─ Failure → Fall back to JSON node validation
      ↓
4. JSON Node Validation (ISourceNode)
   - Required, AllowedValues, FixedValue, Regex, ArrayLength
   - NO enum, primitive, or cardinality enforcement
   ↓
5. Firely Structural Validation (ToTypedElement)
   - Traverses typed nodes
   - Validates cardinality, types, constraints
   - SDK 5.10.3: Still throws on critical errors
   ↓
6. Return Aggregated Errors
   - Strict parse errors (enum, unknown elements)
   - Business rule errors (project rules)
   - Firely structural errors (ToTypedElement)
```

---

**End of Audit** - No code modifications made.
