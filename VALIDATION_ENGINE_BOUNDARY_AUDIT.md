# Validation Engine Boundary, Statelessness & Logging Audit

**Date:** 3 January 2026  
**Auditor:** GitHub Copilot  
**Scope:** Pss.FhirProcessor.Engine DLL isolation and architectural boundaries

---

## ✅ Summary

### Boundary Health: **CONDITIONAL PASS** ⚠️

The engine is **fundamentally well-architected** for DLL distribution with clear boundaries between engine and playground. However, **5 high-priority violations** exist that must be addressed before backend refactor or external DLL distribution.

### Key Findings

**✅ Strengths:**
- Clean project separation (Engine vs Playground.Api)
- No direct database dependencies (EF Core, Npgsql)
- No ASP.NET dependencies in engine
- Logging properly injected via ILogger<T>
- Clear public entry point (IValidationPipeline.ValidateAsync)
- ValidationRequest/ValidationResponse follow pure input/output contract

**⚠️ Critical Issues:**
- **File I/O in engine** (QuestionService, TerminologyService, QuestionSetService)
- **Static logger field** (ValidationErrorDetailsValidator)
- **Authoring-only features mixed with runtime engine** (no clean separation)
- **ProjectId-based loading** in ValidationPipeline violates statelessness
- **DependencyInjection requires ASP.NET for Question/Terminology services**

### Safe for DLL Distribution?

**No** - Current state requires playground environment (file system, DI container).

**After fixes:** Yes - Engine can become pure, stateless validation library.

---

## 🚨 Violations

### 🔴 VIOLATION 1: File I/O in Engine Core (HIGH PRIORITY)

**Category:** Storage / State / Environment

**Files:**
- `backend/src/Pss.FhirProcessor.Engine/Services/Questions/QuestionService.cs` (Line 1-265)
- `backend/src/Pss.FhirProcessor.Engine/Services/Terminology/TerminologyService.cs` (Line 1-229)
- `backend/src/Pss.FhirProcessor.Engine/Services/Questions/QuestionSetService.cs`

**Why it violates engine contract:**

The engine directly reads/writes files from disk:

```csharp
// QuestionService.cs Line 52
public QuestionService(string dataRoot)
{
    _dataRoot = dataRoot;  // ❌ Hard-coded file path dependency
}

// Line 65-77
var projectDir = GetProjectDirectory(projectId);
if (!Directory.Exists(projectDir))
{
    return Enumerable.Empty<Question>();
}
var questionFiles = Directory.GetFiles(projectDir, "question_*.json");
foreach (var file in questionFiles)
{
    var json = await File.ReadAllTextAsync(file);  // ❌ Direct file I/O
}
```

```csharp
// TerminologyService.cs Line 27
public TerminologyService(ILogger<TerminologyService> logger, string baseDataPath)
{
    _baseDataPath = baseDataPath;  // ❌ File system dependency
}

// Line 47-49
var projectDirs = Directory.GetDirectories(_baseDataPath);  // ❌ File system access
```

**Impact:**
- Engine cannot run without file system access
- Breaks offline/embedded scenarios (CI, unit tests, embedded DLL)
- Violates statelessness (depends on external file structure)

**Recommended fix:**

**Option A (Preferred): Pass data as JSON strings**
```csharp
// ValidationRequest already supports this pattern:
public class ValidationRequest
{
    public string? CodesJson { get; set; }  // ✅ Already exists
    public string? CodeMasterJson { get; set; }  // ✅ Already exists
    
    // ADD:
    public string? QuestionsJson { get; set; }  // ✅ Pass questions as JSON
    public string? QuestionSetsJson { get; set; }  // ✅ Pass questionsets as JSON
}
```

**Option B: Extract to Playground**
```csharp
// Move QuestionService, TerminologyService, QuestionSetService to:
// backend/src/Pss.FhirProcessor.Playground.Api/Services/Authoring/

// Playground loads data and passes to engine via ValidationRequest
```

**Option C: Abstract storage interface (DLL consumers provide implementation)**
```csharp
public interface IQuestionRepository
{
    Task<IEnumerable<Question>> ListQuestionsAsync(string projectId);
}

// Engine accepts interface, playground provides file-based implementation
// DLL consumers can provide in-memory, database, or custom implementation
```

