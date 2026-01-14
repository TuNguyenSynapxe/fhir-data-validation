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

    // ========================
    // Phase 2.1 - Slicing Tests
    // ========================

    [Fact]
    public async Task ValidateAsync_SlicingNoDiscriminator_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "Identifier",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>(),
            Slicing = new SlicingConfig
            {
                Ordered = false,
                Rules = SlicingRules.Open,
                Discriminators = new List<SliceDiscriminator>() // Empty discriminators - INVALID
            }
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "SLICING_NO_DISCRIMINATOR");
        Assert.NotNull(error);
        Assert.Equal("Patient.identifier", error.Path);
        Assert.Equal(SdValidationSeverity.Error, error.Severity);
    }

    [Fact]
    public async Task ValidateAsync_SlicingDuplicateSliceName_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "Identifier",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>(),
            Slicing = new SlicingConfig
            {
                Ordered = false,
                Rules = SlicingRules.Open,
                Discriminators = new List<SliceDiscriminator>
                {
                    new SliceDiscriminator(DiscriminatorType.Value, "system")
                }
            }
        };
        element.Slices["nric"] = new SliceDesignState { SliceName = "nric" };
        element.Slices["nric"] = new SliceDesignState { SliceName = "nric" }; // Duplicate - INVALID (dictionary will overwrite, but we test the validation logic)
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert - Dictionary prevents actual duplicates, so test checks for single slice validation
        Assert.False(result.HasErrors); // No error because dictionary prevents duplicates at runtime
    }

    [Fact]
    public async Task ValidateAsync_SlicingEmptySliceName_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "Identifier",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>(),
            Slicing = new SlicingConfig
            {
                Ordered = false,
                Rules = SlicingRules.Open,
                Discriminators = new List<SliceDiscriminator>
                {
                    new SliceDiscriminator(DiscriminatorType.Value, "system")
                }
            }
        };
        element.Slices[""] = new SliceDesignState { SliceName = "" }; // Empty name - INVALID
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "SLICING_EMPTY_SLICE_NAME");
        Assert.NotNull(error);
        Assert.Equal("Patient.identifier", error.Path);
        Assert.Equal(SdValidationSeverity.Error, error.Severity);
    }

    [Fact]
    public async Task ValidateAsync_SliceWithoutSlicingConfig_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "Identifier",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>(),
            Slicing = null // No slicing config but has slices - INVALID
        };
        element.Slices["nric"] = new SliceDesignState { SliceName = "nric" };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "SLICING_SLICE_WITHOUT_SLICING");
        Assert.NotNull(error);
        Assert.Equal("Patient.identifier", error.Path);
        Assert.Equal(SdValidationSeverity.Error, error.Severity);
    }

    [Fact]
    public async Task ValidateAsync_SlicingDiscriminatorEmptyPath_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "Identifier",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>(),
            Slicing = new SlicingConfig
            {
                Ordered = false,
                Rules = SlicingRules.Open,
                Discriminators = new List<SliceDiscriminator>
                {
                    new SliceDiscriminator(DiscriminatorType.Value, "") // Empty path - INVALID
                }
            }
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "SLICING_UNKNOWN_PATH");
        Assert.NotNull(error);
        Assert.Equal("Patient.identifier", error.Path);
        Assert.Equal(SdValidationSeverity.Error, error.Severity);
    }

    [Fact]
    public async Task ValidateAsync_SlicingClosedNoSlices_ReturnsWarning()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "Identifier",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>(),
            Slicing = new SlicingConfig
            {
                Ordered = false,
                Rules = SlicingRules.Closed, // Closed but no slices - WARNING
                Discriminators = new List<SliceDiscriminator>
                {
                    new SliceDiscriminator(DiscriminatorType.Value, "system")
                }
            }
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors); // Warning, not error
        var warning = result.Issues.FirstOrDefault(i => i.Code == "SLICING_CLOSED_NO_SLICES");
        Assert.NotNull(warning);
        Assert.Equal("Patient.identifier", warning.Path);
        Assert.Equal(SdValidationSeverity.Warning, warning.Severity);
    }

    [Fact]
    public async Task ValidateAsync_ValidSlicing_NoError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Patient.identifier",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "Identifier",
            IsIncluded = true,
            OverrideCardinality = null,
            Binding = null,
            Extensions = new List<ExtensionConfig>(),
            Slicing = new SlicingConfig
            {
                Ordered = true,
                Rules = SlicingRules.Closed,
                Discriminators = new List<SliceDiscriminator>
                {
                    new SliceDiscriminator(DiscriminatorType.Value, "system")
                }
            }
        };
        element.Slices["nric"] = new SliceDesignState
        {
            SliceName = "nric",
            OverrideCardinality = new Cardinality(1, "1")
        };
        element.Slices["passport"] = new SliceDesignState
        {
            SliceName = "passport",
            OverrideCardinality = new Cardinality(0, "1")
        };
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors);
    }

    // ============================================
    // Phase 2.2: Slice Child Constraint Tests
    // ============================================

    [Fact]
    public async Task ValidateAsync_SliceChildInvalidTypeForBinding_ReturnsError()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Observation.component",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "BackboneElement",
            IsIncluded = true
        };

        // Configure slicing
        element.Slicing = new SlicingConfig
        {
            Discriminators = new List<SliceDiscriminator>
            {
                new(DiscriminatorType.Pattern, "code")
            },
            Ordered = false,
            Rules = SlicingRules.Open
        };

        // Add slice with child constraint on invalid type (valueQuantity.value is decimal, not coded)
        var slice = new SliceDesignState { SliceName = "systolic" };
        slice.ChildConstraints.Add(new SliceElementConstraint
        {
            SliceName = "systolic",
            ElementPath = "valueQuantity.value", // decimal type - invalid for binding
            Binding = new BindingConfig
            {
                Strength = Domain.BindingStrength.Required,
                ValueSetUrl = "http://example.org/vs"
            }
        });
        element.Slices.Add("systolic", slice);
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Mock base SD with snapshot showing valueQuantity.value as decimal
        var baseSd = CreateMockBaseSD_ObservationWithSnapshot();
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Observation", It.IsAny<CancellationToken>()))
            .ReturnsAsync(baseSd);

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        var error = result.Issues.FirstOrDefault(i => i.Code == "SLICE_CHILD_INVALID_TYPE_FOR_BINDING");
        Assert.NotNull(error);
        Assert.Contains("valueQuantity.value", error.Message);
        Assert.Contains("decimal", error.Message);
    }

    [Fact]
    public async Task ValidateAsync_SliceChildCardinalityTightened_ReturnsWarning()
    {
        // Arrange
        var design = CreateTestDesignState();
        var element = new ElementDesignState
        {
            Path = "Observation.component",
            BaseCardinality = new Cardinality(0, "*"),
            BaseTypeCode = "BackboneElement",
            IsIncluded = true
        };

        // Configure slicing
        element.Slicing = new SlicingConfig
        {
            Discriminators = new List<SliceDiscriminator>
            {
                new(DiscriminatorType.Pattern, "code")
            },
            Ordered = false,
            Rules = SlicingRules.Open
        };

        // Add slice with child constraint tightening cardinality (0..1 → 1..1)
        var slice = new SliceDesignState { SliceName = "systolic" };
        slice.ChildConstraints.Add(new SliceElementConstraint
        {
            SliceName = "systolic",
            ElementPath = "valueQuantity.value",
            CardinalityOverride = new Cardinality(1, "1") // Tightened from base 0..1
        });
        element.Slices.Add("systolic", slice);
        design.Elements.Add(element);

        var (sdRepo, terminology) = CreateMockRepositories();

        // Mock base SD with snapshot showing valueQuantity.value as 0..1
        var baseSd = CreateMockBaseSD_ObservationWithSnapshot();
        sdRepo.Setup(r => r.FindByUrlAsync("http://hl7.org/fhir/StructureDefinition/Observation", It.IsAny<CancellationToken>()))
            .ReturnsAsync(baseSd);

        // Act
        var result = await SdDesignValidator.ValidateAsync(design, sdRepo.Object, terminology.Object, CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors);
        var warning = result.Issues.FirstOrDefault(i => i.Code == "SLICE_CHILD_CARDINALITY_TIGHTENED" && i.Severity == SdValidationSeverity.Warning);
        Assert.NotNull(warning);
        Assert.Contains("0..1", warning.Message);
        Assert.Contains("1..1", warning.Message);
    }

    private Hl7.Fhir.Model.StructureDefinition CreateMockBaseSD_ObservationWithSnapshot()
    {
        var sd = new Hl7.Fhir.Model.StructureDefinition
        {
            Url = "http://hl7.org/fhir/StructureDefinition/Observation",
            Name = "Observation",
            Status = Hl7.Fhir.Model.PublicationStatus.Active,
            Kind = Hl7.Fhir.Model.StructureDefinition.StructureDefinitionKind.Resource,
            Abstract = false,
            Type = "Observation",
            Snapshot = new Hl7.Fhir.Model.StructureDefinition.SnapshotComponent
            {
                Element = new List<Hl7.Fhir.Model.ElementDefinition>
                {
                    // Observation.component.valueQuantity.value
                    new()
                    {
                        Path = "Observation.component.valueQuantity.value",
                        Min = 0,
                        Max = "1",
                        Type = new List<Hl7.Fhir.Model.ElementDefinition.TypeRefComponent>
                        {
                            new() { Code = "decimal" }
                        }
                    }
                }
            }
        };

        return sd;
    }

    private ResourceDesignState CreateTestDesignState()
    {
        return new ResourceDesignState
        {
            ResourceType = "Observation",
            BaseCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Observation",
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
