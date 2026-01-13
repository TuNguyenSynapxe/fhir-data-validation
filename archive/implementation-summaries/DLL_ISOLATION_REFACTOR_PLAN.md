# DLL Isolation Refactor Plan

**Date:** 3 January 2026  
**Objective:** Make `Pss.FhirProcessor.Engine` stateless, pure, and DLL-distributable  
**Status:** 🟡 IN PROGRESS

---

## Executive Summary

Refactor validation engine to eliminate all file I/O, ProjectId-based loading, and static state. Move all persistence logic to Playground. Make engine accept only in-memory data via method parameters.

---

## Violations Identified

### 🔴 HIGH Priority (Blocks DLL Distribution)

1. **File I/O in QuestionService** (`Services/Questions/QuestionService.cs`)
   - Reads from `data/projects/{projectId}/questions.json`
   - Used by `QuestionAnswerValidator` (authoring feature)
   - **Fix:** Move to Playground, pass Question[] through ValidationRequest

2. **File I/O in QuestionSetService** (`Services/Questions/QuestionSetService.cs`)
   - Reads from `data/projects/{projectId}/questionsets.json`
   - Not currently used in validation pipeline
   - **Fix:** Move to Playground entirely (pure authoring service)

3. **File I/O in TerminologyService** (`Services/Terminology/TerminologyService.cs`)
   - Reads from `data/projects/{projectId}/terminology/*.json`
   - Used by `FhirPathRuleEngine` for CodeSystem validation
   - **Fix:** Pass CodeSystem[] through RuleSet, remove projectId loading

4. **ProjectId-based Loading in FhirPathRuleEngine** (`RuleEngines/FhirPathRuleEngine.cs:50`)
   - Extracts projectId from RuleSet to load terminology
   - Violates statelessness contract
   - **Fix:** Remove projectId usage, accept CodeSystem[] in RuleSet

### 🟡 MEDIUM Priority (Before Production)

5. **Static Logger in ValidationErrorDetailsValidator** (`Models/ValidationErrorDetailsValidator.cs:27`)
   - Uses `static ILogger? _logger`
   - Breaks DI pattern
   - **Fix:** Inject ILogger via constructor, support NullLogger

6. **Authoring Features Mixed with Runtime** (multiple files)
   - QuestionAnswerValidator (authoring-only feature)
   - SpecHintService (authoring-only auto-generation)
   - RuleAdvisoryService (authoring-only suggestions)
   - **Fix:** Make optional via nullable DI, document authoring vs runtime

7. **File I/O in FhirSampleProvider** (`Services/FhirSampleProvider.cs:42`)
   - Reads sample FHIR bundles from filesystem
   - Authoring/development-only service
   - **Fix:** Move to Playground, not needed in Engine

### 🟢 LOW Priority (Nice to Have)

8. **SpecHintService Directory Searches** (`Authoring/SpecHintService.cs:666`)
   - Searches for `backend/specs/fhir/r4/` folder
   - Already has graceful fallback to embedded catalog
   - **Fix:** Already safe (returns null if not found)

---

## Refactoring Strategy

### Phase 1: Remove File I/O (HIGH Priority)

#### 1.1 QuestionService & QuestionSetService

**Current State:**
```csharp
// Engine reads from filesystem
public async Task<IEnumerable<Question>> ListQuestionsAsync(string projectId)
{
    var filePath = GetQuestionsFilePath(projectId);
    var json = await File.ReadAllTextAsync(filePath);
    return JsonSerializer.Deserialize<List<Question>>(json);
}
```

**Target State:**
```csharp
// Engine accepts pre-loaded data
public class QuestionAnswerValidator
{
    // Option 1: Pass questions through ValidationRequest
    public async Task<ValidationResult> ValidateAsync(
        Bundle bundle,
        RuleSet ruleSet,
        Question[]? questions,  // ✅ Passed from caller
        CancellationToken cancellationToken)
    
    // Option 2: Pass through RuleSet
    public class RuleSet
    {
        public Question[]? Questions { get; set; }  // ✅ Embedded in RuleSet
    }
}
```

**Playground Responsibilities:**
```csharp
// Playground loads from database/filesystem
var questions = await _dbContext.Questions
    .Where(q => q.ProjectId == projectId)
    .ToArrayAsync();

var request = new ValidationRequest
{
    BundleJson = bundleJson,
    RulesJson = rulesJson,
    QuestionsJson = JsonSerializer.Serialize(questions)  // ✅ Pass as JSON
};
```

