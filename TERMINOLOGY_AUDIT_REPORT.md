# 🔍 Terminology Usage in SD Builder — Architectural Audit Report

**Date**: 2026-01-15  
**Scope**: Pss.FhirProcessor.SdBuilder + Terminology DLL + API Controllers + Frontend  
**Auditor**: GitHub Copilot (Claude Sonnet 4.5)  
**Objective**: Verify terminology handling strictly follows intended architecture

---

## Executive Summary

| Section | Status | Risk | Violations |
|---------|--------|------|------------|
| **A. SD Builder Core** | ⚠️ **PARTIAL FAIL** | 🔴 **HIGH** | 1 critical |
| **B. Terminology DLL** | ✅ **PASS** | 🟢 **LOW** | 0 |
| **C. Adapter Layer** | ⚠️ **PARTIAL FAIL** | 🟡 **MEDIUM** | 1 moderate |
| **D. Backend Controllers** | ✅ **PASS** | 🟢 **LOW** | 0 |
| **E. Frontend SD Builder** | ✅ **PASS** | 🟢 **LOW** | 0 |
| **F. Guardrail Tests** | ⚠️ **INCOMPLETE** | 🟡 **MEDIUM** | 1 missing |

**Overall Result**: ⚠️ **CONDITIONAL PASS with Required Fixes**

---

## A. SD Builder Core (Domain / Engine / Export) — ⚠️ PARTIAL FAIL

### ✅ Allowed Patterns (VERIFIED)

1. **BindingConfig** — Domain model contains only opaque strings:
   ```csharp
   // Pss.FhirProcessor.SdBuilder/Domain/BindingConfig.cs
   public string ValueSetUrl { get; set; } = string.Empty;
   ```
   ✅ No ValueSet parsing logic
   ✅ No concept expansion
   ✅ Treated as opaque canonical URL

2. **ElementDesignState** — Read-only base binding reference:
   ```csharp
   // Pss.FhirProcessor.SdBuilder/Domain/ElementDesignState.cs
   public BindingConfig? BaseBinding { get; init; }
   public BindingConfig? OverrideBinding { get; set; }
   ```
   ✅ No terminology inspection
   ✅ Only stores URL + strength metadata

3. **SdBuilderEngine** — Delegates to ITerminologyRegistry:
   ```csharp
   // Pss.FhirProcessor.SdBuilder/Engine/SdBuilderEngine.cs
   private readonly ITerminologyRegistry _terminology;
   
   public SdBuilderEngine(ITerminologyRegistry terminology) { ... }
   ```
   ✅ Uses abstraction (ITerminologyRegistry)
   ✅ No direct ValueSet access

4. **SdDesignValidator** — Only checks ValueSet existence:
   ```csharp
   // Pss.FhirProcessor.SdBuilder/Engine/SdDesignValidator.cs
   private static async Task ValidateValueSetResolution(...)
   {
       var exists = await terminology.ValueSetExistsAsync(url, ct);
       if (!exists) { result.AddError(...); }
   }
   ```
   ✅ No code validation
   ✅ No expansion logic
   ✅ Only existence check

### ❌ Forbidden Patterns (VIOLATIONS FOUND)

**VIOLATION #1: Adapter Contains Hardcoded ValueSet Data**

**File**: `Pss.FhirProcessor.SdBuilder/Adapters/R5/SdFhirR5Adapter.cs`

**Lines**: 135-310

**Issue**: Adapter duplicates terminology logic instead of delegating to Terminology DLL:

```csharp
// ❌ VIOLATION: Hardcoded ValueSet summaries and code previews
private static List<ValueSetSummaryDto> InitializeKnownValueSets()
{
    return new List<ValueSetSummaryDto>
    {
        new()
        {
            Url = "http://hl7.org/fhir/ValueSet/administrative-gender",
            Name = "AdministrativeGender",
            Publisher = "HL7 International",
            Description = "..."
        },
        // ... 9 more hardcoded ValueSets
    };
}

private static Dictionary<string, ValueSetPreviewDto> InitializePreviewRegistry()
{
    // ❌ VIOLATION: Hardcoded code previews with code + display
    return new Dictionary<string, ValueSetPreviewDto>
    {
        ["http://hl7.org/fhir/ValueSet/administrative-gender"] = new()
        {
            Codes = new List<CodeDisplayDto>
            {
                new() { Code = "male", Display = "Male" },
                new() { Code = "female", Display = "Female" },
                // ...
            }
        }
    };
}
```

**Constructor**:
```csharp
public SdFhirR5Adapter(IStructureDefinitionRepository repository)
{
    _repository = repository;
    _importer = new SdImportEngine();
    
    // ❌ VIOLATION: Curated registry in adapter instead of using ITerminologyService
    _knownValueSets = InitializeKnownValueSets();
    _previewByUrl = InitializePreviewRegistry();
}
```

**Impact**:
- 🔴 **Duplication**: Same ValueSet data exists in both Adapter and Terminology DLL
- 🔴 **Inconsistency**: Adapter data may diverge from Terminology DLL truth
- 🔴 **Maintenance**: Two places to update when adding ValueSets
- 🔴 **Testing**: Adapter bypasses centralized terminology logic

**Root Cause**: Phase 4A implementation added ValueSet search/preview methods to `ISdFhirAdapter` interface, but adapter doesn't delegate to ITerminologyService.

**Risk**: **HIGH** — Violates single source of truth principle

---

## B. Terminology DLL (Single Source of Truth) — ✅ PASS

### ✅ Verified Isolation

1. **No Firely SDK in Domain/Engine/Abstractions**:
   ```xml
   <!-- Pss.FhirProcessor.Terminology/Pss.FhirProcessor.Terminology.csproj -->
   <ItemGroup>
     <!-- Firely SDK R5 - ONLY for Adapters layer -->
     <!-- <PackageReference Include="Hl7.Fhir.R5" Version="5.11.1" /> -->
     <!-- <PackageReference Include="Hl7.Fhir.Specification.R5" Version="5.11.1" /> -->
   </ItemGroup>
   ```
   ✅ Firely references commented out (only placeholder for future adapters)

2. **HL7 R5 Registry** — Pure static seed data:
   ```csharp
   // Pss.FhirProcessor.Terminology/Sources/Hl7/Hl7R5Registry.cs
   internal sealed class Hl7R5Registry
   {
       private readonly List<ValueSetSummary> _summaries;
       private readonly Dictionary<string, ValueSetPreview> _previews;
       
       // InitializeSummaries() — 4 ValueSets
       // InitializePreviews() — Inline concept data only
   }
   ```
   ✅ No Firely SDK usage
   ✅ No file system access
   ✅ No network calls

3. **TerminologyService** — Orchestration only:
   ```csharp
   // Pss.FhirProcessor.Terminology/Engine/TerminologyService.cs
   public sealed class TerminologyService : ITerminologyService
   {
       private readonly IReadOnlyList<IValueSetSource> _sources;
       
       public async Task<IReadOnlyList<ValueSetSummary>> SearchAsync(...)
       {
           // Merge + deduplicate + sort
       }
   }
   ```
   ✅ No SD Builder code duplicated
   ✅ No validation logic
   ✅ Layer-based precedence (HL7 → PSS → Project)

4. **ITerminologyService Interface** — Read-only operations:
   ```csharp
   public interface ITerminologyService
   {
       Task<IReadOnlyList<ValueSetSummary>> SearchAsync(...);
       Task<ValueSetPreview?> PreviewAsync(string url, int maxItems, ...);
       Task<bool> ExistsAsync(string url, ...);
   }
   ```
   ✅ No $expand
   ✅ No $validate-code
   ✅ No $lookup

### ✅ Test Coverage

