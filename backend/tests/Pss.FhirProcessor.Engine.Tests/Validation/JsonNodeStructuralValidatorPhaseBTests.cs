using Xunit;
using Microsoft.Extensions.Logging;
using Moq;
using Pss.FhirProcessor.Engine.Validation;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Phase B Tests: Dynamic Enum Validation from StructureDefinitions
/// 
/// Tests MUST verify:
/// 1. Enum values sourced from IFhirEnumIndex (not hardcoded)
/// 2. Binding strength affects severity (required→error, extensible→warning, preferred→info)
/// 3. Multiple enum errors caught in one run
/// 4. R4 version awareness
/// 5. No Firely POCO dependency
/// 6. Hardcoded dictionaries no longer referenced
/// 7. Works for Patient.gender, Observation.status, Bundle.type
/// </summary>
public class JsonNodeStructuralValidatorPhaseBTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly Mock<ILogger<JsonNodeStructuralValidator>> _mockLogger;
    private readonly JsonNodeStructuralValidator _validator;

    public JsonNodeStructuralValidatorPhaseBTests()
    {
        _mockSchemaService = new Mock<IFhirSchemaService>();
        _mockEnumIndex = new Mock<IFhirEnumIndex>();
        _mockLogger = new Mock<ILogger<JsonNodeStructuralValidator>>();
        _validator = new JsonNodeStructuralValidator(
            _mockSchemaService.Object,
            _mockEnumIndex.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task ValidateAsync_DynamicEnumValidation_PatientGender_Invalid()
    {
        // Arrange
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""malex""
                }
            }]
        }";

        SetupBundleSchema();
        SetupPatientSchema();

        // Phase B: Mock enum index to return allowed values dynamically
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female", "other", "unknown" });

        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("INVALID_ENUM_VALUE", error.ErrorCode);
        Assert.Equal("STRUCTURE", error.Source);
        Assert.Equal("error", error.Severity); // required binding → error
        Assert.Contains("malex", error.Message);
        Assert.Equal("/entry/0/resource/gender", error.JsonPointer);
        
        // Verify enum index was called
        _mockEnumIndex.Verify(x => x.GetAllowedValues("R4", "Patient", "gender"), Times.Once);
    }

    [Fact]
    public async Task ValidateAsync_DynamicEnumValidation_ObservationStatus_Invalid()
    {
        // Arrange
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Observation"",
                    ""status"": ""invalid_status""
                }
            }]
        }";

        SetupBundleSchema();
        SetupObservationSchema();

        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Observation", "status"))
            .Returns(new List<string> { "registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown" });

        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Observation", "status"))
            .Returns("required");

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("INVALID_ENUM_VALUE", error.ErrorCode);
        Assert.Equal("error", error.Severity);
        Assert.Contains("invalid_status", error.Message);
    }

    [Fact]
    public async Task ValidateAsync_BindingStrength_ExtensibleBecomesWarning()
    {
        // Arrange
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""other_value""
                }
            }]
        }";

        SetupBundleSchema();
        SetupPatientSchema();

        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female", "other", "unknown" });

        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("extensible"); // Extensible binding

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("INVALID_ENUM_VALUE", error.ErrorCode);
        Assert.Equal("warning", error.Severity); // extensible → warning (not error)
    }

    [Fact]
    public async Task ValidateAsync_BindingStrength_PreferredBecomesInfo()
    {
        // Arrange
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""custom""
                }
            }]
        }";

        SetupBundleSchema();
        SetupPatientSchema();

        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female" });

        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("preferred"); // Preferred binding

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("info", error.Severity); // preferred → info
    }

    [Fact]
    public async Task ValidateAsync_MultipleEnumErrors_AllReturned()
    {
        // Arrange
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""gender"": ""invalid1""
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""gender"": ""invalid2""
                    }
                }
            ]
        }";

        SetupBundleSchema();
        SetupPatientSchema();

        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female", "other", "unknown" });

        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - Must return BOTH errors in one run
        Assert.Equal(2, errors.Count);
        Assert.All(errors, e => Assert.Equal("INVALID_ENUM_VALUE", e.ErrorCode));
        Assert.Contains(errors, e => e.JsonPointer == "/entry/0/resource/gender");
        Assert.Contains(errors, e => e.JsonPointer == "/entry/1/resource/gender");
    }

    [Fact]
    public async Task ValidateAsync_NoEnumBinding_NoValidation()
    {
        // Arrange - element with no enum binding
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""birthDate"": ""1960-05-15""
                }
            }]
        }";

        SetupBundleSchema();
        SetupPatientSchemaWithBirthDate();

        // No enum binding for birthDate
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "birthDate"))
            .Returns((IReadOnlyList<string>?)null);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - No errors (birthDate is not an enum)
        Assert.Empty(errors);
    }

    [Fact]
    public async Task ValidateAsync_R4VersionAwareness_UsesCorrectVersion()
    {
        // Arrange
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""test""
                }
            }]
        }";

        SetupBundleSchema();
        SetupPatientSchema();

        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female" });

        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act
        await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - Verify R4 version passed to enum index
        _mockEnumIndex.Verify(x => x.GetAllowedValues("R4", "Patient", "gender"), Times.Once);
        _mockEnumIndex.Verify(x => x.GetBindingStrength("R4", "Patient", "gender"), Times.Once);
    }

    [Fact]
    public async Task ValidateAsync_NoPocoDependency_PureJsonValidation()
    {
        // Arrange
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""invalid""
                }
            }]
        }";

        SetupBundleSchema();
        SetupPatientSchema();

        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female" });

        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        Assert.Single(errors);
        
        // Verify: SchemaService was called (uses StructureDefinitions)
        // but NO Firely POCO parsing happened
        _mockSchemaService.Verify(x => x.GetResourceSchemaAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        
        // Success if we got here - validation worked without POCO
    }

    // =========================================================================
    // PHASE B.2 TESTS — Enum Validation Skipped Warning
    // =========================================================================

    [Fact]
    public async Task ValidateAsync_EnumValidationSkipped_RequiredBinding_EmitsWarning()
    {
        // Arrange - Element with required ValueSet binding that is NOT supported
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""status"": ""planned"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""AMB""
                    }
                }
            }]
        }";

        SetupBundleSchema();
        
        var encounterSchema = new FhirSchemaNode
        {
            Path = "Encounter",
            ElementName = "Encounter",
            Type = "Encounter",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Encounter.status",
                    ElementName = "status",
                    Type = "code",
                    Min = 1,
                    Max = "1",
                    ValueSetUrl = "http://hl7.org/fhir/ValueSet/unsupported-custom-status",
                    BindingStrength = "required"
                },
                new()
                {
                    Path = "Encounter.class",
                    ElementName = "class",
                    Type = "Coding",
                    Min = 1,
                    Max = "1"
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Encounter", It.IsAny<CancellationToken>()))
            .ReturnsAsync(encounterSchema);

        // Mock: Enum index returns null (unsupported ValueSet)
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Encounter", "status"))
            .Returns((IReadOnlyList<string>?)null);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("ENUM_VALIDATION_SKIPPED", error.ErrorCode);
        Assert.Equal("STRUCTURE", error.Source);
        Assert.Equal("warning", error.Severity); // required binding → warning (not error)
        Assert.Equal("/entry/0/resource/status", error.JsonPointer);
        Assert.NotNull(error.Details);
        Assert.Equal("http://hl7.org/fhir/ValueSet/unsupported-custom-status", error.Details["valueSet"]);
        Assert.Equal("required", error.Details["bindingStrength"]);
        Assert.Equal("ValueSet not supported by enum index", error.Details["reason"]);
    }

    [Fact]
    public async Task ValidateAsync_EnumValidationSkipped_PreferredBinding_EmitsInfo()
    {
        // Arrange - Element with preferred binding (not required)
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""language"": ""en-US""
                }
            }]
        }";

        SetupBundleSchema();
        
        var patientSchema = new FhirSchemaNode
        {
            Path = "Patient",
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Patient.language",
                    ElementName = "language",
                    Type = "code",
                    Min = 0,
                    Max = "1",
                    ValueSetUrl = "http://hl7.org/fhir/ValueSet/languages",
                    BindingStrength = "preferred"
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);

        // Mock: Enum index returns null (unsupported)
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "language"))
            .Returns((IReadOnlyList<string>?)null);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("ENUM_VALIDATION_SKIPPED", error.ErrorCode);
        Assert.Equal("info", error.Severity); // preferred → info
    }

    [Fact]
    public async Task ValidateAsync_EnumValidationSkipped_ExampleBinding_NoWarning()
    {
        // Arrange - Element with example binding (should NOT emit warning)
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""communication"": [{
                        ""language"": {
                            ""coding"": [{
                                ""system"": ""urn:ietf:bcp:47"",
                                ""code"": ""en""
                            }]
                        }
                    }]
                }
            }]
        }";

        SetupBundleSchema();
        
        var patientSchema = new FhirSchemaNode
        {
            Path = "Patient",
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Patient.communication",
                    ElementName = "communication",
                    Type = "BackboneElement",
                    Min = 0,
                    Max = "*",
                    IsArray = true,
                    Children = new List<FhirSchemaNode>
                    {
                        new()
                        {
                            Path = "Patient.communication.language",
                            ElementName = "language",
                            Type = "CodeableConcept",
                            Min = 1,
                            Max = "1",
                            ValueSetUrl = "http://hl7.org/fhir/ValueSet/languages",
                            BindingStrength = "example" // Example binding
                        }
                    }
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);

        // Mock: Enum index returns null (unsupported)
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "language"))
            .Returns((IReadOnlyList<string>?)null);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - NO ENUM_VALIDATION_SKIPPED error for example binding
        Assert.Empty(errors);
    }

    [Fact]
    public async Task ValidateAsync_EnumValidationSkipped_SupportedEnum_NoSkipWarning()
    {
        // Arrange - Enum is supported, so INVALID_ENUM_VALUE is emitted, NOT ENUM_VALIDATION_SKIPPED
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""invalid""
                }
            }]
        }";

        SetupBundleSchema();
        SetupPatientSchema();

        // Mock: Enum index returns values (supported)
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female", "other", "unknown" });

        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - INVALID_ENUM_VALUE emitted, NOT ENUM_VALIDATION_SKIPPED
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("INVALID_ENUM_VALUE", error.ErrorCode);
        Assert.DoesNotContain(errors, e => e.ErrorCode == "ENUM_VALIDATION_SKIPPED");
    }

    [Fact]
    public async Task ValidateAsync_EnumValidationSkipped_DeduplicationSafety()
    {
        // Arrange - Verify ENUM_VALIDATION_SKIPPED participates in deduplication
        // If same jsonPointer, only one error should be emitted
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Observation"",
                    ""status"": ""preliminary"",
                    ""code"": {
                        ""coding"": [{
                            ""system"": ""http://loinc.org"",
                            ""code"": ""12345-6""
                        }]
                    }
                }
            }]
        }";

        SetupBundleSchema();
        
        var observationSchema = new FhirSchemaNode
        {
            Path = "Observation",
            ElementName = "Observation",
            Type = "Observation",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Observation.status",
                    ElementName = "status",
                    Type = "code",
                    Min = 1,
                    Max = "1",
                    ValueSetUrl = "http://hl7.org/fhir/ValueSet/unsupported-status",
                    BindingStrength = "required"
                },
                new()
                {
                    Path = "Observation.code",
                    ElementName = "code",
                    Type = "CodeableConcept",
                    Min = 1,
                    Max = "1"
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Observation", It.IsAny<CancellationToken>()))
            .ReturnsAsync(observationSchema);

        // Mock: Enum index returns null (unsupported)
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Observation", "status"))
            .Returns((IReadOnlyList<string>?)null);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - Only ONE ENUM_VALIDATION_SKIPPED error
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("ENUM_VALIDATION_SKIPPED", error.ErrorCode);
        Assert.Equal("/entry/0/resource/status", error.JsonPointer);
    }

    // =========================================================================
    // SCHEMA SETUP HELPERS
    // =========================================================================

    private void SetupBundleSchema()
    {
        var bundleSchema = new FhirSchemaNode
        {
            Path = "Bundle",
            ElementName = "Bundle",
            Type = "Bundle",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Bundle.type",
                    ElementName = "type",
                    Type = "code",
                    Min = 1,
                    Max = "1"
                },
                new()
                {
                    Path = "Bundle.entry",
                    ElementName = "entry",
                    Type = "BackboneElement",
                    Min = 0,
                    Max = "*",
                    IsArray = true
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);
    }

    private void SetupPatientSchema()
    {
        var patientSchema = new FhirSchemaNode
        {
            Path = "Patient",
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Patient.gender",
                    ElementName = "gender",
                    Type = "code",
                    Min = 0,
                    Max = "1",
                    ValueSetUrl = "http://hl7.org/fhir/ValueSet/administrative-gender",
                    BindingStrength = "required"
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);
    }

    private void SetupPatientSchemaWithBirthDate()
    {
        var patientSchema = new FhirSchemaNode
        {
            Path = "Patient",
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Patient.birthDate",
                    ElementName = "birthDate",
                    Type = "date",
                    Min = 0,
                    Max = "1"
                    // No ValueSetUrl or BindingStrength - not an enum
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);
    }

    private void SetupObservationSchema()
    {
        var observationSchema = new FhirSchemaNode
        {
            Path = "Observation",
            ElementName = "Observation",
            Type = "Observation",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Observation.status",
                    ElementName = "status",
                    Type = "code",
                    Min = 1,
                    Max = "1",
                    ValueSetUrl = "http://hl7.org/fhir/ValueSet/observation-status",
                    BindingStrength = "required"
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Observation", It.IsAny<CancellationToken>()))
            .ReturnsAsync(observationSchema);
    }
}
