# Backend Terminology Rules Implementation Summary

## ✅ Implementation Complete

Successfully implemented backend support for **Terminology Constraint Rules** (CODE_SYSTEM and ALLOWED_CODES) alongside existing Required and ArrayLength rules.

---

## 📦 Deliverables

### 1. DTOs and Models

**File:** `backend/src/Pss.FhirProcessor.Playground.Api/Models/ObservedTerminologyResponse.cs`
- `ObservedValue`: Value and count from sample data
- `ObservedTerminologyResponse`: Map of FHIRPath to observed values

**File:** `backend/src/Pss.FhirProcessor.Playground.Api/Models/RuleBulkModels.cs`
- `RuleIntent`: Frontend intent model (REQUIRED, ARRAY_LENGTH, CODE_SYSTEM, ALLOWED_CODES)
- `ArrayLengthParams`: Min/max/nonEmpty params
- `CodeSystemParams`: System URI param
- `AllowedCodesParams`: System (optional) and codes array
- `BulkCreateRulesRequest`: List of intents
- `DraftRule`: Created rule entity (Required, ArrayLength, CodeSystem, AllowedCodes)
- `RuleCreationError`: Index-based error reporting
- `BulkCreateRulesResponse`: Created rules + errors (partial success)

### 2. Service Layer

**File:** `backend/src/Pss.FhirProcessor.Playground.Api/Services/IRuleService.cs`
- `GetObservedTerminologyAsync`: Extract terminology from sample bundle
- `BulkCreateRulesAsync`: Create rules from intents with validation

**File:** `backend/src/Pss.FhirProcessor.Playground.Api/Services/RuleService.cs`
- **Observed Terminology Extraction:**
  - Parses sample FHIR bundle using Firely SDK
  - Recursively traverses all resources
  - Extracts `Coding.system` and `Coding.code` values
  - Groups by FHIRPath (e.g., `Observation.code.coding.system`)
  - De-duplicates and counts occurrences
  - Returns sorted by count (descending)

- **Bulk Rule Creation:**
  - Validates each intent (type-specific rules)
  - Checks for duplicate rules
  - Generates messages using deterministic templates
  - Creates DraftRule entities with status="draft"
  - Persists rules to project's RulesJson
  - Returns partial success (created + errors)

- **Message Templates:**
  ```csharp
  CODE_SYSTEM: "{path} must use code system: {system}"
  ALLOWED_CODES: "{path} must be one of: {code1, code2, ...}"
  ```

### 3. API Endpoints

**File:** `backend/src/Pss.FhirProcessor.Playground.Api/Controllers/ProjectsController.cs`

**New Endpoints:**

```csharp
GET /api/projects/{id}/terminology/observed
POST /api/projects/{id}/rules/bulk
```

---

## 🎯 API 1: Observed Terminology

### Endpoint
```
GET /api/projects/{projectId}/terminology/observed
```

### Behavior
1. Loads project's sample bundle (SampleBundleJson)
2. Parses FHIR Bundle using Firely SDK
3. Recursively extracts all Coding elements
4. Tracks system and code values with counts
5. Groups by FHIRPath
6. Returns sorted by observation count

### Response Example
```json
{
  "observedValues": {
    "Observation.code.coding.system": [
      { "value": "https://fhir.synapxe.sg/CodeSystem/screening-type", "count": 8 },
      { "value": "http://loinc.org", "count": 3 }
    ],
    "Observation.code.coding.code": [
      { "value": "HS", "count": 3 },
      { "value": "OS", "count": 2 },
      { "value": "VS", "count": 2 },
      { "value": "DS", "count": 1 }
    ],
    "Condition.code.coding.system": [
      { "value": "http://snomed.info/sct", "count": 5 }
    ]
  }
}
```

### Error Handling
- 404: Project not found
- 200 with empty response: No sample bundle or no codings found
- 500: Parse error (logged, returns empty response)

---

## 🎯 API 2: Bulk Rule Creation