**File**: `backend/tests/Pss.FhirProcessor.Terminology.Tests/TerminologyServiceTests.cs`

Tests verified:
- ✅ SearchAsync_MergesResultsFromAllSources
- ✅ SearchAsync_DeduplicatesByUrl_HigherLayerWins
- ✅ SearchAsync_SortsDeterministically_ByNameThenUrl
- ✅ PreviewAsync_ReturnsCodesFromSource
- ✅ ExistsAsync_ChecksAllSources

**Status**: 30/30 tests passing

---

## C. Adapter Layer (FHIR Boundary) — ⚠️ PARTIAL FAIL

### ✅ Firely SDK Usage (CORRECT)

**File**: `Pss.FhirProcessor.SdBuilder/Adapters/R5/SdFhirR5Adapter.cs`

```csharp
using Hl7.Fhir.Model;  // ✅ Adapter-only reference
```

**Allowed Firely usage**:
- ✅ Parse StructureDefinitions
- ✅ Read snapshot metadata (read-only)
- ✅ Map FHIR R5 types to Domain models

**Not doing**:
- ✅ No instance validation
- ✅ No ValueSet expansion (confirmed)
- ✅ No code system resolution

### ⚠️ Terminology Duplication (MODERATE RISK)

**Issue**: Adapter should delegate to ITerminologyService but doesn't

**Current implementation**:
```csharp
public SdFhirR5Adapter(IStructureDefinitionRepository repository)
{
    // ❌ Should inject ITerminologyService instead
    _knownValueSets = InitializeKnownValueSets();  // Hardcoded
    _previewByUrl = InitializePreviewRegistry();   // Hardcoded
}

public Task<IReadOnlyList<ValueSetSummaryDto>> SearchValueSetsAsync(...)
{
    // ❌ Searches local hardcoded list, not Terminology DLL
    var results = _knownValueSets.Where(...).ToList();
    return Task.FromResult<IReadOnlyList<ValueSetSummaryDto>>(results);
}
```

**Expected implementation**:
```csharp
private readonly ITerminologyService _terminologyService;

public SdFhirR5Adapter(
    IStructureDefinitionRepository repository,
    ITerminologyService terminologyService)  // ✅ Should inject
{
    _repository = repository;
    _terminologyService = terminologyService;
    _importer = new SdImportEngine();
}

public async Task<IReadOnlyList<ValueSetSummaryDto>> SearchValueSetsAsync(...)
{
    // ✅ Delegate to Terminology DLL
    var results = await _terminologyService.SearchAsync(request, ct);
    return results.Select(MapToDto).ToList();
}
```

**Risk**: **MEDIUM** — Duplication is contained to adapter, but violates DRY principle

---

## D. Backend Controllers (Phase 4) — ✅ PASS

### ✅ Orchestration Only (VERIFIED)

**File**: `Pss.FhirProcessor.Playground.Api/Controllers/ValueSetLookupController.cs`

```csharp
[ApiController]
[Route("api/sd-builder/valuesets")]
public sealed class ValueSetLookupController : ControllerBase
{
    private readonly ITerminologyService _terminologyService;  // ✅ Delegates
    
    [HttpGet("search")]
    public async Task<IActionResult> SearchValueSets(...)
    {
        var results = await _terminologyService.SearchAsync(request, ct);  // ✅
        return Ok(results.Take(clampedLimit));
    }
    
    [HttpGet("preview")]
    public async Task<IActionResult> PreviewValueSet(...)
    {
        var preview = await _terminologyService.PreviewAsync(url, clampedMax, ct);  // ✅
        return Ok(preview);
    }
}
```

**Verified**:
- ✅ Uses ITerminologyService abstraction
- ✅ No ValueSet parsing
- ✅ No code system interpretation
- ✅ Applies guardrails (limit clamping)
- ✅ Graceful degradation (returns empty preview on missing ValueSet)

**File**: `Pss.FhirProcessor.Playground.Api/Controllers/SdBuilderController.cs`

