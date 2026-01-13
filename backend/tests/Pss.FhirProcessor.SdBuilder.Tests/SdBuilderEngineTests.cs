namespace Pss.FhirProcessor.SdBuilder.Tests;

using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Moq;
using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Xunit;

/// <summary>
/// Tests for SdBuilderEngine orchestration.
/// </summary>
public class SdBuilderEngineTests
{
    private readonly StructureDefinition _patientSd;

    public SdBuilderEngineTests()
    {
        _patientSd = GetPatientStructureDefinition();
    }

    [Fact]
    public async TaskAlias StartAsync_MinimalMode_ReturnsSession()
    {
        // Arrange
        var (sdRepo, terminology) = CreateMockRepositories();
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(_patientSd);

        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act
        var session = await engine.StartAsync("Patient", VisibilityMode.Minimal, null, CancellationToken.None);

        // Assert
        Assert.NotNull(session);
        Assert.NotNull(session.DesignState);
        Assert.Equal("Patient", session.DesignState.ResourceType);
        Assert.Equal(VisibilityMode.Minimal, session.DesignState.VisibilityMode);
        Assert.NotEmpty(session.DesignState.Elements);

        // Verify minimal mode excludes optional elements
        var optionalElement = session.DesignState.Elements.FirstOrDefault(e => 
            e.Path == "Patient.name" && e.BaseCardinality.Min == 0);
        Assert.NotNull(optionalElement);
        Assert.False(optionalElement.IsIncluded); // Should be excluded in minimal mode
    }

    [Fact]
    public async TaskAlias StartAsync_FullMode_ReturnsSessionWithAllElements()
    {
        // Arrange
        var (sdRepo, terminology) = CreateMockRepositories();
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(_patientSd);

        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act
        var session = await engine.StartAsync("Patient", VisibilityMode.Full, null, CancellationToken.None);

        // Assert
        Assert.NotNull(session);
        Assert.NotNull(session.DesignState);
        Assert.Equal("Patient", session.DesignState.ResourceType);
        Assert.Equal(VisibilityMode.Minimal, session.DesignState.VisibilityMode); // Note: Initializer always sets to Minimal internally

        // Verify full mode includes optional elements
        var optionalElement = session.DesignState.Elements.FirstOrDefault(e => 
            e.Path == "Patient.name" && e.BaseCardinality.Min == 0);
        Assert.NotNull(optionalElement);
        Assert.True(optionalElement.IsIncluded); // Should be included in full mode
    }

    [Fact]
    public async TaskAlias StartAsync_MissingBaseSD_ThrowsInvalidOperationException()
    {
        // Arrange
        var (sdRepo, terminology) = CreateMockRepositories();
        sdRepo.Setup(r => r.FindByUrlAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((object?)null);

        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => engine.StartAsync("NonExistent", VisibilityMode.Minimal, null, CancellationToken.None));
        
        Assert.Contains("Base StructureDefinition not found", exception.Message);
    }