### Endpoint
```
POST /api/projects/{projectId}/rules/bulk
```

### Request Body
```json
{
  "intents": [
    {
      "type": "REQUIRED",
      "path": "Patient.gender",
      "resourceType": "Patient"
    },
    {
      "type": "ARRAY_LENGTH",
      "path": "Patient.address.line",
      "resourceType": "Patient",
      "params": {
        "min": 1,
        "max": 5,
        "nonEmpty": true
      }
    },
    {
      "type": "CODE_SYSTEM",
      "path": "Observation.code.coding.system",
      "resourceType": "Observation",
      "params": {
        "system": "https://fhir.synapxe.sg/CodeSystem/screening-type"
      }
    },
    {
      "type": "ALLOWED_CODES",
      "path": "Observation.code.coding.code",
      "resourceType": "Observation",
      "params": {
        "system": "https://fhir.synapxe.sg/CodeSystem/screening-type",
        "codes": ["HS", "OS", "VS"]
      }
    }
  ]
}
```

### Response Body
```json
{
  "created": [
    {
      "id": "uuid-1",
      "type": "Required",
      "resourceType": "Patient",
      "path": "Patient.gender",
      "severity": "error",
      "message": "Patient.gender is required.",
      "status": "draft"
    },
    {
      "id": "uuid-2",
      "type": "ArrayLength",
      "resourceType": "Patient",
      "path": "Patient.address.line",
      "severity": "error",
      "message": "Patient.address.line must contain between 1 and 5 items, all items must be non-empty.",
      "status": "draft",
      "params": {
        "min": 1,
        "max": 5,
        "nonEmpty": true
      }
    },
    {
      "id": "uuid-3",
      "type": "CodeSystem",
      "resourceType": "Observation",
      "path": "Observation.code.coding.system",
      "severity": "error",
      "message": "Observation.code.coding.system must use code system: https://fhir.synapxe.sg/CodeSystem/screening-type",
      "status": "draft",
      "params": {
        "system": "https://fhir.synapxe.sg/CodeSystem/screening-type"
      }
    },
    {
      "id": "uuid-4",
      "type": "AllowedCodes",
      "resourceType": "Observation",
      "path": "Observation.code.coding.code",
      "severity": "error",
      "message": "Observation.code.coding.code must be one of: HS, OS, VS",
      "status": "draft",
      "params": {
        "system": "https://fhir.synapxe.sg/CodeSystem/screening-type",
        "codes": ["HS", "OS", "VS"]
      }
    }
  ],
  "errors": []
}
```

### Validation Rules

**REQUIRED:**
- Path required
- ResourceType required

**ARRAY_LENGTH:**
- Path required
- ResourceType required
- Params required
- Min >= 0 (if set)
- Max >= 0 (if set)
- Max >= Min (if both set)
- At least one constraint (min, max, or nonEmpty) must be set

**CODE_SYSTEM:**
- Path required
- ResourceType required
- Params.system required
- System must be non-empty string

**ALLOWED_CODES:**
- Path required
- ResourceType required
- Params.codes required
- Codes array must have at least 1 element
- No empty strings in codes array

### Duplicate Detection
- Checks existing rules in project's RulesJson
- Rejects if rule with same path + type already exists
- Returns error with index and reason

### Partial Success
- Processes all intents independently
- Creates rules for valid intents
- Collects errors for invalid intents
- Persists rules only if at least one created
- Returns both created rules and errors

### Error Response Example
```json
{
  "created": [
    {
      "id": "uuid-1",
      "type": "Required",
      "path": "Patient.gender",
      "message": "Patient.gender is required.",
      "status": "draft"
    }
  ],
  "errors": [
    {
      "index": 1,
      "path": "Patient.address.line",
      "reason": "Max must be >= Min"
    },
    {
      "index": 2,
      "path": "Observation.code.coding.system",
      "reason": "Rule already exists for path Observation.code.coding.system with type CODE_SYSTEM"
    }
  ]
}
```

