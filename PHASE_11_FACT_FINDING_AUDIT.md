# Phase 11 — Fact-Finding Audit (Step 0)

**Date**: January 11, 2026  
**Purpose**: Identify current architecture before implementing Firely Validator reintegration  
**Status**: ✅ COMPLETE

---

## 1. Validation Pipeline Entry Point

**File**: [backend/src/Pss.FhirProcessor.Engine/Core/ValidationPipeline.cs](backend/src/Pss.FhirProcessor.Engine/Core/ValidationPipeline.cs)

**Key Method**: `ValidateAsync(ValidationRequest, CancellationToken)` (Line 99)

**Pipeline Flow** (Lines 200-320):
```csharp
// Step 1: JSON Node Pre-Validation (structural)
var preValidationErrors = await _preValidator.ValidateAsync(...);

// Step 2: Firely Structural Validation (authoritative) ← CURRENTLY BASIC CHECKS ONLY
var firelyOutcome = await _firelyService.ValidateAsync(
    request.BundleJson, 
    request.FhirVersion, 
    request.BundleProfileStructureDefinitionJson,  // ← Profile JSON available
    request.BundleProfileCanonicalUrl,             // ← Profile URL available
    cancellationToken);

// Step 3: Parse to POCO Bundle
Bundle? bundle = ParseBundleWithContext(request.BundleJson);

// Step 3.5: Phase 2.2 SD Constraint Validation (CUSTOM) ← TO BE REPLACED
if (_sdValidationService != null && bundle != null)
{
    var sdErrors = await _sdValidationService.ValidateAsync(...);
}

// Step 4: Business Rules (FHIRPath)
// Step 5: CodeMaster (code system validation)
// Step 6: References (reference resolution)
```

**Current Invocation**: Line 215-220

**Dependencies Injected** (Lines 34-48):
- `IJsonNodePreValidator _preValidator`
- `ILintValidationService _lintService`
- `ISpecHintService? _specHintService` (optional, authoring-only)
- `IFirelyValidationService _firelyService` ← **CURRENTLY BASIC CHECKS ONLY**
- `IFhirPathRuleEngine _ruleEngine`
- `ICodeMasterEngine _codeMasterEngine`
- `IReferenceResolver _referenceResolver`
- `IUnifiedErrorModelBuilder _errorBuilder`
- `SdConstraintValidationService? _sdValidationService` ← **CUSTOM VALIDATOR**

---

## 2. Existing Firely Integration

### 2.1 Interface

**File**: [backend/src/Pss.FhirProcessor.Engine/Firely/IFirelyValidationService.cs](backend/src/Pss.FhirProcessor.Engine/Firely/IFirelyValidationService.cs)

```csharp
public interface IFirelyValidationService
{
    /// <summary>
    /// Validates raw FHIR bundle JSON against the FHIR R4 specification
    /// Returns OperationOutcome with ALL structural validation issues collected in one pass
    /// 
    /// When bundleProfileStructureDefinitionJson is provided, validates against the profile.
    /// When null, validates against base FHIR R4 (backward compatible).
    /// </summary>
    Task<OperationOutcome> ValidateAsync(
        string bundleJson, 
        string fhirVersion, 
        string? bundleProfileStructureDefinitionJson = null,
        string? bundleProfileCanonicalUrl = null,
        CancellationToken cancellationToken = default);
}
```

**Contract Notes**:
- ✅ Already accepts `bundleProfileStructureDefinitionJson` (Phase 8.4)
- ✅ Already accepts `bundleProfileCanonicalUrl` (Phase 8.4)
- ✅ Returns `OperationOutcome` (compatible with Firely Validator output)
- ✅ Async signature

### 2.2 Current Implementation

**File**: [backend/src/Pss.FhirProcessor.Engine/Firely/FirelyR5ValidationService.cs](backend/src/Pss.FhirProcessor.Engine/Firely/FirelyR5ValidationService.cs)

**Explicit Design Comments** (Lines 12-23):
```csharp
/// Phase 2.1: Firely is a SPEC PROVIDER, NOT A VALIDATOR.
/// This service:
/// - Parses R5 Bundle JSON to POCOs
/// - Loads StructureDefinitions via resolver
/// - Generates snapshots when needed
/// - Builds FirelyValidationContext for validation pipeline
/// 
/// Validation decisions remain in ValidationPipeline layers.
/// NO Validator.Validate() calls.
```

**What It Currently Does** (Lines 57-80):
1. Parses Bundle JSON to POCO (`FhirJsonParser`)
2. Builds composite resolver (package artifacts + core R5)
3. Validates profile exists (if provided)
4. Generates snapshots explicitly (`SnapshotGenerator.Update()`)
5. Performs **basic structural checks only** (Bundle.type required, entry.resource exists)