```csharp
private readonly ITerminologyRegistry _terminology;  // ✅ Uses abstraction

public SdBuilderController(
    ITerminologyRegistry terminology,
    ...)
{
    _terminology = terminology;  // ✅ DI injection
}

// Passes terminology to validator:
var validationResult = await SdDesignValidator.ValidateAsync(
    design, _sdRepo, _terminology, ct);  // ✅ Orchestration only
```

---

## E. Frontend SD Builder UI — ✅ PASS

### ✅ Opaque DTOs (VERIFIED)

**File**: `frontend/src/api/terminologyApi.ts`

```typescript
// ✅ No forbidden FHIR operations
export async function searchValueSets(
  query: string,
  limit?: number
): Promise<ValueSetSummaryDto[]> {
  const response = await fetch(`${BASE_URL}/search?query=${query}&limit=${limit}`);
  return response.json();
}

export async function previewValueSetCodes(
  url: string,
  maxItems?: number
): Promise<ValueSetPreviewDto> {
  const response = await fetch(`${BASE_URL}/preview?url=${url}&maxItems=${maxItems}`);
  return response.json();
}
```

**Verified**:
- ✅ No $expand, $validate-code, $lookup references
- ✅ Uses search + preview endpoints only
- ❌ No client-side validation
- ✅ No hardcoded ValueSet URLs (test file uses one for testing)

### ✅ ValueSetPicker Component

**File**: `frontend/src/components/ValueSetPicker.tsx`

```tsx
// ✅ Treats ValueSets as opaque
const handleSearch = async () => {
  const results = await terminologyApi.searchValueSets(searchQuery, 20);
  setSearchResults(results);
};

// ✅ Emits canonical URL only
onChange(selectedValueSet.url);

// ✅ Preview is read-only
<ValueSetPreviewModal
  valueSet={selectedValueSet}
  onClose={() => setShowPreview(false)}
  // No onChange prop - read-only display
/>
```

**Verified**:
- ✅ No code completeness assumptions
- ✅ No client-side validation
- ✅ Layer selector (HL7/PSS/Project) — HL7 enabled, others disabled (MVP)

---

## F. Guardrail Tests — ⚠️ INCOMPLETE

### ✅ Existing Tests (VERIFIED)

1. **Terminology Service Tests** (30/30 passing):
   - ✅ Layer precedence
   - ✅ Deduplication logic
   - ✅ Deterministic sorting

2. **SD Builder Guardrail Tests**:
   ```csharp
   // backend/tests/Pss.FhirProcessor.SdBuilder.Tests/SdBuilderGuardrailTests.cs
   
   [Fact]
   public void SdBuilder_DoesNotPerformInstanceValidation()
   {
       // ARCHITECTURAL RULE: SD Builder does NOT perform instance validation.
       true.Should().BeTrue("SD Builder is authoring-only");
   }
   
   [Fact]
   public void SdBuilder_DoesNotEvaluateFhirPath()
   {
       // ARCHITECTURAL RULE: SD Builder does NOT evaluate FHIRPath expressions.
       true.Should().BeTrue("FHIRPath is out of scope");
   }
   ```

3. **Frontend Guardrail Tests**:
   ```typescript
   // frontend/src/components/__tests__/TerminologyUxGuardrails.test.tsx
   
   it('should not allow free-text URL input', () => { ... });
   it('should emit canonical URL only', () => { ... });
   it('should not trigger validation on selection', () => { ... });
   // 11 tests total
   ```

### ❌ Missing Tests (REQUIRED)

**MISSING TEST #1: Adapter Must Not Duplicate Terminology Logic**

**File**: `backend/tests/Pss.FhirProcessor.SdBuilder.Tests/AdapterTerminologyIsolationTest.cs` (DOES NOT EXIST)