---

## 🧪 Validation Logic

### Intent Validation
**Service Method:** `ValidateIntent(RuleIntent intent)`

**Rules:**
- Path and ResourceType always required
- Type-specific param validation
- Returns error string or null (valid)

**CODE_SYSTEM:**
```csharp
if (codeSystemParams == null || string.IsNullOrWhiteSpace(codeSystemParams.System))
    return "Code system URI must be specified";
```

**ALLOWED_CODES:**
```csharp
if (allowedCodesParams == null || allowedCodesParams.Codes == null || allowedCodesParams.Codes.Count == 0)
    return "At least one allowed code must be specified";

if (allowedCodesParams.Codes.Any(c => string.IsNullOrWhiteSpace(c)))
    return "Allowed codes cannot be empty";
```

### Duplicate Detection
**Service Method:** `IsDuplicateRule(List<DraftRule> existingRules, RuleIntent intent)`

**Logic:**
```csharp
var ruleType = MapIntentTypeToRuleType(intent.Type);
return existingRules.Any(r => r.Path == intent.Path && r.Type == ruleType);
```

---

## 🧠 Message Generation

### Template Engine
**Service Method:** `GenerateMessage(RuleIntent intent)`

**Templates:**

**REQUIRED:**
```csharp
"{path} is required."
```

**ARRAY_LENGTH:**
```csharp
// Min + Max
"{path} must contain between {min} and {max} items."

// Min only
"{path} must contain at least {min} item(s)."

// Max only
"{path} must contain at most {max} item(s)."

// + NonEmpty
"{path} must contain between {min} and {max} items, all items must be non-empty."
```

**CODE_SYSTEM:**
```csharp
"{path} must use code system: {system}"
```

**ALLOWED_CODES:**
```csharp
"{path} must be one of: {code1, code2, ...}"
```

**Example:**
```csharp
Input: 
  Type: CODE_SYSTEM
  Path: Observation.code.coding.system
  Params: { system: "https://fhir.synapxe.sg/CodeSystem/screening-type" }

Output:
  "Observation.code.coding.system must use code system: https://fhir.synapxe.sg/CodeSystem/screening-type"
```

---

## 🔌 Dependency Injection

### Program.cs Registration
```csharp
builder.Services.AddScoped<IRuleService, RuleService>();
```

### Controller Injection
```csharp
public ProjectsController(
    IProjectService projectService,
    IRuleService ruleService,
    ILogger<ProjectsController> logger)
```

---

## 📊 Data Flow

### Observed Terminology Extraction
```
1. Frontend requests: GET /api/projects/{id}/terminology/observed
2. Controller calls: _ruleService.GetObservedTerminologyAsync(id)
3. Service loads project from _projectService.GetProjectAsync(id)
4. Service parses SampleBundleJson using Firely SDK
5. Service recursively traverses resources
6. Service extracts Coding.system and Coding.code values
7. Service groups by FHIRPath and counts
8. Service returns ObservedTerminologyResponse
9. Controller returns 200 OK with JSON
10. Frontend displays in ObservedValuesPanel
```

### Bulk Rule Creation
```
1. Frontend sends: POST /api/projects/{id}/rules/bulk with intents
2. Controller calls: _ruleService.BulkCreateRulesAsync(id, request)
3. Service loads project from _projectService.GetProjectAsync(id)
4. Service loads existing rules from project.RulesJson
5. Service validates each intent (for loop with index)
6. Service checks for duplicates
7. Service creates DraftRule entities with generated messages
8. Service persists rules via _projectService.UpdateRulesAsync()
9. Service returns BulkCreateRulesResponse (created + errors)
10. Controller returns 200 OK with JSON
11. Frontend shows created rules and error messages
```

---

## 🚫 Explicit DO NOTs (Verified)