**What It Does NOT Do**:
- ❌ NO `Hl7.Fhir.Validation.Validator` usage
- ❌ NO cardinality enforcement
- ❌ NO binding enforcement
- ❌ NO invariant execution
- ❌ NO fixed value checks
- ❌ NO type checks
- ❌ NO reference target validation

**Resolver Construction** (Lines 100-150):
- Uses `ISimplifierPackageReader` to load project artifacts
- Combines with `ZipSource.CreateValidationSource()` (core R5 specs)
- Returns `CompositeResourceResolver`

---

## 3. Unified Error Model Builder

**File**: [backend/src/Pss.FhirProcessor.Engine/Authoring/UnifiedErrorModelBuilder.cs](backend/src/Pss.FhirProcessor.Engine/Authoring/UnifiedErrorModelBuilder.cs)

**Key Method**: `FromFirelyIssuesAsync(OperationOutcome, string, Bundle, CancellationToken)` (Line 73)

**Current Behavior**:
- ✅ Maps `OperationOutcome.Issue` list to `List<ValidationError>`
- ✅ Preserves ALL issues (no filtering except informational)
- ✅ Extracts severity, code, diagnostics, expression
- ✅ Uses `SmartPathNavigationService` for breadcrumb resolution
- ✅ Returns unified error model compatible with UI

**Invocation in Pipeline**: Line 281
```csharp
var firelyErrors = await _errorBuilder.FromFirelyIssuesAsync(
    firelyOutcome, 
    request.BundleJson, 
    bundle, 
    cancellationToken);
```

**Tests**: [backend/tests/Pss.FhirProcessor.Engine.Tests/UnifiedErrorModelBuilderTests.cs](backend/tests/Pss.FhirProcessor.Engine.Tests/UnifiedErrorModelBuilderTests.cs)
- ✅ 10+ test cases covering multi-issue scenarios
- ✅ Proves non-fail-fast behavior (Test: `FromFirelyIssuesAsync_MultipleIssues_ReturnsMultipleErrors`)

---

## 4. Bundle Profile Data Flow (Phase 8.4)

### 4.1 Request Model

**File**: [backend/src/Pss.FhirProcessor.Engine/Models/ValidationRequest.cs](backend/src/Pss.FhirProcessor.Engine/Models/ValidationRequest.cs)

**Key Fields** (Lines 112-122):
```csharp
/// <summary>
/// Bundle StructureDefinition profile JSON (optional).
/// When provided, the Bundle will be validated against this profile using Firely SDK.
/// </summary>
[JsonPropertyName("bundleProfileStructureDefinitionJson")]
public string? BundleProfileStructureDefinitionJson { get; set; }

/// <summary>
/// Canonical URL of the Bundle profile (optional).
/// Required when BundleProfileStructureDefinitionJson is provided.
/// </summary>
[JsonPropertyName("bundleProfileCanonicalUrl")]
public string? BundleProfileCanonicalUrl { get; set; }
```

**Data Source**: Populated by `ProjectValidationExecutionService` (Phase 8.1) via `BundleProfileResolutionService` (Phase 8.3/8.4)

### 4.2 Phase 8.4 Scoping

**States**:
- **RESOLVED**: Bundle profile found, project rules apply
- **UNRESOLVED**: Bundle profile not found, project rules skipped
- **UNPROFILED**: No bundle profile configured, project rules skipped

**Current Behavior** (ValidationPipeline):
- Firely validation runs with profile JSON/URL when RESOLVED
- Business rules (FHIRPath) conditional on scope
- Base FHIR validation always runs

---

## 5. Custom SD Constraint Validator

**File**: [backend/src/Pss.FhirProcessor.Engine/StructureDefinition/SdConstraintValidationService.cs](backend/src/Pss.FhirProcessor.Engine/StructureDefinition/SdConstraintValidationService.cs)

**Purpose**: Phase 2.2 custom implementation of SD constraint validation

**What It Currently Validates** (Lines 50-100):
- ✅ **Cardinality** (min/max) via `CardinalityValidator`
- ✅ **Fixed values** via `FixedValueValidator`
- ✅ **Required bindings** (required strength only) via `RequiredBindingValidator`
- ✅ **Pattern values** (primitives only) via `PatternValueValidator`

**What It Does NOT Validate**:
- ❌ **Invariants** (FHIRPath constraints) - deferred to FhirPathRuleEngine
- ❌ **Type constraints**
- ❌ **Slicing**
- ❌ **Reference targetProfile**
- ❌ **Extensible/Preferred/Example bindings**