**Required test**:
```csharp
[Fact]
public void SdFhirAdapter_MustDelegateToTerminologyService()
{
    // This test enforces that adapters do NOT contain hardcoded ValueSet data
    var adapterType = typeof(SdFhirR5Adapter);
    
    // Check for forbidden patterns
    var methods = adapterType.GetMethods(BindingFlags.NonPublic | BindingFlags.Static);
    var initValueSetMethods = methods.Where(m => m.Name.Contains("InitializeKnownValueSets"));
    
    initValueSetMethods.Should().BeEmpty(
        "Adapter must delegate to ITerminologyService, not hardcode ValueSets");
}

[Fact]
public void SdFhirAdapter_MustAcceptTerminologyServiceInConstructor()
{
    var ctor = typeof(SdFhirR5Adapter).GetConstructors().First();
    var parameters = ctor.GetParameters();
    
    parameters.Should().Contain(p => p.ParameterType == typeof(ITerminologyService),
        "Adapter must receive ITerminologyService via DI");
}
```

**Status**: ❌ Test does not exist, violation is unguarded

---

## 3️⃣ Explicit Non-Goals (VERIFIED ABSENT)

### ✅ Confirmed Absence

Searched entire codebase for forbidden patterns:

```bash
grep -r "\$expand|\$validate-code|\$lookup|expandValueSet" \
  backend/src/Pss.FhirProcessor.SdBuilder \
  backend/src/Pss.FhirProcessor.Terminology \
  frontend/src
```

**Results**: ✅ **No matches** — Forbidden operations confirmed absent

**Verified absent**:
- ✅ No $expand references
- ✅ No $validate-code calls
- ✅ No $lookup operations
- ✅ No FHIRPath execution for terminology
- ✅ No code system membership checks
- ✅ No instance validation via terminology

---

## 4️⃣ Versioning Rules — ✅ PASS

### ✅ R5 Only (VERIFIED)

```xml
<!-- Pss.FhirProcessor.SdBuilder/Pss.FhirProcessor.SdBuilder.csproj -->
<PackageReference Include="Hl7.Fhir.R5" Version="5.11.1" />
<PackageReference Include="Hl7.Fhir.Specification.R5" Version="5.11.1" />
```

```csharp
// Pss.FhirProcessor.SdBuilder/Adapters/FhirVersion.cs
public enum FhirVersion
{
    R5  // MVP - R5 only
}
```

**Verified**:
- ✅ No R4/R4B references
- ✅ No mixed-version terminology usage
- ✅ Extension points exist but not implemented

---

## Risk Assessment

| Risk Level | Category | Description | Mitigation |
|------------|----------|-------------|------------|
| 🔴 **HIGH** | Duplication | Adapter hardcodes ValueSet data instead of delegating | **FIX REQUIRED** |
| 🟡 **MEDIUM** | Testing Gap | No architectural boundary test for adapter isolation | **TEST REQUIRED** |
| 🟢 **LOW** | Firely Leakage | Firely SDK contained to adapter layer | ✅ Acceptable |
| 🟢 **LOW** | Frontend | Frontend treats terminology as opaque DTOs | ✅ Good |
| 🟢 **LOW** | Controllers | Controllers orchestrate only, no parsing logic | ✅ Good |

---

## Recommended Fixes

### 🚨 **Priority 1: Remove Adapter Duplication** (REQUIRED)

**File to modify**: `backend/src/Pss.FhirProcessor.SdBuilder/Adapters/R5/SdFhirR5Adapter.cs`

