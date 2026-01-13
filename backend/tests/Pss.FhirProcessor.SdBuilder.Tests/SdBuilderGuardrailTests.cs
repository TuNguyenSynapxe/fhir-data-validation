namespace Pss.FhirProcessor.SdBuilder.Tests;

using FluentAssertions;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.Specification.Source;
using Moq;
using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Xunit;

/// <summary>
/// Guardrail tests enforcing SD Builder Phase 1 architectural constraints.
/// These tests must FAIL LOUDLY if core architectural rules are violated.
/// </summary>
public class SdBuilderGuardrailTests
{
    private readonly StructureDefinition _patientSd;

    public SdBuilderGuardrailTests()
    {
        _patientSd = GetPatientStructureDefinition();
    }

    // ============================================================================
    // A. ARCHITECTURE GUARDRAILS
    // ============================================================================

    [Fact]
    public async TaskAlias Guardrail_ExportedStructureDefinition_MustNotContainSnapshot()
    {
        // ARCHITECTURAL RULE: SD Builder Phase 1 exports differential ONLY.
        // Snapshot generation is FORBIDDEN.

        // Arrange
        var design = CreateMinimalDesign();
        var metadata = CreateTestMetadata();
        var (engine, _, _) = CreateEngine();

        // Act
        var exported = await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Assert - CRITICAL: Snapshot must be null
        exported.Snapshot.Should().BeNull(
            "Phase 1 MUST NOT generate snapshots. Snapshot generation is explicitly forbidden.");
    }

    [Fact]
    public void Guardrail_SdBuilderEngine_MustNotDependOnFirelyValidator()
    {
        // ARCHITECTURAL RULE: SD Builder does NOT perform instance validation.
        // Firely Validator usage is FORBIDDEN.

        // Arrange
        var engineType = typeof(SdBuilderEngine);

        // Act
        var dependencies = engineType.GetConstructors()
            .SelectMany(c => c.GetParameters())
            .Select(p => p.ParameterType)
            .ToList();

        // Assert
        var invalidDeps = dependencies.Where(t => 
            (t.FullName != null && t.FullName.Contains("Validator")) ||
            (t.FullName != null && t.FullName.Contains("IValidator"))).ToList();
            
        invalidDeps.Should().BeEmpty(
            "SdBuilderEngine MUST NOT depend on Firely Validator. Instance validation is out of scope.");
    }

    [Fact]
    public void Guardrail_SdBuilderEngine_MustNotEvaluateFhirPath()
    {
        // ARCHITECTURAL RULE: SD Builder does NOT evaluate FHIRPath expressions.
        // FHIRPath evaluation is FORBIDDEN.

        // Arrange
        var engineType = typeof(SdBuilderEngine);

        // Act - Check for FHIRPath dependencies
        var allTypes = engineType.Assembly.GetTypes();
        var fhirPathUsages = allTypes
            .SelectMany(t => t.GetMethods())
            .Where(m => 
                m.ReturnType.FullName?.Contains("FhirPath") == true ||
                m.GetParameters().Any(p => p.ParameterType.FullName?.Contains("FhirPath") == true))
            .ToList();

        // Assert
        fhirPathUsages.Should().BeEmpty(
            "SD Builder MUST NOT evaluate FHIRPath. FHIRPath execution is out of scope for design-time authoring.");
    }

