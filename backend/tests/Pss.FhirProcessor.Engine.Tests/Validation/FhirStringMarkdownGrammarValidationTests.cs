using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Validation;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Phase 1, Rule 2: FHIR string vs markdown newline grammar validation.
/// FHIR string primitives MUST NOT contain newline characters (\n, \r).
/// FHIR markdown primitives MAY contain newline characters.
/// This is a STRUCTURE rule (blocking correctness).
/// </summary>
public class FhirStringMarkdownGrammarValidationTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly JsonNodeStructuralValidator _validator;

    public FhirStringMarkdownGrammarValidationTests()
    {
        _mockSchemaService = new Mock<IFhirSchemaService>();
        _mockEnumIndex = new Mock<IFhirEnumIndex>();
        _validator = new JsonNodeStructuralValidator(
            _mockSchemaService.Object,
            _mockEnumIndex.Object,
            NullLogger<JsonNodeStructuralValidator>.Instance);

        // Setup empty enum index (no enum validation for these tests)
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((List<string>?)null);
    }

    // ==================================================================================
    // VALID CASES - string primitives without newlines
    // ==================================================================================

    [Fact]
    public async Task ValidString_WithoutNewlines_ShouldNotEmitError()
    {
        // Arrange - Patient.name.text (string) without newlines
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "name": [
                  {
                    "text": "John Doe"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema(includeNameText: true, includeMarkdownField: false);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - No errors for valid string
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.Empty(stringErrors);
    }

    [Fact]
    public async Task ValidString_WithSpacesAndTabs_ShouldNotEmitError()
    {
        // Arrange - String with spaces and tabs (valid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "name": [
                  {
                    "text": "John  \t  Doe"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema(includeNameText: true, includeMarkdownField: false);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.Empty(stringErrors);
    }

    [Fact]
    public async Task ValidString_EmptyString_ShouldNotEmitError()
    {
        // Arrange - Empty string (valid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "name": [
                  {
                    "text": ""
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema(includeNameText: true, includeMarkdownField: false);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.Empty(stringErrors);
    }

    // ==================================================================================
    // VALID CASES - markdown primitives with newlines (allowed)
    // ==================================================================================

    [Fact]
    public async Task ValidMarkdown_WithNewlines_ShouldNotEmitError()
    {
        // Arrange - Observation.note.text (markdown) with newlines
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
                "note": [
                  {
                    "text": "Line 1\nLine 2\nLine 3"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema(includeNote: true);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - No errors for markdown with newlines
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.Empty(stringErrors);
    }

    [Fact]
    public async Task ValidMarkdown_WithCRLF_ShouldNotEmitError()
    {
        // Arrange - Markdown with Windows-style line breaks
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
                "note": [
                  {
                    "text": "Line 1\r\nLine 2\r\nLine 3"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema(includeNote: true);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.Empty(stringErrors);
    }

    // ==================================================================================
    // INVALID CASES - string primitives with newlines
    // ==================================================================================

    [Fact]
    public async Task InvalidString_WithLF_ShouldEmitStructureError()
    {
        // Arrange - String with \n (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "name": [
                  {
                    "text": "Line 1\nLine 2"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema(includeNameText: true, includeMarkdownField: false);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.NotEmpty(stringErrors);
        
        var error = stringErrors.First();
        Assert.Equal("STRUCTURE", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("Patient.name[0].text", error.Path);
        Assert.Equal("/entry/0/resource/name/0/text", error.JsonPointer);
        Assert.Contains("newline", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InvalidString_WithCRLF_ShouldEmitStructureError()
    {
        // Arrange - String with \r\n (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "name": [
                  {
                    "text": "Line 1\r\nLine 2"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema(includeNameText: true, includeMarkdownField: false);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.NotEmpty(stringErrors);
        
        var error = stringErrors.First();
        Assert.Equal("STRUCTURE", error.Source);
        Assert.Equal("error", error.Severity);
    }

    [Fact]
    public async Task InvalidString_WithMultipleNewlines_ShouldEmitSingleError()
    {
        // Arrange - String with multiple newlines (should emit single error)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "name": [
                  {
                    "text": "Line 1\nLine 2\nLine 3\nLine 4"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema(includeNameText: true, includeMarkdownField: false);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Should have exactly 1 error (no duplicates)
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.Single(stringErrors);
    }

    [Fact]
    public async Task InvalidString_WithCR_ShouldEmitStructureError()
    {
        // Arrange - String with \r only (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "name": [
                  {
                    "text": "Line 1\rLine 2"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithPatientSchema(includeNameText: true, includeMarkdownField: false);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.NotEmpty(stringErrors);
    }

    // ==================================================================================
    // MIXED CASES - Both string and markdown in same resource
    // ==================================================================================

    [Fact]
    public async Task MixedPrimitives_InvalidStringValidMarkdown_ShouldOnlyEmitStringError()
    {
        // Arrange - Invalid string + valid markdown in same resource
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
                  "text": "Invalid\nString"
                },
                "note": [
                  {
                    "text": "Valid\nMarkdown"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema(includeNote: true);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Only code.text (string) should error, not note.text (markdown)
        var stringErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_STRING_NEWLINE").ToList();
        Assert.Single(stringErrors);
        Assert.Contains("code.text", stringErrors.First().Path);
    }

    // ==================================================================================
    // TEST HELPERS
    // ==================================================================================

    private void SetupBundleWithPatientSchema(bool includeNameText, bool includeMarkdownField)
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

        // Setup Patient schema
        var patientChildren = new List<FhirSchemaNode>();

        if (includeNameText)
        {
            patientChildren.Add(new FhirSchemaNode
            {
                Path = "Patient.name",
                ElementName = "name",
                Type = "HumanName",
                IsArray = true,
                Min = 0,
                Max = "*",
                Children = new List<FhirSchemaNode>
                {
                    new()
                    {
                        Path = "Patient.name.text",
                        ElementName = "text",
                        Type = "string",
                        Min = 0,
                        Max = "1"
                    }
                }
            });
        }

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

    private void SetupBundleWithObservationSchema(bool includeNote)
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

        // Setup Observation schema
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

        if (includeNote)
        {
            observationChildren.Add(new FhirSchemaNode
            {
                Path = "Observation.note",
                ElementName = "note",
                Type = "Annotation",
                IsArray = true,
                Min = 0,
                Max = "*",
                Children = new List<FhirSchemaNode>
                {
                    new()
                    {
                        Path = "Observation.note.text",
                        ElementName = "text",
                        Type = "markdown",
                        Min = 1,
                        Max = "1"
                    }
                }
            });
        }

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
}