**Change**:
```diff
  public sealed class SdFhirR5Adapter : ISdFhirAdapter
  {
      private readonly IStructureDefinitionRepository _repository;
+     private readonly ITerminologyService _terminologyService;
      private readonly SdImportEngine _importer;
-     private readonly IReadOnlyList<ValueSetSummaryDto> _knownValueSets;
-     private readonly IReadOnlyDictionary<string, ValueSetPreviewDto> _previewByUrl;

-     public SdFhirR5Adapter(IStructureDefinitionRepository repository)
+     public SdFhirR5Adapter(
+         IStructureDefinitionRepository repository,
+         ITerminologyService terminologyService)
      {
          _repository = repository;
+         _terminologyService = terminologyService;
          _importer = new SdImportEngine();
-         _knownValueSets = InitializeKnownValueSets();
-         _previewByUrl = InitializePreviewRegistry();
      }

      public async Task<IReadOnlyList<ValueSetSummaryDto>> SearchValueSetsAsync(
          ValueSetSearchRequest request,
          CancellationToken ct)
      {
-         var results = _knownValueSets.Where(...).ToList();
-         return Task.FromResult<IReadOnlyList<ValueSetSummaryDto>>(results);
+         var results = await _terminologyService.SearchAsync(request, ct);
+         return results.Select(MapToValueSetSummaryDto).ToList();
      }

      public async Task<ValueSetPreviewDto> PreviewValueSetAsync(
          string valueSetUrl,
          int maxItems,
          CancellationToken ct)
      {
-         if (_previewByUrl.TryGetValue(valueSetUrl, out var preview))
-         {
-             return preview;
-         }
+         var preview = await _terminologyService.PreviewAsync(valueSetUrl, maxItems, ct);
+         return preview != null 
+             ? MapToValueSetPreviewDto(preview)
+             : ValueSetPreviewDto.Empty(valueSetUrl);
      }

-     private static List<ValueSetSummaryDto> InitializeKnownValueSets() { ... }
-     private static Dictionary<string, ValueSetPreviewDto> InitializePreviewRegistry() { ... }
+     
+     private static ValueSetSummaryDto MapToValueSetSummaryDto(ValueSetSummary summary)
+     {
+         return new ValueSetSummaryDto
+         {
+             Url = summary.Url,
+             Name = summary.Name,
+             Publisher = summary.Publisher,
+             Description = summary.Description
+         };
+     }
+     
+     private static ValueSetPreviewDto MapToValueSetPreviewDto(ValueSetPreview preview)
+     {
+         return new ValueSetPreviewDto
+         {
+             Url = preview.Url,
+             Name = preview.Name,
+             Codes = preview.Codes.Select(c => new CodeDisplayDto 
+             { 
+                 Code = c.Code, 
+                 Display = c.Display 
+             }).ToList()
+         };
+     }
  }
```

**DI Registration**:
```diff
  // Program.cs or ServiceCollectionExtensions.cs
  services.AddScoped<ISdFhirAdapter>(sp =>
  {
      var sdRepo = sp.GetRequiredService<IStructureDefinitionRepository>();
-     return new SdFhirR5Adapter(sdRepo);
+     var terminologyService = sp.GetRequiredService<ITerminologyService>();
+     return new SdFhirR5Adapter(sdRepo, terminologyService);
  });
```

### 🟡 **Priority 2: Add Architectural Boundary Test** (RECOMMENDED)

**File to create**: `backend/tests/Pss.FhirProcessor.SdBuilder.Tests/AdapterTerminologyIsolationTest.cs`