---

### 🔴 VIOLATION 2: ProjectId-Based Loading in ValidationPipeline (HIGH PRIORITY)

**Category:** State / Environment / Playground Coupling

**File:** `backend/src/Pss.FhirProcessor.Engine/Core/ValidationPipeline.cs`

**Lines:**
- Line 281-303 (QuestionAnswer validation section)

**Why it violates engine contract:**

```csharp
// ValidationPipeline.cs Line 285-287
// Extract projectId from request if available
var projectId = request.ProjectId ?? "default";  // ❌ Assumes project storage

// Line 295-298
if (questionAnswerRules.Any())
{
    // ❌ ValidationPipeline should NOT load data based on projectId
    // This creates dependency on Playground storage infrastructure
}
```

From `ValidationRequest.cs` Line 48-57:
```csharp
/// <summary>
/// AUTHORING MODE ONLY: Project ID for loading project-specific master data (Questions, QuestionSets, etc.).
/// 
/// Runtime DLL consumers should leave this null and pass all configuration as JSON strings
/// (RulesJson, CodesJson, CodeMasterJson, ProjectJson).
/// 
/// When provided, the engine will attempt to load Questions/QuestionSets from a database,
/// which is only available in the Playground authoring environment.
/// </summary>
[JsonPropertyName("projectId")]
public string? ProjectId { get; set; }
```

**Impact:**
- ValidationPipeline cannot run standalone (requires Playground storage)
- Breaks pure function contract (input → deterministic output)
- Creates circular dependency (engine → playground storage)

**Recommended fix:**

**Remove ProjectId-based loading from ValidationPipeline:**

```csharp
// BEFORE (ValidationPipeline.cs Line 285-287)
var projectId = request.ProjectId ?? "default";

// AFTER: ValidationPipeline should NOT use ProjectId
// Instead, ValidationRequest must contain all data:

public class ValidationRequest
{
    // ✅ Runtime-friendly: Pass all data as JSON
    public string? QuestionsJson { get; set; }
    public string? QuestionSetsJson { get; set; }
    
    // ProjectId becomes metadata-only (not used for loading)
    // Playground uses it to load data, then passes data to engine
    [JsonPropertyName("projectId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ProjectId { get; set; }  // Metadata only
}
```

**Playground responsibility:**
```csharp
// ProjectService.cs (Playground)
public async Task<ValidationResponse> ValidateProjectAsync(Guid id, ...)
{
    var project = await _repository.GetAsync(id);  // ✅ Playground loads project
    
    // ✅ Load Questions/QuestionSets from file/database
    var questions = await _questionService.ListQuestionsAsync(id.ToString());
    var questionsJson = JsonSerializer.Serialize(questions);
    
    // ✅ Pass data to engine (no loading inside engine)
    var request = new ValidationRequest
    {
        BundleJson = bundleJson,
        RulesJson = project.RulesJson,
        QuestionsJson = questionsJson,  // ✅ Loaded by playground
        ProjectId = id.ToString()  // ✅ Metadata only
    };
    
    return await _validationPipeline.ValidateAsync(request);
}
```

---

### 🟡 VIOLATION 3: Static Logger Field (MEDIUM PRIORITY)

**Category:** Logging / State

**File:** `backend/src/Pss.FhirProcessor.Engine/Models/ValidationErrorDetailsValidator.cs`

**Lines:**
- Line 27: `private static ILogger? _logger;`
- Line 29-32: `public static void SetLogger(ILogger logger)`

**Why it violates engine contract:**

```csharp
// ValidationErrorDetailsValidator.cs Line 27-32
private static ILogger? _logger;

public static void SetLogger(ILogger logger)
{
    _logger = logger;
}
```

**Impact:**
- Static state violates statelessness
- Thread-unsafe (shared mutable state)
- Logger configuration leaks across instances
- Breaks unit test isolation

**Recommended fix:**