**Migration Path:**
1. Add `QuestionsJson` field to ValidationRequest
2. Update ValidationPipeline to pass questions to QuestionAnswerValidator
3. Update QuestionAnswerValidator to accept Question[] instead of loading via IQuestionService
4. Remove IQuestionService from Engine DI (move to Playground)
5. Update Playground to load questions and pass via ValidationRequest

#### 1.2 TerminologyService

**Current State:**
```csharp
// FhirPathRuleEngine loads terminology
var projectId = ruleSet.Project;
if (!string.IsNullOrWhiteSpace(projectId))
{
    var codeSystems = await _terminologyService.ListCodeSystemsAsync(projectId);
}
```

**Target State:**
```csharp
// RuleSet contains all necessary data
public class RuleSet
{
    public CodeSystem[]? CodeSystems { get; set; }  // ✅ Pre-loaded by caller
}

// FhirPathRuleEngine uses embedded data
var codeSystems = ruleSet.CodeSystems ?? Array.Empty<CodeSystem>();
```

**Migration Path:**
1. Add `CodeSystems` field to RuleSet model
2. Update FhirPathRuleEngine to use RuleSet.CodeSystems instead of loading via projectId
3. Remove projectId-based terminology loading from FhirPathRuleEngine
4. Update Playground to load CodeSystems and embed in RuleSet JSON
5. Keep ITerminologyService for authoring (CRUD), but remove from validation path

### Phase 2: Fix Static Logger (MEDIUM Priority)

**Current State:**
```csharp
public static class ValidationErrorDetailsValidator
{
    private static ILogger? _logger;
    
    public static void SetLogger(ILogger logger)
    {
        _logger = logger;
    }
}
```

**Target State:**
```csharp
public class ValidationErrorDetailsValidator
{
    private readonly ILogger<ValidationErrorDetailsValidator> _logger;
    
    public ValidationErrorDetailsValidator(ILogger<ValidationErrorDetailsValidator>? logger = null)
    {
        _logger = logger ?? NullLogger<ValidationErrorDetailsValidator>.Instance;
    }
    
    public void Validate(string errorCode, IDictionary<string, object>? details)
    {
        // Use injected logger
        _logger.LogWarning("Schema violation: {ErrorCode}", errorCode);
    }
}
```

**Migration Path:**
1. Convert static class to instance class
2. Add constructor with optional ILogger parameter
3. Support NullLogger fallback for DLL scenarios
4. Update all callers to use instance instead of static methods
5. Register in DI as singleton

### Phase 3: Separate Authoring from Runtime (MEDIUM Priority)

**Target Architecture:**
```
Pss.FhirProcessor.Engine (DLL-Safe)
├── Core (always required)
│   ├── ValidationPipeline
│   ├── FirelyValidationService
│   ├── FhirPathRuleEngine
│   ├── CodeMasterEngine
│   └── ReferenceResolver
└── Authoring (optional)
    ├── QuestionAnswerValidator? (nullable)
    ├── SpecHintService? (nullable)
    ├── RuleAdvisoryService? (nullable)
    └── SystemRuleSuggestionService? (nullable)

Pss.FhirProcessor.Playground.Api (Authoring Environment)
├── Services (persistence)
│   ├── QuestionService (CRUD from DB)
│   ├── QuestionSetService (CRUD from DB)
│   ├── TerminologyService (CRUD from DB)
│   └── ProjectService (CRUD from DB)
└── Controllers
    └── ValidationController (loads data, calls Engine)
```

**Migration Path:**
1. Mark authoring services as optional in ValidationPipeline constructor
2. Document "Runtime Mode" vs "Authoring Mode" in ValidationRequest.ValidationMode
3. Update DI registration to make authoring services nullable
4. Test validation pipeline with authoring services = null
5. Create "Runtime-Only" DI registration helper

---

## Implementation Checklist

### ✅ Phase 1: Remove File I/O (7-10 hours)

- [ ] 1.1 Add `QuestionsJson` and `CodeSystemsJson` to ValidationRequest
- [ ] 1.2 Add `Questions` and `CodeSystems` to RuleSet model
- [ ] 1.3 Update ValidationPipeline to parse and pass questions to QuestionAnswerValidator
- [ ] 1.4 Refactor QuestionAnswerValidator to accept Question[] instead of loading via IQuestionService
- [ ] 1.5 Remove projectId-based loading from FhirPathRuleEngine.ValidateCodeSystemAsync
- [ ] 1.6 Update FhirPathRuleEngine to use RuleSet.CodeSystems
- [ ] 1.7 Move QuestionService to Playground (keep interface in Engine for backward compat)
- [ ] 1.8 Move QuestionSetService to Playground entirely
- [ ] 1.9 Update TerminologyService to be pure parser (no file I/O)
- [ ] 1.10 Update Playground controllers to load and pass all data via ValidationRequest
- [ ] 1.11 Test validation with in-memory data only