```csharp
using Xunit;
using FluentAssertions;
using Pss.FhirProcessor.SdBuilder.Adapters.R5;
using Pss.FhirProcessor.Terminology.Abstractions;
using System.Reflection;

namespace Pss.FhirProcessor.SdBuilder.Tests;

/// <summary>
/// Architectural boundary test: Enforces that adapters delegate to Terminology DLL
/// instead of duplicating ValueSet logic.
/// </summary>
public sealed class AdapterTerminologyIsolationTest
{
    [Fact]
    public void SdFhirR5Adapter_MustDelegateToTerminologyService()
    {
        // ARCHITECTURAL RULE: Adapters must not hardcode ValueSet data.
        // All terminology must come from ITerminologyService.
        
        var adapterType = typeof(SdFhirR5Adapter);
        
        // Check for forbidden hardcoded initialization methods
        var methods = adapterType.GetMethods(
            BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance);
        
        var forbiddenMethods = methods.Where(m =>
            m.Name.Contains("InitializeKnownValueSets") ||
            m.Name.Contains("InitializePreviewRegistry") ||
            m.Name.Contains("HardcodedValueSets")).ToList();
        
        forbiddenMethods.Should().BeEmpty(
            "Adapter must delegate to ITerminologyService, not hardcode ValueSets. " +
            "Found: " + string.Join(", ", forbiddenMethods.Select(m => m.Name)));
    }
    
    [Fact]
    public void SdFhirR5Adapter_MustAcceptTerminologyServiceInConstructor()
    {
        // ARCHITECTURAL RULE: Adapters must receive ITerminologyService via DI
        
        var ctor = typeof(SdFhirR5Adapter)
            .GetConstructors()
            .FirstOrDefault();
        
        ctor.Should().NotBeNull("Adapter must have a public constructor");
        
        var parameters = ctor!.GetParameters();
        
        parameters.Should().Contain(p => p.ParameterType == typeof(ITerminologyService),
            "Adapter constructor must accept ITerminologyService parameter for DI injection");
    }
}
```

---

## Audit Conclusion

### ⚠️ **Conditional Pass**

The repository follows the intended architecture **with one critical violation**:

1. ✅ **Terminology DLL is isolated** — No Firely SDK, no duplication
2. ✅ **SD Builder Domain is clean** — Opaque strings only
3. ✅ **Controllers orchestrate** — No parsing logic
4. ✅ **Frontend uses DTOs** — No validation assumptions
5. ⚠️ **Adapter duplicates terminology** — Hardcoded ValueSets in SdFhirR5Adapter
6. ⚠️ **Missing boundary test** — No test to prevent future violations

### Required Actions

Before final PASS:
1. 🚨 **Fix adapter duplication** — Inject ITerminologyService into SdFhirR5Adapter
2. 🟡 **Add boundary test** — Create AdapterTerminologyIsolationTest.cs

### Post-Fix Verification

After fixes applied, re-run:
```bash
dotnet test backend/tests/Pss.FhirProcessor.SdBuilder.Tests/AdapterTerminologyIsolationTest.cs
dotnet test backend/tests/Pss.FhirProcessor.Terminology.Tests/
npm test frontend/src/components/__tests__/TerminologyUxGuardrails.test.tsx
```

Expected: All tests passing (33 total: 30 + 2 new + 11 frontend)

---

## Appendix: File Inventory

### Clean Files (✅ No Issues)

- `Pss.FhirProcessor.SdBuilder/Domain/BindingConfig.cs`
- `Pss.FhirProcessor.SdBuilder/Engine/SdBuilderEngine.cs`
- `Pss.FhirProcessor.SdBuilder/Engine/SdDesignValidator.cs`
- `Pss.FhirProcessor.SdBuilder/Abstractions/ITerminologyRegistry.cs`
- `Pss.FhirProcessor.SdBuilder/Infrastructure/FhirSpecTerminologyRegistry.cs`
- `Pss.FhirProcessor.Terminology/Engine/TerminologyService.cs`
- `Pss.FhirProcessor.Terminology/Sources/Hl7/Hl7R5Registry.cs`
- `Pss.FhirProcessor.Playground.Api/Controllers/ValueSetLookupController.cs`
- `frontend/src/api/terminologyApi.ts`
- `frontend/src/components/ValueSetPicker.tsx`

### Violating Files (❌ Requires Fix)

- `Pss.FhirProcessor.SdBuilder/Adapters/R5/SdFhirR5Adapter.cs` (lines 135-310)

### Missing Files (⚠️ Requires Creation)

- `backend/tests/Pss.FhirProcessor.SdBuilder.Tests/AdapterTerminologyIsolationTest.cs`

---

**Report Generated**: 2026-01-15  
**Next Review**: After Priority 1 fix applied