**Option A (Preferred): Convert to instance service**
```csharp
// Remove static fields
public class ValidationErrorDetailsValidator
{
    private readonly ILogger<ValidationErrorDetailsValidator> _logger;
    
    public ValidationErrorDetailsValidator(ILogger<ValidationErrorDetailsValidator> logger)
    {
        _logger = logger;
    }
    
    public ValidationError Validate(ValidationError error)
    {
        _logger.LogDebug("Validating error: {ErrorCode}", error.ErrorCode);
        // ...
    }
}

// Register in DI
services.AddScoped<ValidationErrorDetailsValidator>();
```

**Option B: Remove logging from validator**
```csharp
// Validators should be pure functions
// Move logging to callers (ValidationPipeline, ErrorBuilder)
```

---

### 🟡 VIOLATION 4: Authoring Features Mixed with Runtime Engine (MEDIUM PRIORITY)

**Category:** Responsibility / Boundary

**Files:**
- `backend/src/Pss.FhirProcessor.Engine/Authoring/*` (20+ files)
- Mixed into `ValidationPipeline.cs` (Line 100-120)

**Why it violates engine contract:**

The engine contains two distinct concerns without clear separation:

1. **Runtime validation** (DLL-safe, required):
   - Firely structural validation
   - FHIRPath business rules
   - CodeMaster validation
   - Reference validation

2. **Authoring-only features** (Playground-specific, optional):
   - LintValidationService
   - SpecHintService
   - SystemRuleSuggestionService
   - ValidationExplanationService

**Current state in ValidationPipeline.cs:**

```csharp
// Line 28-38
private readonly IJsonNodeStructuralValidator _structuralValidator;
private readonly ILintValidationService _lintService;  // ❌ Authoring-only
private readonly ISpecHintService _specHintService;    // ❌ Authoring-only
private readonly IFirelyValidationService _firelyService;  // ✅ Runtime
private readonly IFhirPathRuleEngine _ruleEngine;      // ✅ Runtime
private readonly ICodeMasterEngine _codeMasterEngine;  // ✅ Runtime
private readonly IReferenceResolver _referenceResolver;  // ✅ Runtime
private readonly IUnifiedErrorModelBuilder _errorBuilder;  // ✅ Runtime
private readonly ISystemRuleSuggestionService _suggestionService;  // ❌ Authoring-only
```

**Impact:**
- Confusing boundary for DLL consumers
- Authoring dependencies required even for runtime-only usage
- Larger DLL size (includes authoring code)

**Recommended fix:**

**Option A: Namespace separation (keep in same DLL)**
```
Pss.FhirProcessor.Engine.Runtime/
  - ValidationPipeline.cs (runtime-only version)
  - FirelyValidationService.cs
  - FhirPathRuleEngine.cs
  - CodeMasterEngine.cs
  - ReferenceResolver.cs

Pss.FhirProcessor.Engine.Authoring/
  - LintValidationService.cs
  - SpecHintService.cs
  - SystemRuleSuggestionService.cs
  - ValidationExplanationService.cs
```

**Option B: Separate projects (cleaner boundary)**
```
Pss.FhirProcessor.Engine/
  - Core validation only
  - No authoring dependencies
  
Pss.FhirProcessor.Engine.Authoring/
  - References Engine
  - Adds authoring features
  - Used only by Playground
```

**Option C: Optional services with null-safe checks**
```csharp
// ValidationPipeline.cs
public ValidationPipeline(
    IFirelyValidationService firelyService,  // Required
    IFhirPathRuleEngine ruleEngine,          // Required
    ICodeMasterEngine codeMasterEngine,      // Required
    IReferenceResolver referenceResolver,    // Required
    ILintValidationService? lintService = null,      // Optional
    ISpecHintService? specHintService = null,        // Optional
    ISystemRuleSuggestionService? suggestionService = null)  // Optional
{
    // Runtime consumers pass null for authoring services
}
```

---

### 🟢 VIOLATION 5: Embedded Resource Dependency (LOW PRIORITY)

**Category:** Environment

**File:** `backend/src/Pss.FhirProcessor.Engine/Pss.FhirProcessor.Engine.csproj`

**Lines:**
- Line 16-18

**Why it's a concern:**

```xml
<!-- Pss.FhirProcessor.Engine.csproj Line 16-18 -->
<ItemGroup>
  <EmbeddedResource Include="Catalogs\fhir-spec-hints-r4.json" />
</ItemGroup>
```