### ✅ Phase 2: Fix Static Logger (1-2 hours)

- [ ] 2.1 Convert ValidationErrorDetailsValidator from static to instance class
- [ ] 2.2 Add constructor with optional ILogger<> parameter
- [ ] 2.3 Support NullLogger fallback
- [ ] 2.4 Update all callers (UnifiedErrorModelBuilder, ValidationPipeline)
- [ ] 2.5 Register in DI as singleton
- [ ] 2.6 Remove SetLogger static method
- [ ] 2.7 Test with null logger (runtime DLL scenario)

### ✅ Phase 3: Separate Authoring from Runtime (3-4 hours)

- [ ] 3.1 Make QuestionAnswerValidator nullable in ValidationPipeline
- [ ] 3.2 Make SpecHintService nullable (or keep required with graceful fallback)
- [ ] 3.3 Make RuleAdvisoryService nullable
- [ ] 3.4 Document ValidationRequest.ValidationMode ("standard" vs "full")
- [ ] 3.5 Create EngineServiceCollectionExtensions.AddRuntimeValidation()
- [ ] 3.6 Create EngineServiceCollectionExtensions.AddAuthoringServices()
- [ ] 3.7 Test "runtime-only" DI registration
- [ ] 3.8 Update documentation

### ✅ Phase 4: Add CI Guards (2 hours)