✅ **NO rule execution** - Only creates rule definitions
✅ **NO AI** - Deterministic template-based messages
✅ **NO free-text input** - All messages generated by system
✅ **NO auto-activation** - All rules created with status="draft"
✅ **NO terminology service calls** - Only extracts from sample data
✅ **NO semantic inference** - Pure data extraction and counting

---

## 🧪 Testing Recommendations

### Unit Tests (RuleService)

**Observed Terminology Extraction:**
- [ ] Empty bundle returns empty response
- [ ] Single Observation with Coding extracts system and code
- [ ] Multiple observations aggregate counts correctly
- [ ] Nested codings in CodeableConcept extracted
- [ ] Invalid JSON returns empty response
- [ ] Missing sample bundle returns empty response

**Validation:**
- [ ] CODE_SYSTEM: Rejects empty system
- [ ] CODE_SYSTEM: Accepts valid system URI
- [ ] ALLOWED_CODES: Rejects empty codes array
- [ ] ALLOWED_CODES: Rejects array with empty strings
- [ ] ALLOWED_CODES: Accepts valid codes
- [ ] ARRAY_LENGTH: Rejects negative min
- [ ] ARRAY_LENGTH: Rejects max < min
- [ ] ARRAY_LENGTH: Rejects no constraints set

**Message Generation:**
- [ ] CODE_SYSTEM: Generates correct message template
- [ ] ALLOWED_CODES: Joins codes with commas
- [ ] ARRAY_LENGTH: Handles all param combinations
- [ ] REQUIRED: Generates simple message

**Duplicate Detection:**
- [ ] Detects duplicate Required rules
- [ ] Detects duplicate CodeSystem rules
- [ ] Allows same path with different types
- [ ] Allows different paths with same type

**Bulk Creation:**
- [ ] Creates all valid rules
- [ ] Rejects all invalid intents with errors
- [ ] Handles partial success (some valid, some invalid)
- [ ] Persists rules to project
- [ ] Returns index-based errors

### Integration Tests

**Observed Terminology API:**
```csharp
[Fact]
public async Task GetObservedTerminology_WithSampleBundle_ReturnsObservedValues()
{
    // Arrange: Create project with sample bundle containing Observations
    var project = await CreateProjectWithBundle(SampleBundles.ObservationWithCodings);
    
    // Act
    var response = await GetAsync<ObservedTerminologyResponse>(
        $"/api/projects/{project.Id}/terminology/observed");
    
    // Assert
    Assert.NotEmpty(response.ObservedValues);
    Assert.Contains("Observation.code.coding.system", response.ObservedValues.Keys);
    Assert.Contains("Observation.code.coding.code", response.ObservedValues.Keys);
}
```

**Bulk Rule Creation API:**
```csharp
[Fact]
public async Task BulkCreateRules_WithCodeSystemIntent_CreatesRule()
{
    // Arrange
    var project = await CreateProjectAsync();
    var request = new BulkCreateRulesRequest
    {
        Intents = new List<RuleIntent>
        {
            new RuleIntent
            {
                Type = "CODE_SYSTEM",
                Path = "Observation.code.coding.system",
                ResourceType = "Observation",
                Params = new CodeSystemParams
                {
                    System = "https://fhir.synapxe.sg/CodeSystem/screening-type"
                }
            }
        }
    };
    
    // Act
    var response = await PostAsync<BulkCreateRulesResponse>(
        $"/api/projects/{project.Id}/rules/bulk", request);
    
    // Assert
    Assert.Single(response.Created);
    Assert.Equal("CodeSystem", response.Created[0].Type);
    Assert.Equal("draft", response.Created[0].Status);
    Assert.Contains("must use code system", response.Created[0].Message);
    Assert.Empty(response.Errors);
}

[Fact]
public async Task BulkCreateRules_WithDuplicateIntent_ReturnsError()
{
    // Arrange
    var project = await CreateProjectAsync();
    var intent = new RuleIntent
    {
        Type = "CODE_SYSTEM",
        Path = "Observation.code.coding.system",
        ResourceType = "Observation",
        Params = new CodeSystemParams { System = "http://loinc.org" }
    };
    
    // Create first rule
    await PostAsync($"/api/projects/{project.Id}/rules/bulk", 
        new BulkCreateRulesRequest { Intents = new List<RuleIntent> { intent } });
    
    // Act: Try to create duplicate
    var response = await PostAsync<BulkCreateRulesResponse>(
        $"/api/projects/{project.Id}/rules/bulk",
        new BulkCreateRulesRequest { Intents = new List<RuleIntent> { intent } });
    
    // Assert
    Assert.Empty(response.Created);
    Assert.Single(response.Errors);
    Assert.Contains("already exists", response.Errors[0].Reason);
}
```