**Impact:**
- Engine embeds static catalog (fhir-spec-hints-r4.json)
- DLL size increases
- Cannot update catalog without recompiling DLL

**Recommended fix:**

**Option A: Pass catalog as JSON string**
```csharp
public class ValidationRequest
{
    public string? SpecHintCatalogJson { get; set; }  // Optional, defaults to embedded
}
```

**Option B: Keep embedded, allow override**
```csharp
public class SpecHintService
{
    public SpecHintService(
        Hl7SpecHintGenerator generator,
        ILogger<SpecHintService> logger,
        string? customCatalogJson = null)  // ✅ Allow override
    {
        // Use customCatalogJson if provided, otherwise embedded resource
    }
}
```

**Option C: No change (acceptable for authoring-only feature)**
- SpecHint is authoring-only feature
- Embedded resource is acceptable for authoring scenarios
- DLL consumers can disable SpecHint via ValidationMode="standard"

**Verdict:** LOW PRIORITY - Acceptable as-is, but allow override for flexibility

---

## 🛠 Required Refactors

Ordered by priority (high → low):

### 1️⃣ HIGH: Extract File I/O Services to Playground (MUST FIX BEFORE BACKEND REFACTOR)

**What:**
- Move `QuestionService`, `TerminologyService`, `QuestionSetService` to Playground.Api
- OR: Pass Questions/CodeSystems as JSON in ValidationRequest
- OR: Abstract storage behind interface (IQuestionRepository, ITerminologyRepository)

**Why:**
- Engine cannot run without file system
- Blocks offline/embedded/CI scenarios
- Violates DLL isolation

**When:**
- **Before backend refactor**
- **Before external DLL distribution**

**How:**
```csharp
// STEP 1: Add JSON fields to ValidationRequest
public class ValidationRequest
{
    public string? QuestionsJson { get; set; }
    public string? QuestionSetsJson { get; set; }
    public string? TerminologyJson { get; set; }
}

// STEP 2: Playground loads data and passes to engine
// ProjectService.cs (Playground)
var questions = await _questionService.ListQuestionsAsync(projectId);
var questionsJson = JsonSerializer.Serialize(questions);

var request = new ValidationRequest
{
    BundleJson = bundleJson,
    RulesJson = rulesJson,
    QuestionsJson = questionsJson  // ✅ Loaded by playground
};

// STEP 3: Engine parses JSON (no file I/O)
var questions = string.IsNullOrEmpty(request.QuestionsJson) 
    ? Array.Empty<Question>() 
    : JsonSerializer.Deserialize<Question[]>(request.QuestionsJson);
```

**Estimated effort:** 4-6 hours

---

### 2️⃣ HIGH: Remove ProjectId-Based Loading from ValidationPipeline (MUST FIX BEFORE BACKEND REFACTOR)

**What:**
- Remove `request.ProjectId` usage from ValidationPipeline
- Move project data loading to Playground
- ProjectId becomes metadata-only (not used for loading)

**Why:**
- ValidationPipeline should not load external data
- Breaks pure function contract
- Creates dependency on Playground storage

**When:**
- **Before backend refactor**
- **Before external DLL distribution**

**How:**
```csharp
// ValidationPipeline.cs (REMOVE)
var projectId = request.ProjectId ?? "default";  // ❌ REMOVE THIS

// ProjectService.cs (Playground)
public async Task<ValidationResponse> ValidateProjectAsync(Guid id, ...)
{
    var project = await _repository.GetAsync(id);
    
    // ✅ Load all data in playground
    var questions = await _questionService.ListQuestionsAsync(id.ToString());
    var questionsJson = JsonSerializer.Serialize(questions);
    
    var request = new ValidationRequest
    {
        BundleJson = bundleJson,
        RulesJson = project.RulesJson,
        QuestionsJson = questionsJson,
        ProjectId = id.ToString()  // ✅ Metadata only
    };
    
    return await _validationPipeline.ValidateAsync(request);
}
```

**Estimated effort:** 2-3 hours

---

### 3️⃣ MEDIUM: Fix Static Logger in ValidationErrorDetailsValidator