**Enforcement Policy**: [backend/src/Pss.FhirProcessor.Engine/StructureDefinition/SdEnforcementPolicy.cs](backend/src/Pss.FhirProcessor.Engine/StructureDefinition/SdEnforcementPolicy.cs)
```csharp
public static readonly IReadOnlySet<SdConstraintKind> Enforced =
    new HashSet<SdConstraintKind>
    {
        SdConstraintKind.Cardinality,
        SdConstraintKind.FixedValue,
        SdConstraintKind.Pattern,
        SdConstraintKind.RequiredBinding
    };

public static readonly IReadOnlySet<SdConstraintKind> Deferred =
    new HashSet<SdConstraintKind>
    {
        SdConstraintKind.Invariant  // Handled by FhirPathRuleEngine
    };
```

**Risk**: Custom implementation may diverge from FHIR spec, miss edge cases

---

## 6. Dependency Injection Pattern

### 6.1 Registration Location

**File**: [backend/src/Pss.FhirProcessor.Engine/DependencyInjection/EngineServiceCollectionExtensions.cs](backend/src/Pss.FhirProcessor.Engine/DependencyInjection/EngineServiceCollectionExtensions.cs)

**Method**: `AddRuntimeValidation()` (Lines 31-95)

**Current Firely Registration** (Lines 68-71):
```csharp
// Phase 2.2: R5 Validator with Simplifier package support
services.AddScoped<ISimplifierPackageReader, SimplifierPackageReader>();
services.AddScoped<IFirelyValidationService, FirelyR5ValidationService>();
```

**Current SD Validator Registration** (Lines 73-80):
```csharp
// Phase 2.2-2.3: SD Constraint Validation (explicit, engine-owned)
services.AddScoped<SdValidation.SdConstraintExtractor>();
services.AddScoped<SdValidation.Validators.CardinalityValidator>();
services.AddScoped<SdValidation.Validators.FixedValueValidator>();
services.AddScoped<SdValidation.Validators.RequiredBindingValidator>();
services.AddScoped<SdValidation.Validators.PatternValueValidator>();
services.AddScoped<SdValidation.PathResolution.IElementPathResolver, ...>();
services.AddScoped<SdValidation.SdConstraintValidationService>();
```

**Playground Registration**: [backend/src/Pss.FhirProcessor.Playground.Api/Program.cs](backend/src/Pss.FhirProcessor.Playground.Api/Program.cs) Line 61
```csharp
builder.Services.AddFhirProcessorEngine();  // ← Includes AddRuntimeValidation()
```

### 6.2 Configuration

**File**: [backend/src/Pss.FhirProcessor.Playground.Api/appsettings.json](backend/src/Pss.FhirProcessor.Playground.Api/appsettings.json)

**Current Sections**:
- `ConnectionStrings.PostgreSQL`
- `Logging.LogLevel`
- `Serilog` configuration

**No Existing Feature Flags** for validation behavior

---

## 7. Key Findings Summary

### 7.1 Integration Points

✅ **Ready for Integration**:
1. `IFirelyValidationService` contract already accepts profile JSON/URL
2. `UnifiedErrorModelBuilder.FromFirelyIssuesAsync()` ready to map OperationOutcome
3. `ValidationPipeline` already calls Firely service at correct layer
4. Bundle profile data flows through `ValidationRequest` from Phase 8.4
5. DI registration pattern established in `EngineServiceCollectionExtensions`

❌ **Blocking Gaps**:
1. NO actual Firely Validator usage (only parsing/snapshot generation)
2. NO feature flag for toggling behavior
3. Custom `SdConstraintValidationService` will duplicate Firely validator work
4. NO existing `IFirelyProfileValidator` interface

### 7.2 Risk Assessment

**High Priority Risks**:
- **Double Validation**: Both Firely Validator and `SdConstraintValidationService` will run simultaneously
- **Inconsistent Results**: Custom validator may differ from Firely validator
- **Performance**: Running both validators doubles validation time

**Mitigation Strategy (Step 4)**:
- When feature flag is ON, disable `SdConstraintValidationService` execution
- Log: "SdConstraintValidationService skipped because Firely validator enabled"
- Keep custom validator in place for Phase 11 (removal is Phase 12+)

### 7.3 Architecture Notes

**Current Design** (Intentional):
- Firely SDK used as "spec provider" (parsing, resolvers, snapshots)
- Validation delegated to custom validators (Phase 2.2)
- Comments explicitly state "NOT A VALIDATOR" (Line 16)

**Phase 11 Change**:
- Reintroduce Firely SDK as authoritative validator
- Replace custom partial validation with full SD validation
- Preserve backward compatibility via feature flag

---

## 8. Implementation Readiness

✅ **Can Proceed**: All required architecture components identified

**No Blocking Questions**

**Next Step**: Proceed to Step 1 (Add feature flag)

---

**Audit Status**: COMPLETE  
**Confidence**: HIGH (all files inspected, no assumptions)