- [ ] 4.1 Create assembly boundary test (no ASP.NET/EF Core/Npgsql dependencies)
- [ ] 4.2 Create file I/O test (ensure no File.*/Directory.* in runtime code paths)
- [ ] 4.3 Create concurrency safety test (parallel validations don't interfere)
- [ ] 4.4 Create statelessness test (ValidationPipeline has no mutable state)
- [ ] 4.5 Add Roslyn analyzer rule to prevent File.*/Directory.* in Engine project

---

## Data Flow Before/After

### ❌ Before (Stateful, File I/O)

```
Playground Controller
    ↓
ValidationPipeline.ValidateAsync(projectId)
    ↓
QuestionAnswerValidator
    ↓
QuestionService.ListQuestionsAsync(projectId)  ← File I/O
    ↓
File.ReadAllTextAsync("data/projects/{projectId}/questions.json")
```

### ✅ After (Stateless, Pure)

```
Playground Controller
    ↓ Load from DB
Questions questions = dbContext.Questions.Where(q => q.ProjectId == projectId)
    ↓ Serialize
string questionsJson = JsonSerializer.Serialize(questions)
    ↓ Pass to Engine
ValidationRequest request = new() { QuestionsJson = questionsJson }
    ↓
ValidationPipeline.ValidateAsync(request)
    ↓ Parse in-memory
Question[] questions = JsonSerializer.Deserialize<Question[]>(request.QuestionsJson)
    ↓
QuestionAnswerValidator.ValidateAsync(bundle, questions)  ← No I/O, pure
```

---

## Validation Contract Changes

### ValidationRequest (Enhanced)

```csharp
public class ValidationRequest
{
    public required string BundleJson { get; set; }
    public string? RulesJson { get; set; }
    public string? CodesJson { get; set; }
    public string? CodeMasterJson { get; set; }
    public string? ProjectJson { get; set; }
    
    // ✅ NEW: Pre-loaded questions (optional, for QuestionAnswer validation)
    public string? QuestionsJson { get; set; }
    
    // ✅ NEW: Pre-loaded code systems (optional, for terminology validation)
    public string? CodeSystemsJson { get; set; }
    
    public string FhirVersion { get; set; } = "R4";
    
    // ⚠️ DEPRECATED: Remove projectId-based loading
    [Obsolete("Pass QuestionsJson and CodeSystemsJson instead. ProjectId loading will be removed in future versions.")]
    public string? ProjectId { get; set; }
    
    public string? ValidationMode { get; set; } = "standard";
}
```

### RuleSet (Enhanced)

```csharp
public class RuleSet
{
    public string? Project { get; set; }  // ✅ Metadata only, not for loading
    public List<RuleDefinition> Rules { get; set; } = new();
    
    // ✅ NEW: Embedded code systems (replaces projectId-based loading)
    public CodeSystem[]? CodeSystems { get; set; }
    
    // ✅ NEW: Embedded questions (replaces projectId-based loading)
    public Question[]? Questions { get; set; }
}
```

---

## Testing Strategy

### Unit Tests (Engine Isolation)

```csharp
[Fact]
public void Engine_Should_Not_Reference_FileSystem_Namespaces()
{
    var assembly = typeof(ValidationPipeline).Assembly;
    var types = assembly.GetTypes();
    
    foreach (var type in types)
    {
        var methods = type.GetMethods(BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);
        foreach (var method in methods)
        {
            var body = method.GetMethodBody();
            // Assert: No File.*, Directory.*, Path.* calls in method body
        }
    }
}

[Fact]
public void Engine_Should_Not_Reference_AspNetCore()
{
    var assembly = typeof(ValidationPipeline).Assembly;
    var referencedAssemblies = assembly.GetReferencedAssemblies();
    
    Assert.DoesNotContain(referencedAssemblies, a => a.Name.Contains("AspNetCore"));
    Assert.DoesNotContain(referencedAssemblies, a => a.Name.Contains("EntityFrameworkCore"));
    Assert.DoesNotContain(referencedAssemblies, a => a.Name.Contains("Npgsql"));
}

[Fact]
public async Task ValidationPipeline_Should_Support_Concurrent_Execution()
{
    // Arrange: Create 100 concurrent validation requests
    var tasks = Enumerable.Range(0, 100).Select(i => 
        _pipeline.ValidateAsync(CreateRequest(i))
    );
    
    // Act: Execute all concurrently
    var results = await Task.WhenAll(tasks);
    
    // Assert: All succeed, no shared state corruption
    Assert.All(results, r => Assert.NotNull(r));
}
```

### Integration Tests (Playground)

```csharp
[Fact]
public async Task Playground_Should_Load_And_Pass_Questions_To_Engine()
{
    // Arrange: Create project with questions in DB
    var projectId = await CreateTestProjectWithQuestions();
    
    // Act: Call validation API
    var response = await _client.PostAsync($"/api/validation/{projectId}", bundleJson);
    
    // Assert: Questions were loaded from DB and passed to engine
    Assert.Contains(response.Errors, e => e.ErrorCode == "QUESTION_ANSWER_MISMATCH");
}
```

---

## Rollout Plan

### Stage 1: Backward-Compatible Enhancement (Week 1)
- Add new fields to ValidationRequest (QuestionsJson, CodeSystemsJson)
- Keep existing projectId-based loading as fallback
- Update Playground to optionally pass questions/codesystems
- Test both code paths work

### Stage 2: Deprecation Warnings (Week 2)
- Mark projectId loading as `[Obsolete]`
- Log warnings when projectId loading is used
- Update all Playground controllers to use new fields
- Update documentation

### Stage 3: Remove Deprecated Code (Week 3)
- Remove projectId-based loading from Engine
- Remove File I/O from Engine services
- Move authoring services to Playground
- Final integration tests

---

## Success Criteria

✅ **DLL Isolation:**
- Engine has no File.*, Directory.*, or Path.* calls in validation code paths
- Engine has no database dependencies (EF Core, Npgsql)
- Engine has no ASP.NET dependencies

✅ **Statelessness:**
- ValidationPipeline is deterministic: same input → same output
- No shared mutable state between validation calls
- Safe for concurrent execution

✅ **Pure Entry Point:**
```csharp
ValidationResult Validate(
  string bundleJson,
  EngineRuleset? ruleset,
  ValidationOptions options
)
```

✅ **Backward Compatibility:**
- Existing Playground code continues to work
- Graceful deprecation path for projectId loading
- No breaking changes to public APIs (initially)

---

## Risks & Mitigation

### Risk 1: Breaking Playground Integration
**Mitigation:** Phased rollout with backward-compatible fields, deprecation warnings

### Risk 2: Performance Impact from JSON Parsing
**Mitigation:** Benchmark before/after, consider caching in Playground layer

### Risk 3: Missing Edge Cases in Data Loading
**Mitigation:** Comprehensive integration tests, monitor production logs during rollout

---

## Estimated Timeline

- **Phase 1 (File I/O Removal):** 7-10 hours
- **Phase 2 (Static Logger Fix):** 1-2 hours
- **Phase 3 (Authoring Separation):** 3-4 hours
- **Phase 4 (CI Guards & Tests):** 2-3 hours
- **Total Critical Path:** 13-19 hours (2-3 days)

---

## Next Steps

1. ✅ Create this refactoring plan
2. 🟡 Implement Phase 1.1: Add QuestionsJson to ValidationRequest
3. 🟡 Implement Phase 1.2: Add CodeSystems to RuleSet
4. 🔵 Continue with file I/O removal
5. 🔵 Fix static logger
6. 🔵 Add CI guards

---

**Status:** Plan approved, ready for implementation  
**Last Updated:** 3 January 2026