**What:**
- Convert ValidationErrorDetailsValidator to instance service
- OR: Remove logging from validator

**Why:**
- Static state breaks statelessness
- Thread-unsafe
- Breaks unit test isolation

**When:**
- After high-priority fixes
- Before production use

**How:**
```csharp
// Option A: Instance service
public class ValidationErrorDetailsValidator
{
    private readonly ILogger<ValidationErrorDetailsValidator> _logger;
    
    public ValidationErrorDetailsValidator(ILogger<ValidationErrorDetailsValidator> logger)
    {
        _logger = logger;
    }
}

// Option B: Remove logging
// Validators should be pure functions
```

**Estimated effort:** 1 hour

---

### 4️⃣ MEDIUM: Separate Authoring Features from Runtime Engine

**What:**
- Create clear namespace/project separation between runtime and authoring
- OR: Make authoring services optional (nullable constructor parameters)

**Why:**
- Clearer DLL boundary
- Smaller DLL for runtime-only consumers
- Better separation of concerns

**When:**
- After high-priority fixes
- Before external DLL distribution

**How:**
```csharp
// Option A: Namespace separation
Pss.FhirProcessor.Engine.Runtime/
Pss.FhirProcessor.Engine.Authoring/

// Option B: Optional services
public ValidationPipeline(
    IFirelyValidationService firelyService,  // Required
    ILintValidationService? lintService = null,      // Optional
    ISpecHintService? specHintService = null)        // Optional
```

**Estimated effort:** 3-4 hours

---

### 5️⃣ LOW: Allow SpecHint Catalog Override

**What:**
- Allow custom SpecHint catalog JSON (optional)
- Keep embedded resource as default

**Why:**
- Flexibility for DLL consumers
- Update catalog without recompiling

**When:**
- Optional enhancement
- Not required for DLL distribution

**How:**
```csharp
public class ValidationRequest
{
    public string? SpecHintCatalogJson { get; set; }  // Optional override
}
```

**Estimated effort:** 1 hour

---

## 🔐 Boundary Enforcement Recommendations

### Project References to Remove

**None required** - Current references are correct:
```
Playground.Api → Engine  ✅ (One-way, correct)
Engine → (no project dependencies)  ✅
```

### Interfaces to Introduce

**1. IQuestionRepository (Storage abstraction)**
```csharp
namespace Pss.FhirProcessor.Engine.Interfaces;

public interface IQuestionRepository
{
    Task<IEnumerable<Question>> ListQuestionsAsync(string projectId);
    Task<Question?> GetQuestionAsync(string projectId, string questionId);
}

// Playground provides file-based implementation
// DLL consumers provide in-memory or custom implementation
```

**2. ITerminologyRepository (Storage abstraction)**
```csharp
namespace Pss.FhirProcessor.Engine.Interfaces;

public interface ITerminologyRepository
{
    Task<CodeSystem?> GetCodeSystemByUrlAsync(string url, CancellationToken cancellationToken = default);
    Task<List<CodeSystem>> ListCodeSystemsAsync(string projectId, CancellationToken cancellationToken = default);
}
```

**3. IQuestionSetRepository (Storage abstraction)**
```csharp
namespace Pss.FhirProcessor.Engine.Interfaces;

public interface IQuestionSetRepository
{
    Task<IEnumerable<QuestionSet>> ListQuestionSetsAsync(string projectId);
    Task<QuestionSet?> GetQuestionSetAsync(string projectId, string questionSetId);
}
```

### Build-Time or CI Guards to Add

**1. Assembly Analyzer (detect prohibited dependencies)**
```xml
<!-- Pss.FhirProcessor.Engine.csproj -->
<ItemGroup>
  <PackageReference Include="Microsoft.CodeAnalysis.BannedApiAnalyzers" Version="3.3.4">
    <PrivateAssets>all</PrivateAssets>
    <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
  </PackageReference>
</ItemGroup>
```

**BannedSymbols.txt:**
```
F:System.IO.Directory
F:System.IO.File
F:System.Environment
T:Microsoft.EntityFrameworkCore.DbContext
T:Npgsql.NpgsqlConnection
T:Microsoft.AspNetCore.*
```

