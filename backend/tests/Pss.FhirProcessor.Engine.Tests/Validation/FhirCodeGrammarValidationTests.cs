using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Phase 1, Rule 3: FHIR code primitive lexical grammar validation.
/// FHIR code primitives MUST NOT contain whitespace or control characters.
/// This is STRUCTURE validation (lexical grammar), independent of terminology/enum validation.
/// </summary>
public class FhirCodeGrammarValidationTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly JsonNodeStructuralValidator _validator;

    public FhirCodeGrammarValidationTests()
    {
        _mockSchemaService = new Mock<IFhirSchemaService>();
        _mockEnumIndex = new Mock<IFhirEnumIndex>();
        _validator = new JsonNodeStructuralValidator(
            _mockSchemaService.Object,
            _mockEnumIndex.Object,
            NullLogger<JsonNodeStructuralValidator>.Instance);

        // Setup empty enum index (lexical validation is independent of enum membership)
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((List<string>?)null);
    }

    // ==================================================================================
    // VALID CASES - codes with valid lexical grammar
    // ==================================================================================

    [Theory]
    [InlineData("final")]
    [InlineData("in-progress")]
    [InlineData("entered-in-error")]
    [InlineData("ABC_123")]
    [InlineData("unknown")]
    [InlineData("preliminary")]
    [InlineData("amended")]
    [InlineData("corrected")]
    public async Task ValidCode_WithValidGrammar_ShouldNotEmitError(string validCode)
    {
        // Arrange - Observation.status (code) with valid lexical grammar
        var bundleJson = $$"""
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "{{validCode}}",
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

        // Assert - No lexical grammar errors for valid codes
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.Empty(codeErrors);
    }

    // ==================================================================================
    // INVALID CASES - codes with whitespace
    // ==================================================================================

    [Fact]
    public async Task InvalidCode_WithSpace_ShouldEmitStructureError()
    {
        // Arrange - Code with space (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "in progress",
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
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.NotEmpty(codeErrors);
        
        var error = codeErrors.First();
        Assert.Equal("STRUCTURE", error.Source);
        Assert.Equal("error", error.Severity);
        Assert.Equal("Bundle.entry[0].resource.status", error.Path);
        Assert.Equal("/entry/0/resource/status", error.JsonPointer);
        Assert.Contains("whitespace", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InvalidCode_WithLeadingSpace_ShouldEmitStructureError()
    {
        // Arrange - Code with leading space (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": " final",
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
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.NotEmpty(codeErrors);
    }

    [Fact]
    public async Task InvalidCode_WithTrailingSpace_ShouldEmitStructureError()
    {
        // Arrange - Code with trailing space (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "final ",
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
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.NotEmpty(codeErrors);
    }

    [Fact]
    public async Task InvalidCode_WithTab_ShouldEmitStructureError()
    {
        // Arrange - Code with tab character (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "in\tprogress",
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
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.NotEmpty(codeErrors);
    }

    [Fact]
    public async Task InvalidCode_WithNewline_ShouldEmitStructureError()
    {
        // Arrange - Code with newline (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "in\nprogress",
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
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.NotEmpty(codeErrors);
    }

    // ==================================================================================
    // INVALID CASES - control characters
    // ==================================================================================

    [Fact]
    public async Task InvalidCode_WithControlCharacter_ShouldEmitStructureError()
    {
        // Arrange - Code with control character (invalid)
        var codeWithControlChar = "bad\u0001code";
        var escapedCode = System.Text.Json.JsonSerializer.Serialize(codeWithControlChar);
        var bundleJson = $$"""
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": {{escapedCode}},
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
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.NotEmpty(codeErrors);
        
        var error = codeErrors.First();
        Assert.Contains("control character", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InvalidCode_WithDELCharacter_ShouldEmitStructureError()
    {
        // Arrange - Code with DEL character (0x7F) - invalid
        var codeWithDEL = "bad\u007Fcode";
        var escapedCode = System.Text.Json.JsonSerializer.Serialize(codeWithDEL);
        var bundleJson = $$"""
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": {{escapedCode}},
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
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.NotEmpty(codeErrors);
    }

    // ==================================================================================
    // INVALID CASES - empty string
    // ==================================================================================

    [Fact]
    public async Task InvalidCode_EmptyString_ShouldEmitStructureError()
    {
        // Arrange - Empty code (invalid)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "",
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
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.NotEmpty(codeErrors);
    }

    // ==================================================================================
    // INTERACTION WITH ENUM VALIDATION
    // ==================================================================================

    [Fact]
    public async Task InvalidCode_LexicallyInvalid_WithEnumSetup_ShouldStillEmitLexicalError()
    {
        // Arrange - Lexically invalid code, even with enum validation enabled
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "in progress",
                "code": {
                  "text": "Test"
                }
              }
            }
          ]
        }
        """;

        SetupBundleWithObservationSchema();
        
        // Setup enum validation (would check membership)
        _mockEnumIndex
            .Setup(x => x.GetAllowedValues("R4", "Observation", "status"))
            .Returns(new List<string> { "final", "preliminary", "amended" });

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Both lexical and enum errors may be present, but lexical must be
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.NotEmpty(codeErrors);
    }

    [Fact]
    public async Task ValidCode_Lexically_NoEnumSetup_ShouldNotEmitLexicalError()
    {
        // Arrange - Lexically valid code with no enum setup
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "unknown-status",
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

        // Assert - No lexical error for valid code (enum validation separate concern)
        var lexicalErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.Empty(lexicalErrors);
    }

    [Fact]
    public async Task NoDuplicateErrors_SingleCodeField_ShouldEmitSingleError()
    {
        // Arrange - Single invalid code should emit single error
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Observation",
                "status": "in valid",
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

        // Assert - Should have exactly 1 lexical error
        var codeErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_CODE_LITERAL").ToList();
        Assert.Single(codeErrors);
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

        // Setup Observation schema with status (code) and code (CodeableConcept)
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
}
