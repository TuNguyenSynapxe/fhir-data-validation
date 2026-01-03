using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Phase 1, Rule 4: FHIR value[x] exclusivity validation.
/// FHIR elements may contain at most ONE value[x] field.
/// Multiple value[x] fields in the same element are invalid STRUCTURE.
/// </summary>
public class FhirValueXExclusivityValidationTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly JsonNodeStructuralValidator _validator;

    public FhirValueXExclusivityValidationTests()
    {
        _mockSchemaService = new Mock<IFhirSchemaService>();
        _mockEnumIndex = new Mock<IFhirEnumIndex>();
        _validator = new JsonNodeStructuralValidator(
            _mockSchemaService.Object,
            _mockEnumIndex.Object,
            NullLogger<JsonNodeStructuralValidator>.Instance);

        // Setup empty enum index
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((List<string>?)null);
    }

    // ==================================================================================
    // VALID CASES - single or no value[x] fields
    // ==================================================================================

    [Fact]
    public async Task ValidValueX_SingleValueString_ShouldNotEmitError()
    {
        // Arrange - Observation with single valueString
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test"
                },
                "valueString": "test value"
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - No value[x] exclusivity errors
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Empty(valueXErrors);
    }

    [Fact]
    public async Task ValidValueX_SingleValueCodeableConcept_ShouldNotEmitError()
    {
        // Arrange - Observation with single valueCodeableConcept
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test"
                },
                "valueCodeableConcept": {
                  "text": "Result"
                }
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Empty(valueXErrors);
    }

    [Fact]
    public async Task ValidValueX_NoValueField_ShouldNotEmitError()
    {
        // Arrange - Observation with no value[x]
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test"
                }
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Empty(valueXErrors);
    }

    [Fact]
    public async Task ValidValueX_ValueWithOtherFields_ShouldNotEmitError()
    {
        // Arrange - value[x] mixed with non-value fields (valid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test"
                },
                "valueString": "result",
                "interpretation": [
                  {
                    "text": "Normal"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Empty(valueXErrors);
    }

    // ==================================================================================
    // INVALID CASES - multiple value[x] fields
    // ==================================================================================

    [Fact]
    public async Task InvalidValueX_TwoValueFields_ShouldEmitSingleError()
    {
        // Arrange - Observation with both valueString and valueBoolean (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test"
                },
                "valueString": "test",
                "valueBoolean": true
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Should emit exactly ONE error
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Single(valueXErrors);
        
        var error = valueXErrors.First();
        Assert.Equal("STRUCTURE", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Contains("value[x]", error.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("only one", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InvalidValueX_ValueCodeableConceptAndValueQuantity_ShouldEmitError()
    {
        // Arrange - Multiple complex value[x] types
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test"
                },
                "valueCodeableConcept": {
                  "text": "Result"
                },
                "valueQuantity": {
                  "value": 100,
                  "unit": "mg"
                }
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Single(valueXErrors);
    }

    [Fact]
    public async Task InvalidValueX_ThreeValueFields_ShouldEmitSingleError()
    {
        // Arrange - Three value[x] fields (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test"
                },
                "valueString": "test",
                "valueBoolean": true,
                "valueInteger": 42
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Still only ONE error (not one per field)
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Single(valueXErrors);
    }

    // ==================================================================================
    // EXTENSION VALUE[X] CASES
    // ==================================================================================

    [Fact]
    public async Task ValidValueX_ExtensionWithSingleValue_ShouldNotEmitError()
    {
        // Arrange - Extension with single valueString
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "extension": [
                  {
                    "url": "http://example.org/ext",
                    "valueString": "test"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Empty(valueXErrors);
    }

    [Fact]
    public async Task InvalidValueX_ExtensionWithMultipleValues_ShouldEmitError()
    {
        // Arrange - Extension with multiple value[x]
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "extension": [
                  {
                    "url": "http://example.org/ext",
                    "valueString": "test",
                    "valueBoolean": false
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.NotEmpty(valueXErrors);
    }

    // ==================================================================================
    // ARRAY / MULTIPLE INSTANCES
    // ==================================================================================

    [Fact]
    public async Task ValidValueX_MultipleExtensionsEachWithOwnValue_ShouldNotEmitError()
    {
        // Arrange - Multiple extension instances, each with own single value[x]
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "extension": [
                  {
                    "url": "http://example.org/ext1",
                    "valueString": "test1"
                  },
                  {
                    "url": "http://example.org/ext2",
                    "valueBoolean": true
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Each extension instance is separate, so no error
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Empty(valueXErrors);
    }

    [Fact]
    public async Task ValidValueX_MultipleBundleEntriesWithValues_ShouldNotEmitError()
    {
        // Arrange - Multiple Bundle entries, each Observation has own value[x]
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test1"
                },
                "valueString": "result1"
              }
            },
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test2"
                },
                "valueBoolean": true
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Each resource instance is separate
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Empty(valueXErrors);
    }

    // ==================================================================================
    // EDGE CASES
    // ==================================================================================

    [Fact]
    public async Task InvalidValueX_VerifyPathPointsToParent()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                  "text": "Test"
                },
                "valueString": "test",
                "valueBoolean": true
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Path should point to parent element (Observation resource)
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.Single(valueXErrors);
        
        var error = valueXErrors.First();
        // Path should be at the resource level where multiple value[x] exist
        Assert.Equal("Observation", error.Path);
    }

    [Fact]
    public async Task InvalidValueX_DoesNotSuppressOtherErrors()
    {
        // Arrange - Multiple value[x] plus missing required field
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "code": {
                  "text": "Test"
                },
                "valueString": "test",
                "valueBoolean": true
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Both value[x] error and missing 'status' error should be present
        var valueXErrors = errors.Where(e => e.ErrorCode == "FHIR_MULTIPLE_VALUE_X").ToList();
        Assert.NotEmpty(valueXErrors);
        
        // Missing required 'status' field should also be reported
        var requiredErrors = errors.Where(e => e.ErrorCode == "REQUIRED_FIELD_MISSING").ToList();
        Assert.NotEmpty(requiredErrors);
    }

    // ==================================================================================
    // TEST HELPERS
    // ==================================================================================

    private void SetupBundleWithObservationSchema()
    {
        // Setup Bundle schema
        var bundleSchema = new FhirSchemaNode
        {
            Path = "Bundle",
            ElementName = "Bundle",
            Type = "Bundle",
            Children = new List<FhirSchemaNode>
            {
                new() { Path = "Bundle.type", ElementName = "type", Type = "code", Min = 1, Max = "1" },
                new() { Path = "Bundle.entry", ElementName = "entry", Type = "BackboneElement", IsArray = true, Min = 0, Max = "*" }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        // Setup Observation schema - simplified, validator will handle value[x] detection
        var observationChildren = new List<FhirSchemaNode>
        {
            new()
            {
                Path = "Observation.status",
                ElementName = "status",
                Type = "code",
                Min = 1,
                Max = "1"
            },
            new()
            {
                Path = "Observation.code",
                ElementName = "code",
                Type = "CodeableConcept",
                Min = 1,
                Max = "1",
                Children = new List<FhirSchemaNode>
                {
                    new()
                    {
                        Path = "Observation.code.text",
                        ElementName = "text",
                        Type = "string",
                        Min = 0,
                        Max = "1"
                    }
                }
            }
        };

        var observationSchema = new FhirSchemaNode
        {
            Path = "Observation",
            ElementName = "Observation",
            Type = "Observation",
            Children = observationChildren
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Observation", It.IsAny<CancellationToken>()))
            .ReturnsAsync(observationSchema);
    }

    private void SetupBundleWithPatientSchema()
    {
        // Setup Bundle schema
        var bundleSchema = new FhirSchemaNode
        {
            Path = "Bundle",
            ElementName = "Bundle",
            Type = "Bundle",
            Children = new List<FhirSchemaNode>
            {
                new() { Path = "Bundle.type", ElementName = "type", Type = "code", Min = 1, Max = "1" },
                new() { Path = "Bundle.entry", ElementName = "entry", Type = "BackboneElement", IsArray = true, Min = 0, Max = "*" }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        // Setup Patient schema with extension
        var patientChildren = new List<FhirSchemaNode>
        {
            new()
            {
                Path = "Patient.extension",
                ElementName = "extension",
                Type = "Extension",
                IsArray = true,
                Min = 0,
                Max = "*",
                Children = new List<FhirSchemaNode>
                {
                    new()
                    {
                        Path = "Patient.extension.url",
                        ElementName = "url",
                        Type = "uri",
                        Min = 1,
                        Max = "1"
                    }
                }
            }
        };

        var patientSchema = new FhirSchemaNode
        {
            Path = "Patient",
            ElementName = "Patient",
            Type = "Patient",
            Children = patientChildren
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);
    }
}