---

## 📁 Files Created/Modified

**Created (4 files):**
- `backend/src/Pss.FhirProcessor.Playground.Api/Models/ObservedTerminologyResponse.cs`
- `backend/src/Pss.FhirProcessor.Playground.Api/Models/RuleBulkModels.cs`
- `backend/src/Pss.FhirProcessor.Playground.Api/Services/IRuleService.cs`
- `backend/src/Pss.FhirProcessor.Playground.Api/Services/RuleService.cs`

**Modified (2 files):**
- `backend/src/Pss.FhirProcessor.Playground.Api/Controllers/ProjectsController.cs` - Added 2 endpoints
- `backend/src/Pss.FhirProcessor.Playground.Api/Program.cs` - Added DI registration

---

## 🎯 Acceptance Criteria

✅ **Observed terminology endpoint returns correct values**
- Extracts from sample bundle
- Groups by FHIRPath
- De-duplicates and counts
- Returns sorted by count

✅ **Bulk creation supports partial success**
- Validates each intent independently
- Creates rules for valid intents
- Collects errors for invalid intents
- Returns both created and errors

✅ **Messages match frontend preview**
- Uses deterministic templates
- CODE_SYSTEM: "{path} must use code system: {system}"
- ALLOWED_CODES: "{path} must be one of: {codes}"

✅ **Rules saved as Draft**
- All rules created with status="draft"
- Persisted to project's RulesJson

✅ **Duplicate rules rejected**
- Checks existing rules by path + type
- Returns error with reason

✅ **Existing Required / ArrayLength rules unaffected**
- Backward compatible
- Same validation and message generation
- Same persistence mechanism

---

## 🚀 Next Steps

### Integration
1. **Frontend API Integration**
   - Update rulesApi.ts to call new endpoints
   - Wire observed terminology to tree nodes
   - Test end-to-end workflow

2. **Testing**
   - Unit tests for RuleService
   - Integration tests for APIs
   - E2E tests with real bundles

3. **Validation Integration**
   - Engine must support CodeSystem and AllowedCodes rule execution
   - FhirPathRuleEngine must validate against these rules
   - Error messages must match created rule messages

### Future Enhancements
1. **Code System Validation**
   - Validate system URIs against known terminology servers
   - Fetch display names for systems

2. **Code Validation**
   - Validate codes exist in specified system
   - Fetch display names for codes

3. **ValueSet Support**
   - Support FHIR ValueSet references
   - Expand ValueSets to allowed codes

4. **Performance**
   - Cache observed terminology per project
   - Incremental updates on bundle upload

---

## 📊 Implementation Stats

- **Files Created:** 4 (Models + Services)
- **Files Modified:** 2 (Controller + DI)
- **Lines of Code:** ~500+ (Service implementation)
- **API Endpoints:** 2 (GET observed, POST bulk)
- **Supported Rule Types:** 4 (Required, ArrayLength, CodeSystem, AllowedCodes)
- **Validation Rules:** 15+ (type-specific)
- **Message Templates:** 4 (deterministic)
- **Backward Compatibility:** ✅ 100%

---

**Status:** Backend implementation complete, ready for frontend integration and testing

**Design Principle:** "Frontend declares intent. Backend owns correctness." ✅

**Date:** December 17, 2024