**2. Unit Test (verify standalone execution)**
```csharp
[Fact]
public async Task Engine_Runs_Without_FileSystem_Or_Database()
{
    // Arrange: Create engine without any storage dependencies
    var services = new ServiceCollection();
    services.AddLogging();
    services.AddFhirProcessorEngine();
    
    var provider = services.BuildServiceProvider();
    var pipeline = provider.GetRequiredService<IValidationPipeline>();
    
    var request = new ValidationRequest
    {
        BundleJson = sampleBundle,
        RulesJson = sampleRules,
        CodesJson = sampleCodes
        // ✅ No ProjectId, no file system access
    };
    
    // Act
    var response = await pipeline.ValidateAsync(request);
    
    // Assert
    Assert.NotNull(response);
    Assert.NotEmpty(response.Errors);
}
```

**3. Integration Test (verify DLL isolation)**
```csharp
[Fact]
public void Engine_DLL_Has_No_Prohibited_Dependencies()
{
    var assembly = typeof(IValidationPipeline).Assembly;
    var references = assembly.GetReferencedAssemblies();
    
    // ❌ Must not reference these
    var prohibited = new[]
    {
        "Microsoft.EntityFrameworkCore",
        "Npgsql",
        "Microsoft.AspNetCore"
    };
    
    foreach (var reference in references)
    {
        Assert.DoesNotContain(prohibited, p => reference.Name.StartsWith(p));
    }
}
```

---

## 📋 Audit Checklist

### 1️⃣ Assembly & Dependency Audit

✅ **PASS**: Engine has NO references to:
- ❌ Microsoft.AspNetCore.* (not found)
- ❌ Microsoft.EntityFrameworkCore.* (not found)
- ❌ Npgsql.* (not found)
- ❌ System.Web (not found)
- ❌ Blob/file storage SDKs (not found)

✅ **PASS**: Playground/API references Engine one-way only
- Playground.Api → Engine ✅
- Engine → (no project dependencies) ✅

⚠️ **WARNING**: Engine has file I/O dependencies:
- `System.IO.Directory` (used in QuestionService, TerminologyService)
- `System.IO.File` (used in QuestionService, TerminologyService)

---

### 2️⃣ Responsibility & Namespace Audit

❌ **VIOLATION**: Engine contains Playground-specific responsibilities:

| Code | Violation | Owner | Recommended Action |
|------|-----------|-------|-------------------|
| QuestionService.cs | Loads questions from file system | Playground | Extract to Playground or abstract storage |
| TerminologyService.cs | Loads CodeSystems from file system | Playground | Extract to Playground or abstract storage |
| QuestionSetService.cs | Loads question sets from file system | Playground | Extract to Playground or abstract storage |
| ValidationPipeline.cs (Line 285) | Uses ProjectId to load data | Playground | Remove ProjectId loading, pass data as JSON |

✅ **PASS**: Engine does NOT contain:
- ❌ User/tenant/environment concepts (not found)
- ❌ Coverage display logic (not found)

⚠️ **MIXED**: Engine contains authoring-only features:
- LintValidationService (authoring-only)
- SpecHintService (authoring-only)
- SystemRuleSuggestionService (authoring-only)
- ValidationExplanationService (authoring-only)

**Recommended:** Separate authoring from runtime or make optional

---

### 3️⃣ Public Entry-Point Audit

✅ **PASS**: Engine exposes single clear entry point:

```csharp
// IValidationPipeline.cs
public interface IValidationPipeline
{
    Task<ValidationResponse> ValidateAsync(
        ValidationRequest request, 
        CancellationToken cancellationToken = default);
}
```

✅ **PASS**: Validation contract verified:
- ✅ Engine does NOT load rules internally (rules passed in ValidationRequest.RulesJson)
- ✅ Engine does NOT mutate inputs (BundleJson is read-only)
- ❌ Engine does NOT depend on runtime state (**VIOLATION**: ProjectId loading, file I/O)
- ✅ Engine output is deterministic & serializable (ValidationResponse)

**Recommendations:**
- Fix ProjectId loading violation (high priority)
- Fix file I/O violations (high priority)

---

### 4️⃣ Logging Audit (DEEP)

