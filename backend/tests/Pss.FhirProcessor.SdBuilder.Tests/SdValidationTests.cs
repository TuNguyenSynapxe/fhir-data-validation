namespace Pss.FhirProcessor.SdBuilder.Tests;

using Moq;
using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Xunit;

/// <summary>
/// Tests for SdDesignValidator pre-export validation rules.
/// </summary>
public sealed class SdValidationTests
{
    [Fact]
    public async Task ValidateAsync_RequiredElementExcluded_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var requiredElement = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(1, "*"), // Required (min=1)
            BaseTypeCode = "Identifier",
            IsIncluded = false, // Excluded - INVALID
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(requiredElement);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "REQUIRED_CANNOT_EXCLUDE");
        Assert.NotNull(error);
        Assert.Equal("Patient.identifier", error.Path);
    }

    [Fact]
    public async Task ValidateAsync_CardinalityMinTooLow_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(1, "*"), // Base requires min=1
            BaseTypeCode = "Identifier",
            IsIncluded = true,
            OverrideCardinality = new Cardinality(0, "*"), // Override reduces to 0 - INVALID
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "CARDINALITY_MIN_TOO_LOW");
        Assert.NotNull(error);
        Assert.Equal("Patient.identifier", error.Path);
    }

    [Fact]
    public async Task ValidateAsync_CardinalityMaxTooHigh_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.active",
            BaseCardinality = new Cardinality(0, "1"), // Base allows max=1
            BaseTypeCode = "boolean",
            IsIncluded = true,
            OverrideCardinality = new Cardinality(0, "*"), // Override increases to * - INVALID
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "CARDINALITY_MAX_TOO_HIGH");
        Assert.NotNull(error);
        Assert.Equal("Patient.active", error.Path);
    }

    [Fact]
    public async Task ValidateAsync_BindingOnNonCodedType_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.birthDate",
            BaseCardinality = new Cardinality(0, "1"),
            BaseTypeCode = "date", // NOT a coded type
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = new BindingConfig // INVALID - can't bind to date
            {
                Strength = BindingStrength.Required,
                ValueSetUrl = "http://example.com/vs"
            },
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "BINDING_INVALID_TYPE");
        Assert.NotNull(error);
        Assert.Equal("Patient.birthDate", error.Path);
    }

    [Fact]
    public async Task ValidateAsync_MissingValueSet_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.gender",
            BaseCardinality = new Cardinality(0, "1"),
            BaseTypeCode = "code",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = new BindingConfig
            {
                Strength = BindingStrength.Required,
                ValueSetUrl = "http://example.com/missing-valueset"
            },
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();
        // Configure terminology to return false for missing ValueSet
        terminology.Setup(t => t.ValueSetExistsAsync("http://example.com/missing-valueset", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "VALUESET_NOT_FOUND");
        Assert.NotNull(error);
        Assert.Equal("Patient.gender", error.Path);
    }

    [Fact]
    public async Task ValidateAsync_MissingExtension_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "Patient",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>
            {
                new ExtensionConfig
                {
                    Url = "http://example.com/missing-extension"
                }
            }
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();
        // Configure sdRepo to return null for missing extension
        sdRepo.Setup(r => r.FindByUrlAsync("http://example.com/missing-extension", It.IsAny<CancellationToken>()))
            .ReturnsAsync((object?)null);

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "EXTENSION_NOT_FOUND");
        Assert.NotNull(error);
        Assert.Equal("Patient", error.Path);
    }

    [Fact]
    public async Task ValidateAsync_PreferredBinding_ReturnsWarning()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.maritalStatus",
            BaseCardinality = new Cardinality(0, "1"),
            BaseTypeCode = "CodeableConcept",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = new BindingConfig
            {
                Strength = BindingStrength.Preferred, // Warning expected
                ValueSetUrl = "http://hl7.org/fhir/ValueSet/marital-status"
            },
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();
        terminology.Setup(t => t.ValueSetExistsAsync("http://hl7.org/fhir/ValueSet/marital-status", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors); // Warnings don't block
        var warning = result.Issues.FirstOrDefault(i => i.Code == "BINDING_PREFERRED");
        Assert.NotNull(warning);
        Assert.Equal(SdValidationSeverity.Warning, warning.Severity);
        Assert.Equal("Patient.maritalStatus", warning.Path);
    }

    [Fact]
    public async Task ValidateAsync_TightenedCardinality_ReturnsWarning()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.name",
            BaseCardinality = new Cardinality(0, "*"), // Optional
            BaseTypeCode = "HumanName",
            IsIncluded = true,
            OverrideCardinality = new Cardinality(1, "1"), // Tightened to required - Warning expected
            Binding = null,
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors); // Warnings don't block
        var warning = result.Issues.FirstOrDefault(i => i.Code == "CARDINALITY_TIGHTENED");
        Assert.NotNull(warning);
        Assert.Equal(SdValidationSeverity.Warning, warning.Severity);
        Assert.Equal("Patient.name", warning.Path);
    }

    [Fact]
    public async Task ValidateAsync_ValidDesign_NoErrors()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.gender",
            BaseCardinality = new Cardinality(0, "1"),
            BaseTypeCode = "code",
            IsIncluded = true,
            OverrideCardinality = new Cardinality(1, "1"), // Valid tightening
            Binding = new BindingConfig
            {
                Strength = BindingStrength.Required, // Valid binding
                ValueSetUrl = "http://hl7.org/fhir/ValueSet/administrative-gender"
            },
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();
        terminology.Setup(t => t.ValueSetExistsAsync("http://hl7.org/fhir/ValueSet/administrative-gender", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors);
        // Should have cardinality tightened warning only
        Assert.Single(result.Issues);
        Assert.Equal("CARDINALITY_TIGHTENED", result.Issues[0].Code);
    }

    [Fact]
    public async Task ValidateAsync_BindingOnCodeType_Valid()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.gender",
            BaseCardinality = new Cardinality(0, "1"),
            BaseTypeCode = "code", // Valid for binding
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = new BindingConfig
            {
                Strength = BindingStrength.Required,
                ValueSetUrl = "http://hl7.org/fhir/ValueSet/test"
            },
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();
        terminology.Setup(t => t.ValueSetExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors);
    }

    [Fact]
    public async Task ValidateAsync_BindingOnCodingType_Valid()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.someField",
            BaseCardinality = new Cardinality(0, "1"),
            BaseTypeCode = "Coding", // Valid for binding
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = new BindingConfig
            {
                Strength = BindingStrength.Extensible,
                ValueSetUrl = "http://hl7.org/fhir/ValueSet/test"
            },
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();
        terminology.Setup(t => t.ValueSetExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors);
    }

    [Fact]
    public async Task ValidateAsync_BindingOnCodeableConceptType_Valid()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.maritalStatus",
            BaseCardinality = new Cardinality(0, "1"),
            BaseTypeCode = "CodeableConcept", // Valid for binding
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = new BindingConfig
            {
                Strength = BindingStrength.Required,
                ValueSetUrl = "http://hl7.org/fhir/ValueSet/marital-status"
            },
            Extensions = new List<ExtensionConfig>()
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();
        terminology.Setup(t => t.ValueSetExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors);
    }

    [Fact]
    public async Task ValidateAsync_ValidExtension_NoError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "Patient",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>
            {
                new ExtensionConfig
                {
                    Url = "http://hl7.org/fhir/StructureDefinition/patient-birthPlace"
                }
            }
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();
        // Configure sdRepo to return a valid extension
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/patient-birthPlace", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new object()); // Non-null indicates found

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors);
    }

    private ResourceDesignState CreateTestDesignState()
    {
        return new ResourceDesignState
        {
            ResourceType = "Patient",
            BaseCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Patient",
            VisibilityMode = VisibilityMode.Minimal,
            Elements = new List<ElementDesignState>()
        };
    }

    private (Mock<IStructureDefinitionRepository> sdRepo, Mock<ITerminologyRegistry> terminology) CreateMockRepositories()
    {
        var sdRepo = new Mock<IStructureDefinitionRepository>();
        var terminology = new Mock<ITerminologyRegistry>();

        // Default setup - return true for ValueSet existence unless overridden
        terminology.Setup(t => t.ValueSetExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Default setup - return non-null for extension resolution unless overridden
        sdRepo.Setup(r => r.FindByUrlAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new object());

        return (sdRepo, terminology);
    }
}
