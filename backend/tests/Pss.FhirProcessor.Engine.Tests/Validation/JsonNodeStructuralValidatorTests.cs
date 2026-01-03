using Xunit;
using Microsoft.Extensions.Logging;
using Moq;
using Pss.FhirProcessor.Engine.Validation;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Phase A Tests: JSON Node Structural Validation
/// Tests MUST verify:
/// 1. Multiple errors caught in one run
/// 2. Accurate jsonPointer with array indices
/// 3. No Firely POCO dependency
/// 4. All 5 validation types (enum, primitive, array shape, cardinality, required)
/// </summary>
public class JsonNodeStructuralValidatorTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly Mock<ILogger<JsonNodeStructuralValidator>> _mockLogger;
    private readonly JsonNodeStructuralValidator _validator;

    public JsonNodeStructuralValidatorTests()
    {
        _mockSchemaService = new Mock<IFhirSchemaService>();
        _mockEnumIndex = new Mock<IFhirEnumIndex>();
        _mockLogger = new Mock<ILogger<JsonNodeStructuralValidator>>();
        _validator = new JsonNodeStructuralValidator(
            _mockSchemaService.Object,
            _mockEnumIndex.Object,
            _mockLogger.Object);

        // Setup default Patient schema
        SetupPatientSchema();
    }

    private void SetupPatientSchema()
    {
        var patientSchema = new FhirSchemaNode
        {
            Path = "Patient",
            ElementName = "Patient",
            Type = "Patient",
            Min = 0,
            Max = "1",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Patient.gender",
                    ElementName = "gender",
                    Type = "code",
                    Min = 0,
                    Max = "1",
                    IsArray = false
                },
                new()
                {
                    Path = "Patient.birthDate",
                    ElementName = "birthDate",
                    Type = "date",
                    Min = 0,
                    Max = "1",
                    IsArray = false
                },
                new()
                {
                    Path = "Patient.identifier",
                    ElementName = "identifier",
                    Type = "Identifier",
                    Min = 0,
                    Max = "*",
                    IsArray = true
                },
                new()
                {
                    Path = "Patient.name",
                    ElementName = "name",
                    Type = "HumanName",
                    Min = 1, // Required
                    Max = "*",
                    IsArray = true
                }
            }
        };

        var bundleSchema = new FhirSchemaNode
        {
            Path = "Bundle",
            ElementName = "Bundle",
            Type = "Bundle",
            Min = 0,
            Max = "1",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Bundle.type",
                    ElementName = "type",
                    Type = "code",
                    Min = 1,
                    Max = "1",
                    IsArray = false
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
            .Setup(s => s.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);
    }

    [Fact]
    public async Task ValidateAsync_InvalidEnum_ReturnsError()
    {
        // Arrange
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""malex""
                }
            }]
        }";

        // Setup enum index to return allowed values
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female", "other", "unknown" });
        
        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        Assert.NotEmpty(errors);
        var enumError = errors.FirstOrDefault(e => e.ErrorCode == "INVALID_ENUM_VALUE");
        Assert.NotNull(enumError);
        Assert.Equal("STRUCTURE", enumError.Source);
        Assert.Equal("error", enumError.Severity);
        Assert.Equal("/entry/0/resource/gender", enumError.JsonPointer);
        Assert.Equal("Patient.gender", enumError.Path);
        
        // Verify details schema
        Assert.NotNull(enumError.Details);
        Assert.True(enumError.Details.ContainsKey("actual"));
        Assert.True(enumError.Details.ContainsKey("allowed"));
        Assert.True(enumError.Details.ContainsKey("valueType"));
        Assert.Equal("malex", enumError.Details["actual"]);
    }

    [Fact]
    public async Task ValidateAsync_MultipleEnumErrors_ReturnsAllErrors()
    {
        // Arrange - Multiple enum errors in one bundle
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""invalid_type"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""gender"": ""malex""
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""gender"": ""invalid""
                    }
                }
            ]
        }";

        // Setup enum index mocks
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Bundle", "type"))
            .Returns(new List<string> { "document", "message", "transaction", "collection" });
        
        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Bundle", "type"))
            .Returns("required");

        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female", "other", "unknown" });
        
        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - Must catch MULTIPLE errors in ONE run
        var enumErrors = errors.Where(e => e.ErrorCode == "INVALID_ENUM_VALUE").ToList();
        Assert.True(enumErrors.Count >= 2, "Should catch multiple enum errors in one validation run");
        
        // Verify precise jsonPointer for each error
        Assert.Contains(enumErrors, e => e.JsonPointer == "/entry/0/resource/gender");
        Assert.Contains(enumErrors, e => e.JsonPointer == "/entry/1/resource/gender");
    }

    [Fact]
    public async Task ValidateAsync_InvalidPrimitive_ReturnsError()
    {
        // Arrange - Invalid date format
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""birthDate"": ""1960-05-15x""
                }
            }]
        }";

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        var primitiveError = errors.FirstOrDefault(e => e.ErrorCode == "FHIR_INVALID_PRIMITIVE");
        Assert.NotNull(primitiveError);
        Assert.Equal("STRUCTURE", primitiveError.Source);
        Assert.Equal("error", primitiveError.Severity);
        Assert.Equal("/entry/0/resource/birthDate", primitiveError.JsonPointer);
        
        // Verify details schema
        Assert.NotNull(primitiveError.Details);
        Assert.Equal("1960-05-15x", primitiveError.Details["actual"]);
        Assert.Equal("date", primitiveError.Details["expectedType"]);
    }

    [Fact]
    public async Task ValidateAsync_ArrayExpectedButObjectProvided_ReturnsError()
    {
        // Arrange - identifier should be array but object provided
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""identifier"": {
                        ""system"": ""http://example.com"",
                        ""value"": ""123""
                    }
                }
            }]
        }";

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        var arrayError = errors.FirstOrDefault(e => e.ErrorCode == "FHIR_ARRAY_EXPECTED");
        Assert.NotNull(arrayError);
        Assert.Equal("STRUCTURE", arrayError.Source);
        Assert.Equal("error", arrayError.Severity);
        Assert.Equal("/entry/0/resource/identifier", arrayError.JsonPointer);
        
        // Verify details schema
        Assert.NotNull(arrayError.Details);
        Assert.Equal("array", arrayError.Details["expectedType"]);
        Assert.Equal("object", arrayError.Details["actualType"]);
    }

    [Fact]
    public async Task ValidateAsync_CardinalityViolation_ReturnsError()
    {
        // Arrange - Empty array when min = 1
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""name"": []
                }
            }]
        }";

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        var cardinalityError = errors.FirstOrDefault(e => e.ErrorCode == "ARRAY_LENGTH_OUT_OF_RANGE");
        Assert.NotNull(cardinalityError);
        Assert.Equal("STRUCTURE", cardinalityError.Source);
        Assert.Equal("error", cardinalityError.Severity);
        Assert.Equal("/entry/0/resource/name", cardinalityError.JsonPointer);
        
        // Verify details schema
        Assert.NotNull(cardinalityError.Details);
        Assert.Equal(1, cardinalityError.Details["min"]);
        Assert.Equal(0, cardinalityError.Details["actual"]);
    }

    [Fact]
    public async Task ValidateAsync_RequiredFieldMissing_ReturnsError()
    {
        // Arrange - Missing required 'name' field
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""male""
                }
            }]
        }";

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        var requiredError = errors.FirstOrDefault(e => e.ErrorCode == "REQUIRED_FIELD_MISSING");
        Assert.NotNull(requiredError);
        Assert.Equal("STRUCTURE", requiredError.Source);
        Assert.Equal("error", requiredError.Severity);
        Assert.Equal("/entry/0/resource/name", requiredError.JsonPointer);
        
        // Verify details schema
        Assert.NotNull(requiredError.Details);
        Assert.True((bool)requiredError.Details["required"]);
    }

    [Fact]
    public async Task ValidateAsync_JsonPointerPrecision_WithArrayIndices()
    {
        // Arrange - Test precise jsonPointer with array indices
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""identifier"": [
                            { ""value"": ""001"" },
                            { ""value"": ""002"" }
                        ]
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""gender"": ""invalid""
                    }
                }
            ]
        }";

        // Setup enum index mocks
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female", "other", "unknown" });
        
        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - Verify RFC-6901 jsonPointer format with array indices
        var enumError = errors.FirstOrDefault(e => e.ErrorCode == "INVALID_ENUM_VALUE");
        Assert.NotNull(enumError);
        Assert.Equal("/entry/1/resource/gender", enumError.JsonPointer);
        Assert.Contains("/entry/", enumError.JsonPointer);
        Assert.Matches(@"/entry/\d+/", enumError.JsonPointer);
    }

    [Fact]
    public async Task ValidateAsync_MultipleErrorTypes_ReturnsAllInOneRun()
    {
        // Arrange - Multiple different error types
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""invalid_gender"",
                    ""birthDate"": ""not-a-date"",
                    ""identifier"": {
                        ""value"": ""should-be-array""
                    }
                }
            }]
        }";

        // Setup enum index mock for gender validation
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female", "other", "unknown" });
        
        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - CRITICAL: Must return multiple errors in ONE validation run
        Assert.True(errors.Count >= 3, $"Expected at least 3 errors, got {errors.Count}");
        
        // Verify we have different error types
        var errorCodes = errors.Select(e => e.ErrorCode).Distinct().ToList();
        Assert.Contains("INVALID_ENUM_VALUE", errorCodes);
        Assert.Contains("FHIR_INVALID_PRIMITIVE", errorCodes);
        Assert.Contains("FHIR_ARRAY_EXPECTED", errorCodes);
        Assert.Contains("REQUIRED_FIELD_MISSING", errorCodes);
        
        // All errors must be STRUCTURE authority with ERROR severity
        Assert.All(errors, e =>
        {
            Assert.Equal("STRUCTURE", e.Source);
            Assert.Equal("error", e.Severity);
        });
    }

    [Fact]
    public async Task ValidateAsync_NoPocoDependency_ValidatesJsonOnly()
    {
        // Arrange - Structurally invalid JSON that would fail POCO parsing
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""invalid""
                }
            }]
        }";

        // Setup enum index mock
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Patient", "gender"))
            .Returns(new List<string> { "male", "female", "other", "unknown" });
        
        _mockEnumIndex
            .Setup(x => x.GetBindingStrength("R4", "Patient", "gender"))
            .Returns("required");

        // Act - Should succeed without POCO parsing
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - Should find errors based on JSON nodes only
        Assert.NotEmpty(errors);
        var enumError = errors.FirstOrDefault(e => e.ErrorCode == "INVALID_ENUM_VALUE");
        Assert.NotNull(enumError);
        
        // Verify schema service was called (JSON-based validation)
        _mockSchemaService.Verify(
            s => s.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task ValidateAsync_AllErrorsHaveValidDetails()
    {
        // Arrange
        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""gender"": ""invalid"",
                    ""birthDate"": ""bad-date""
                }
            }]
        }";

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert - All errors must have valid details per schema
        Assert.All(errors, error =>
        {
            Assert.NotNull(error.Details);
            Assert.NotEmpty(error.Details);
            
            // Verify schema compliance - details should not have null actual value unless it's REQUIRED_FIELD_MISSING
            if (error.ErrorCode != "REQUIRED_FIELD_MISSING" && error.Details.ContainsKey("actual"))
            {
                Assert.NotNull(error.Details["actual"]);
            }
        });
    }

    [Fact]
    public async Task ValidateAsync_BooleanValidation_ValidatesType()
    {
        // Arrange - Setup schema with boolean field
        var observationSchema = new FhirSchemaNode
        {
            Path = "Observation",
            ElementName = "Observation",
            Type = "Observation",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Observation.valueBoolean",
                    ElementName = "valueBoolean",
                    Type = "boolean",
                    Min = 0,
                    Max = "1",
                    IsArray = false
                }
            }
        };

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Observation", It.IsAny<CancellationToken>()))
            .ReturnsAsync(observationSchema);

        var bundleJson = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""document"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Observation"",
                    ""valueBoolean"": ""not-a-boolean""
                }
            }]
        }";

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4");

        // Assert
        var boolError = errors.FirstOrDefault(e => e.ErrorCode == "FHIR_INVALID_PRIMITIVE" && e.Path.Contains("valueBoolean"));
        Assert.NotNull(boolError);
        Assert.Contains("boolean", boolError.Message, StringComparison.OrdinalIgnoreCase);
    }
}