✅ **PASS**: Logging dependencies verified:

| Service | Logger Type | Injection | Null Fallback | Verdict |
|---------|-------------|-----------|---------------|---------|
| ValidationPipeline | ILogger<ValidationPipeline> | Constructor | No (required) | ✅ PASS |
| FirelyValidationService | ILogger<FirelyValidationService> | Constructor | No (required) | ✅ PASS |
| FhirPathRuleEngine | ILogger<FhirPathRuleEngine> | Constructor | No (required) | ✅ PASS |
| FhirR4ModelResolverService | ILogger<FhirR4ModelResolverService> | Constructor | No (required) | ✅ PASS |
| LintValidationService | ILogger<LintValidationService> | Constructor | No (required) | ✅ PASS |
| SpecHintService | ILogger<SpecHintService> | Constructor | No (required) | ✅ PASS |
| SystemRuleSuggestionService | ILogger<SystemRuleSuggestionService> | Constructor | No (required) | ✅ PASS |

❌ **VIOLATION**: Static logger field found:
- `ValidationErrorDetailsValidator.cs` Line 27: `private static ILogger? _logger;`
- **Fix:** Convert to instance service or remove logging

✅ **PASS**: Logging characteristics verified:
- ✅ Logging is injected (via constructor)
- ✅ Logging is side-effect free (does not affect validation)
- ❌ Logging is NOT optional (services require ILogger)
- ✅ Engine does NOT configure logging providers
- ✅ Engine does NOT read appsettings.json
- ✅ Engine does NOT read environment variables
- ✅ Engine does NOT create LoggerFactory

**Verdict:**
- Logging architecture is correct (injected, not configured)
- Services require ILogger (not optional) - acceptable for DLL consumers (pass NullLogger)
- One static logger violation (medium priority fix)

**Recommended improvement:**
```csharp
// Allow null logger for minimal runtime scenarios
public ValidationPipeline(
    ILogger<ValidationPipeline>? logger = null)
{
    _logger = logger ?? NullLogger<ValidationPipeline>.Instance;
}
```

---

### 5️⃣ Storage & Configuration Leak Audit

✅ **PASS**: Engine does NOT use:
- ❌ Configuration files (appsettings.json) - not found
- ❌ Environment variables (Environment.GetEnvironmentVariable) - not found
- ❌ Static configuration - not found

❌ **VIOLATION**: Engine uses file I/O:
- `QuestionService.cs`: `File.ReadAllTextAsync`, `Directory.GetFiles`, `Directory.Exists`
- `TerminologyService.cs`: `File.ReadAllTextAsync`, `Directory.GetDirectories`, `Directory.Exists`
- `QuestionSetService.cs`: Similar file I/O patterns

✅ **PASS**: Engine does NOT use time-dependent logic:
- DateTimeOffset.UtcNow used only for metadata (CreatedAt/UpdatedAt)
- No validation decisions based on current time

**Verdict:**
- Configuration/environment: ✅ CLEAN
- File I/O: ❌ VIOLATION (high priority fix)
- Time-dependent logic: ✅ ACCEPTABLE (metadata only)

---

### 6️⃣ ValidationResult Contract Audit

✅ **PASS**: ValidationError contains only validation facts:

```csharp
public class ValidationError
{
    public required string Source { get; set; }  // ✅ Machine-readable
    public required string Severity { get; set; }  // ✅ Machine-readable
    public string? ErrorCode { get; set; }  // ✅ Machine-readable
    public string? Path { get; set; }  // ✅ Machine-readable
    public string? JsonPointer { get; set; }  // ✅ Machine-readable
    public required string Message { get; set; }  // ✅ Human-readable
    public Dictionary<string, object>? Details { get; set; }  // ✅ Machine-readable
    
    // ⚠️ Authoring-only features (nullable, optional)
    public ValidationIssueExplanation? Explanation { get; set; }  // ✅ Optional
    public string? Hint { get; set; }  // ✅ Optional
}
```

✅ **PASS**: ValidationError does NOT contain:
- ❌ UI copy (Explanation is optional and generated by ValidationExplanationService)
- ❌ "How to fix" instructions (Explanation.How is optional guidance, not instructions)
- ❌ Project-specific language (all messages are generic)