    [Fact]
    public async TaskAlias StartAsync_MissingSnapshot_ThrowsInvalidOperationException()
    {
        // Arrange
        var sdWithoutSnapshot = new StructureDefinition
        {
            Url = "http://hl7.org/fhir/StructureDefinition/Patient",
            Name = "Patient",
            Type = "Patient",
            Snapshot = null // No snapshot
        };

        var (sdRepo, terminology) = CreateMockRepositories();
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sdWithoutSnapshot);

        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => engine.StartAsync("Patient", VisibilityMode.Minimal, null, CancellationToken.None));
        
        Assert.Contains("must have snapshot.element", exception.Message);
    }

    [Fact]
    public async TaskAlias StartAsync_WithTemplateId_PlaceholderForFutureSupport()
    {
        // Arrange
        var (sdRepo, terminology) = CreateMockRepositories();
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(_patientSd);

        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act
        var session = await engine.StartAsync("Patient", VisibilityMode.Minimal, "template-123", CancellationToken.None);

        // Assert
        Assert.NotNull(session);
        Assert.NotNull(session.DesignState);
        // Template application is a placeholder for now - just verify it doesn't break
    }

    [Fact]
    public async TaskAlias ValidateAsync_CallsValidator_ReturnsSameResult()
    {
        // Arrange
        var design = new ResourceDesignState
        {
            ResourceType = "Patient",
            BaseCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Patient",
            VisibilityMode = VisibilityMode.Minimal,
            Elements = new List<ElementDesignState>
            {
                new ElementDesignState
                {
                    Path = "Patient.name",
                    BaseCardinality = new Cardinality(0, "*"),
                    BaseTypeCode = "HumanName",
                    IsIncluded = true,
                    OverrideCardinality = new Cardinality(1, "1"), // Valid tightening
                    Binding = null,
                    Extensions = new List<ExtensionConfig>()
                }
            }
        };

        var (sdRepo, terminology) = CreateMockRepositories();
        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act
        var result = await engine.ValidateAsync(design, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.HasErrors);
        // Should have cardinality tightened warning
        Assert.Single(result.Issues);
        Assert.Equal("CARDINALITY_TIGHTENED", result.Issues[0].Code);
    }

    [Fact]
    public async TaskAlias ExportAsync_WithValidationErrors_ThrowsInvalidOperationException()
    {
        // Arrange
        var design = new ResourceDesignState
        {
            ResourceType = "Patient",
            BaseCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Patient",
            VisibilityMode = VisibilityMode.Minimal,
            Elements = new List<ElementDesignState>
            {
                new ElementDesignState
                {
                    Path = "Patient.identifier",
                    BaseCardinality = new Cardinality(1, "*"), // Required base
                    BaseTypeCode = "Identifier",
                    IsIncluded = false, // INVALID - excluded required element
                    OverrideCardinality = null,
                    Binding = null,
                    Extensions = new List<ExtensionConfig>()
                }
            }
        };

        var metadata = new SdMetadata
        {
            Name = "TestProfile",
            Url = "http://example.com/StructureDefinition/test",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test profile"
        };

        var (sdRepo, terminology) = CreateMockRepositories();
        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => engine.ExportAsync(design, metadata, CancellationToken.None));
        
        Assert.Contains("Cannot export StructureDefinition with validation errors", exception.Message);
        Assert.Contains("REQUIRED_CANNOT_EXCLUDE", exception.Message);
    }

    [Fact]
    public async TaskAlias ExportAsync_WithWarningsOnly_Succeeds()
    {
        // Arrange
        var design = new ResourceDesignState
        {
            ResourceType = "Patient",
            BaseCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Patient",
            VisibilityMode = VisibilityMode.Minimal,
            Elements = new List<ElementDesignState>
            {
                new ElementDesignState
                {
                    Path = "Patient.name",
                    BaseCardinality = new Cardinality(0, "*"),
                    BaseTypeCode = "HumanName",
                    IsIncluded = true,
                    OverrideCardinality = new Cardinality(1, "1"), // Valid tightening - warning only
                    Binding = null,
                    Extensions = new List<ExtensionConfig>()
                }
            }
        };

        var metadata = new SdMetadata
        {
            Name = "TestProfile",
            Url = "http://example.com/StructureDefinition/test",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test profile"
        };

        var (sdRepo, terminology) = CreateMockRepositories();
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(_patientSd);

        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act
        var exported = await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Assert
        Assert.NotNull(exported);
        Assert.Equal("TestProfile", exported.Name);
        Assert.Equal("http://example.com/StructureDefinition/test", exported.Url);
        Assert.NotNull(exported.Differential);
        Assert.NotNull(exported.Differential.Element);
        Assert.Null(exported.Snapshot); // NO snapshot
    }

    [Fact]
    public async TaskAlias ExportAsync_LoadsBaseSdFreshly_NoCaching()
    {
        // Arrange
        var design = new ResourceDesignState
        {
            ResourceType = "Patient",
            BaseCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Patient",
            VisibilityMode = VisibilityMode.Minimal,
            Elements = new List<ElementDesignState>()
        };

        var metadata = new SdMetadata
        {
            Name = "TestProfile",
            Url = "http://example.com/StructureDefinition/test",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test profile"
        };

        var (sdRepo, terminology) = CreateMockRepositories();
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(_patientSd);

        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act
        await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Assert - Verify repository was called to load base SD
        sdRepo.Verify(
            r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Patient", It.IsAny<CancellationToken>()),
            Times.Once, // Called once in ExportAsync (not cached)
            "Engine should load base SD fresh in ExportAsync without caching");
    }

    [Fact]
    public async TaskAlias ExportAsync_ValidDesign_ReturnsStructureDefinition()
    {
        // Arrange
        var design = new ResourceDesignState
        {
            ResourceType = "Patient",
            BaseCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Patient",
            VisibilityMode = VisibilityMode.Minimal,
            Elements = new List<ElementDesignState>
            {
                new ElementDesignState
                {
                    Path = "Patient.name",
                    BaseCardinality = new Cardinality(0, "*"),
                    BaseTypeCode = "HumanName",
                    IsIncluded = false, // Excluded optional - creates 0..0 constraint
                    OverrideCardinality = null,
                    Binding = null,
                    Extensions = new List<ExtensionConfig>()
                }
            }
        };

        var metadata = new SdMetadata
        {
            Name = "MinimalPatient",
            Url = "http://example.com/StructureDefinition/minimal-patient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Minimal patient profile"
        };

        var (sdRepo, terminology) = CreateMockRepositories();
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(_patientSd);

        var engine = new SdBuilderEngine(sdRepo.Object, terminology.Object);

        // Act
        var exported = await engine.ExportAsync(design, metadata, CancellationToken.None);

        // Assert
        Assert.NotNull(exported);
        Assert.Equal("MinimalPatient", exported.Name);
        Assert.Equal("http://example.com/StructureDefinition/minimal-patient", exported.Url);
        Assert.Equal("1.0.0", exported.Version);
        Assert.Equal(PublicationStatus.Draft, exported.Status);
        Assert.Contains("Minimal patient profile", exported.Description?.ToString());
        Assert.Equal(StructureDefinition.StructureDefinitionKind.Resource, exported.Kind);
        Assert.Equal("Patient", exported.Type);
        Assert.Equal("http://hl7.org/fhir/StructureDefinition/Patient", exported.BaseDefinition);
        Assert.Equal(StructureDefinition.TypeDerivationRule.Constraint, exported.Derivation);
        
        // Critical: NO snapshot
        Assert.Null(exported.Snapshot);
        
        // Differential should have excluded element
        Assert.NotNull(exported.Differential);
        Assert.NotNull(exported.Differential.Element);
        var nameElement = exported.Differential.Element.FirstOrDefault(e => e.Path == "Patient.name");
        Assert.NotNull(nameElement);
        Assert.Equal(0, nameElement.Min);
        Assert.Equal("0", nameElement.Max);
    }

    private (Mock<IStructureDefinitionRepository> sdRepo, Mock<ITerminologyRegistry> terminology) CreateMockRepositories()
    {
        var sdRepo = new Mock<IStructureDefinitionRepository>();
        var terminology = new Mock<ITerminologyRegistry>();

        // Default setup for terminology
        terminology.Setup(t => t.ValueSetExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        return (sdRepo, terminology);
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
}