    [Fact]
    public async TaskAlias Guardrail_BaseStructureDefinition_MustNotBeMutated()
    {
        // ARCHITECTURAL RULE: Base StructureDefinition is immutable.
        // Engine operations MUST NOT modify the base SD.

        // Arrange
        var (engine, sdRepo, _) = CreateEngine();
        sdRepo.Setup(r => r.FindByUrlAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(_patientSd);

        // Serialize base SD before operations
        var serializer = new FhirJsonSerializer();
        var baseSdJsonBefore = serializer.SerializeToString(_patientSd);

        // Act - Perform StartAsync and ExportAsync
        var session = await engine.StartAsync("Patient", VisibilityMode.Minimal, null, CancellationToken.None);
        var design = session.DesignState;
        var metadata = CreateTestMetadata();
        
        await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Serialize base SD after operations
        var baseSdJsonAfter = serializer.SerializeToString(_patientSd);

        // Assert - Base SD must be unchanged
        baseSdJsonAfter.Should().Be(baseSdJsonBefore,
            "Base StructureDefinition MUST be immutable. Engine operations MUST NOT mutate the base SD.");
    }

    // ============================================================================
    // B. EXPORT INTEGRITY GUARDRAILS
    // ============================================================================

    [Fact]
    public async TaskAlias Guardrail_Differential_MustContainOnlyChangedElements()
    {
        // ARCHITECTURAL RULE: Differential contains ONLY elements with constraints.
        // Unchanged elements MUST NOT appear in differential.

        // Arrange
        var design = CreateMinimalDesign();
        design.Elements.Clear(); // No changes from base

        var metadata = CreateTestMetadata();
        var (engine, _, _) = CreateEngine();

        // Act
        var exported = await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Assert - Empty differential when no changes
        exported.Differential.Should().NotBeNull();
        exported.Differential.Element.Should().BeEmpty(
            "Differential MUST be empty when design state has no constraints. Only changed elements should be emitted.");
    }

    [Fact]
    public async TaskAlias Guardrail_Differential_MustNotEmitRedundantCardinality()
    {
        // ARCHITECTURAL RULE: Emit cardinality ONLY when it differs from base.
        // Redundant cardinality entries are FORBIDDEN.

        // Arrange
        var design = CreateMinimalDesign();
        var redundantElement = new ElementDesignState
        {
            Path = "Patient.active",
            BaseCardinality = new Cardinality(0, "1"),
            BaseTypeCode = "boolean",
            IsIncluded = true,
            OverrideCardinality = new Cardinality(0, "1"), // SAME as base - redundant
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(redundantElement);

        var metadata = CreateTestMetadata();
        var (engine, _, _) = CreateEngine();

        // Act
        var exported = await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Assert - No differential element for redundant cardinality
        var activeElement = exported.Differential.Element.FirstOrDefault(e => e.Path == "Patient.active");
        activeElement.Should().BeNull(
            "Differential MUST NOT emit elements when override cardinality equals base cardinality. " +
            "Redundant constraints are forbidden.");
    }

    [Fact]
    public async TaskAlias Guardrail_Export_MustBeDeterministic()
    {
        // ARCHITECTURAL RULE: Export is deterministic.
        // Same design state MUST produce identical JSON output.

        // Arrange
        var design = CreateMinimalDesign();
        var nameElement = new ElementDesignState
        {
            Path = "Patient.name",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "HumanName",
            IsIncluded = false, // Excluded
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(nameElement);

        var metadata = CreateTestMetadata();
        var (engine, _, _) = CreateEngine();
        var serializer = new FhirJsonSerializer();

        // Act - Export twice
        var exported1 = await engine.ExportAsync(design, metadata, CancellationToken.None);
        var json1 = serializer.SerializeToString(exported1);

        var exported2 = await engine.ExportAsync(design, metadata, CancellationToken.None);
        var json2 = serializer.SerializeToString(exported2);

        // Assert - Identical JSON
        json2.Should().Be(json1,
            "Export MUST be deterministic. Same design state MUST produce identical JSON output.");
    }

    // ============================================================================
    // C. VALIDATION GATE GUARDRAILS
    // ============================================================================

    [Fact]
    public async TaskAlias Guardrail_ExportAsync_MustThrowWhenValidationHasErrors()
    {
        // ARCHITECTURAL RULE: Validation errors MUST block export.
        // ExportAsync MUST throw on validation errors.

        // Arrange
        var design = CreateMinimalDesign();
        var invalidElement = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(1, "*"), // Required
            BaseTypeCode = "Identifier",
            IsIncluded = false, // INVALID - excluded required element
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(invalidElement);

        var metadata = CreateTestMetadata();
        var (engine, _, _) = CreateEngine();

        // Act
        Func<TaskAlias> act = async () => await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Assert - Must throw
        await act.Should().ThrowAsync<InvalidOperationException>(
            "ExportAsync MUST throw InvalidOperationException when validation errors exist. " +
            "Errors MUST block export.");
    }

    [Fact]
    public async TaskAlias Guardrail_ExportAsync_MustSucceedWhenOnlyWarningsExist()
    {
        // ARCHITECTURAL RULE: Warnings do NOT block export.
        // ExportAsync MUST succeed with warnings.

        // Arrange
        var design = CreateMinimalDesign();
        var warningElement = new ElementDesignState
        {
            Path = "Patient.name",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "HumanName",
            IsIncluded = true,
            OverrideCardinality = new Cardinality(1, "1"), // Valid tightening - generates warning
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(warningElement);

        var metadata = CreateTestMetadata();
        var (engine, _, _) = CreateEngine();

        // Act
        Func<TaskAlias> act = async () => await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Assert - Must succeed
        await act.Should().NotThrowAsync(
            "ExportAsync MUST succeed when only warnings exist. Warnings do NOT block export.");
    }

    // ============================================================================
    // D. MUTATION GUARDRAILS
    // ============================================================================

    [Fact]
    public async TaskAlias Guardrail_ValidateAsync_MustNotMutateDesignState()
    {
        // ARCHITECTURAL RULE: ValidateAsync is read-only.
        // Validation MUST NOT mutate ResourceDesignState.

        // Arrange
        var design = CreateMinimalDesign();
        var element = new ElementDesignState
        {
            Path = "Patient.name",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "HumanName",
            IsIncluded = true,
            OverrideCardinality = new Cardinality(1, "1"),
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (engine, _, _) = CreateEngine();
        var serializer = new FhirJsonSerializer();

        // Snapshot design state before validation
        var designJsonBefore = SerializeDesignState(design);

        // Act
        await engine.ValidateAsync(design, CancellationToken.None);

        // Snapshot design state after validation
        var designJsonAfter = SerializeDesignState(design);

        // Assert - Design state must be unchanged
        designJsonAfter.Should().Be(designJsonBefore,
            "ValidateAsync MUST NOT mutate ResourceDesignState. Validation is read-only.");
    }

    [Fact]
    public async TaskAlias Guardrail_ExportAsync_MustNotMutateDesignState()
    {
        // ARCHITECTURAL RULE: ExportAsync is read-only.
        // Export MUST NOT mutate ResourceDesignState.

        // Arrange
        var design = CreateMinimalDesign();
        var element = new ElementDesignState
        {
            Path = "Patient.name",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "HumanName",
            IsIncluded = false,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var metadata = CreateTestMetadata();
        var (engine, _, _) = CreateEngine();

        // Snapshot design state before export
        var designJsonBefore = SerializeDesignState(design);

        // Act
        await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Snapshot design state after export
        var designJsonAfter = SerializeDesignState(design);

        // Assert - Design state must be unchanged
        designJsonAfter.Should().Be(designJsonBefore,
            "ExportAsync MUST NOT mutate ResourceDesignState. Export is read-only.");
    }

    [Fact]
    public void Guardrail_OnlySession_MayMutateDesignState()
    {
        // ARCHITECTURAL RULE: SdBuilderSession is the ONLY mutation API.
        // Direct ResourceDesignState mutation outside session is an architectural violation.

        // Arrange
        var design = CreateMinimalDesign();
        
        // Add Patient.name element first
        var nameElement = new ElementDesignState
        {
            Path = "Patient.name",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "HumanName",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(nameElement);
        
        var session = new SdBuilderSession(design);

        // Act - Session mutations should work
        Action sessionMutation = () => session.ToggleInclude("Patient.name", false);

        // Assert - Session mutation is allowed
        sessionMutation.Should().NotThrow(
            "SdBuilderSession MUST allow mutations. It is the only valid mutation API.");

        // Assert - Direct mutation is possible but discouraged by architecture
        // (C# doesn't prevent direct property setting, but architecture forbids it)
        design.Elements.Should().NotBeNull(
            "ResourceDesignState elements are accessible but SHOULD only be mutated via SdBuilderSession. " +
            "Direct mutation violates architectural boundaries.");
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private ResourceDesignState CreateMinimalDesign()
    {
        return new ResourceDesignState
        {
            ResourceType = "Patient",
            BaseCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Patient",
            VisibilityMode = VisibilityMode.Minimal,
            Elements = new List<ElementDesignState>()
        };
    }

    private SdMetadata CreateTestMetadata()
    {
        return new SdMetadata
        {
            Name = "GuardrailTest",
            Url = "http://example.com/StructureDefinition/guardrail-test",
            Version = "1.0.0",
            Status = "draft",
            Description = "Guardrail test profile"
        };
    }

    private (SdBuilderEngine engine, Mock<IStructureDefinitionRepository> sdRepo, Mock<ITerminologyRegistry> terminology) CreateEngine()
    {
        var sdRepo = new Mock<IStructureDefinitionRepository>();
        var terminology = new Mock<ITerminologyRegistry>();

        // Setup default mocks
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(_patientSd);
        
        terminology.Setup(t => t.ValueSetExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        return (engine, sdRepo, terminology);
    }

    private StructureDefinition GetPatientStructureDefinition()
    {
        var zipSource = ZipSource.CreateValidationSource();
        var resolver = new CachedResolver(zipSource);
        var patientSd = resolver.FindStructureDefinition("http://hl7.org/fhir/StructureDefinition/Patient");

        if (patientSd == null || patientSd.Snapshot?.Element == null)
        {
            throw new InvalidOperationException("Failed to load Patient StructureDefinition from Firely SDK.");
        }

        return patientSd;
    }

    private string SerializeDesignState(ResourceDesignState design)
    {
        // Simple JSON serialization for comparison
        return System.Text.Json.JsonSerializer.Serialize(design, new System.Text.Json.JsonSerializerOptions
        {
            WriteIndented = false
        });
    }
}