⚠️ **MIXED**: ValidationIssueExplanation is authoring-only:
```csharp
public class ValidationIssueExplanation
{
    public string What { get; set; }  // ⚠️ UX metadata
    public string How { get; set; }  // ⚠️ UX guidance
    public string Confidence { get; set; }  // ⚠️ Advisory metadata
}
```

**Verdict:**
- Core ValidationError contract: ✅ CLEAN
- Optional Explanation field: ⚠️ ACCEPTABLE (nullable, authoring-only)
- Runtime DLL consumers can ignore Explanation field

**Recommended:**
- Document that Explanation is authoring-only
- Set ValidationMode="standard" to skip explanation generation

---

## 🎯 Success Criteria

### ✅ Achieved

- [x] Engine can be compiled as standalone DLL
- [x] Engine has no ASP.NET dependencies
- [x] Engine has no EF Core/database dependencies
- [x] Engine accepts bundle + rules as input (ValidationRequest)
- [x] Engine logging is injected via ILogger<T>
- [x] Playground owns all persistence (ProjectRepository, ProjectService)
- [x] ValidationResponse contains only validation facts

### ❌ Not Achieved (Requires Fixes)

- [ ] Engine runs with no file system access (❌ QuestionService, TerminologyService use file I/O)
- [ ] Engine runs with no config files (✅ PASS - but file I/O blocks this)
- [ ] Engine logging is optional (⚠️ Services require ILogger - acceptable with NullLogger)
- [ ] Engine is stateless (❌ ProjectId loading, file I/O)

### 🔧 Required Fixes Before DLL Distribution

1. **HIGH**: Extract file I/O services to Playground (QuestionService, TerminologyService, QuestionSetService)
2. **HIGH**: Remove ProjectId-based loading from ValidationPipeline
3. **MEDIUM**: Fix static logger in ValidationErrorDetailsValidator
4. **MEDIUM**: Separate authoring features from runtime engine (or make optional)
5. **LOW**: Allow SpecHint catalog override (optional enhancement)

---

## 📊 Final Verdict

### Boundary Health: **CONDITIONAL PASS** ⚠️

**Can the engine be packaged as a DLL today?**
- Technically: Yes (compiles successfully)
- Functionally: No (requires file system and Playground infrastructure)

**Is the engine safe for distribution after fixes?**
- After HIGH priority fixes (1-2): **Yes** ✅
- After MEDIUM priority fixes (3-4): **Best practice** ✅
- After LOW priority fixes (5): **Nice to have** ✅

### Estimated Refactor Effort

| Priority | Task | Effort | Must-Have Before Backend Refactor? |
|----------|------|--------|-------------------------------------|
| HIGH | Extract file I/O services to Playground | 4-6 hours | ✅ YES |
| HIGH | Remove ProjectId loading from ValidationPipeline | 2-3 hours | ✅ YES |
| MEDIUM | Fix static logger | 1 hour | ⚠️ Recommended |
| MEDIUM | Separate authoring from runtime | 3-4 hours | ⚠️ Recommended |
| LOW | Allow SpecHint catalog override | 1 hour | ❌ No |
| **TOTAL** | **Critical path** | **6-9 hours** | |

### Recommended Timeline

**Phase 1 (Before backend refactor):**
- Fix file I/O violations (HIGH priority)
- Remove ProjectId loading (HIGH priority)
- Fix static logger (MEDIUM priority)
- **Estimated:** 1-2 days

**Phase 2 (Before external distribution):**
- Separate authoring features (MEDIUM priority)
- Add CI guards (assembly analyzer, unit tests)
- **Estimated:** 0.5-1 day

**Phase 3 (Optional enhancements):**
- Allow SpecHint catalog override (LOW priority)
- **Estimated:** 0.5 day

---

## 🚫 DO NOT

- ❌ Add new features during boundary fixes
- ❌ Change validation logic unless required to fix boundary violation
- ❌ Refactor for style only
- ❌ Introduce new dependencies to Engine
- ❌ Add configuration files to Engine
- ❌ Add database access to Engine

Focus solely on **architectural correctness and isolation**.

---

**END OF AUDIT**
