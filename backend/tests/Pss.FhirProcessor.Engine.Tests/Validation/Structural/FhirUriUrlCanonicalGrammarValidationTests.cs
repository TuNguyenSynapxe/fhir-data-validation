using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Validation.Structural;

/// <summary>
/// Tests for Phase 1, Rule 7: FHIR uri / url / canonical Grammar Validation (STRUCTURE).
/// Validates lexical grammar for uri, url, and canonical FHIR primitives.
/// </summary>
public class FhirUriUrlCanonicalGrammarValidationTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly Mock<ILogger<JsonNodeStructuralValidator>> _mockLogger;
    private readonly JsonNodeStructuralValidator _validator;

    public FhirUriUrlCanonicalGrammarValidationTests()
    {
        _mockSchemaService = new Mock<IFhirSchemaService>();
        _mockEnumIndex = new Mock<IFhirEnumIndex>();
        _mockLogger = new Mock<ILogger<JsonNodeStructuralValidator>>();
        _validator = new JsonNodeStructuralValidator(
            _mockSchemaService.Object,
            _mockEnumIndex.Object,
            _mockLogger.Object
        );
    }

    #region Valid uri Cases

    [Fact]
    public async Task ValidUri_RelativeReference_ShouldNotEmitError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "implicitRules": "Patient/123"
              }
            }
          ]
        }
        """;

        SetupPatientSchemaWithUri();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        Assert.DoesNotContain(errors, e => e.ErrorCode == "FHIR_INVALID_URI");
    }

    [Fact]
    public async Task ValidUri_UuidUrn_ShouldNotEmitError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "implicitRules": "urn:uuid:550e8400-e29b-41d4-a716-446655440000"
              }
            }
          ]
        }
        """;

        SetupPatientSchemaWithUri();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        Assert.DoesNotContain(errors, e => e.ErrorCode == "FHIR_INVALID_URI");
    }

    [Fact]
    public async Task ValidUri_AbsoluteUrl_ShouldNotEmitError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "implicitRules": "https://example.org/fhir/Patient/123"
              }
            }
          ]
        }
        """;

        SetupPatientSchemaWithUri();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        Assert.DoesNotContain(errors, e => e.ErrorCode == "FHIR_INVALID_URI");
    }

    #endregion

    #region Invalid uri Cases

    [Fact]
    public async Task InvalidUri_ContainsSpaces_ShouldEmitStructureError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "implicitRules": "abc def"
              }
            }
          ]
        }
        """;

        SetupPatientSchemaWithUri();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var uriError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_URI"));
        Assert.Equal("STRUCTURE", uriError.Source);
        Assert.Equal("error", uriError.Severity);
        Assert.Equal("Patient.implicitRules", uriError.Path);
    }

    [Fact]
    public async Task InvalidUri_EmptyString_ShouldEmitStructureError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "implicitRules": ""
              }
            }
          ]
        }
        """;

        SetupPatientSchemaWithUri();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var uriError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_URI"));
        Assert.Equal("STRUCTURE", uriError.Source);
        Assert.Equal("error", uriError.Severity);
    }

    [Fact]
    public async Task InvalidUri_ControlCharacters_ShouldEmitStructureError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "implicitRules": "http://example.org\u0000/path"
              }
            }
          ]
        }
        """;

        SetupPatientSchemaWithUri();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var uriError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_URI"));
        Assert.Equal("STRUCTURE", uriError.Source);
    }

    #endregion

    #region Valid url Cases

    [Fact]
    public async Task ValidUrl_HttpsAbsolute_ShouldNotEmitError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Questionnaire",
                "url": "https://example.org/fhir/Questionnaire/123"
              }
            }
          ]
        }
        """;

        SetupQuestionnaireSchemaWithUrl();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        Assert.DoesNotContain(errors, e => e.ErrorCode == "FHIR_INVALID_URL");
    }

    [Fact]
    public async Task ValidUrl_HttpAbsolute_ShouldNotEmitError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Questionnaire",
                "url": "http://example.org/fhir/Questionnaire/123"
              }
            }
          ]
        }
        """;

        SetupQuestionnaireSchemaWithUrl();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        Assert.DoesNotContain(errors, e => e.ErrorCode == "FHIR_INVALID_URL");
    }

    #endregion

    #region Invalid url Cases

    [Fact]
    public async Task InvalidUrl_RelativePath_ShouldEmitStructureError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Questionnaire",
                "url": "Patient/123"
              }
            }
          ]
        }
        """;

        SetupQuestionnaireSchemaWithUrl();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var urlError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_URL"));
        Assert.Equal("STRUCTURE", urlError.Source);
        Assert.Equal("error", urlError.Severity);
        Assert.Equal("Questionnaire.url", urlError.Path);
    }

    [Fact]
    public async Task InvalidUrl_EmptyString_ShouldEmitStructureError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Questionnaire",
                "url": ""
              }
            }
          ]
        }
        """;

        SetupQuestionnaireSchemaWithUrl();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var urlError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_URL"));
        Assert.Equal("STRUCTURE", urlError.Source);
    }

    [Fact]
    public async Task InvalidUrl_ContainsSpaces_ShouldEmitStructureError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Questionnaire",
                "url": "https://example.org/path with spaces"
              }
            }
          ]
        }
        """;

        SetupQuestionnaireSchemaWithUrl();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var urlError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_URL"));
        Assert.Equal("STRUCTURE", urlError.Source);
    }

    #endregion

    #region Valid canonical Cases

    [Fact]
    public async Task ValidCanonical_AbsoluteWithoutVersion_ShouldNotEmitError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "StructureDefinition",
                "baseDefinition": "https://example.org/StructureDefinition/foo"
              }
            }
          ]
        }
        """;

        SetupStructureDefinitionSchemaWithCanonical();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        Assert.DoesNotContain(errors, e => e.ErrorCode == "FHIR_INVALID_CANONICAL");
    }

    [Fact]
    public async Task ValidCanonical_AbsoluteWithVersion_ShouldNotEmitError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "StructureDefinition",
                "baseDefinition": "https://example.org/StructureDefinition/foo|1.0.0"
              }
            }
          ]
        }
        """;

        SetupStructureDefinitionSchemaWithCanonical();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        Assert.DoesNotContain(errors, e => e.ErrorCode == "FHIR_INVALID_CANONICAL");
    }

    #endregion

    #region Invalid canonical Cases

    [Fact]
    public async Task InvalidCanonical_RelativePath_ShouldEmitStructureError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "StructureDefinition",
                "baseDefinition": "Patient/foo"
              }
            }
          ]
        }
        """;

        SetupStructureDefinitionSchemaWithCanonical();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var canonicalError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_CANONICAL"));
        Assert.Equal("STRUCTURE", canonicalError.Source);
        Assert.Equal("error", canonicalError.Severity);
        Assert.Equal("StructureDefinition.baseDefinition", canonicalError.Path);
    }

    [Fact]
    public async Task InvalidCanonical_EmptyVersionSuffix_ShouldEmitStructureError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "StructureDefinition",
                "baseDefinition": "https://example.org/foo|"
              }
            }
          ]
        }
        """;

        SetupStructureDefinitionSchemaWithCanonical();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var canonicalError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_CANONICAL"));
        Assert.Equal("STRUCTURE", canonicalError.Source);
    }

    [Fact]
    public async Task InvalidCanonical_EmptyString_ShouldEmitStructureError()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "StructureDefinition",
                "baseDefinition": ""
              }
            }
          ]
        }
        """;

        SetupStructureDefinitionSchemaWithCanonical();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var canonicalError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_CANONICAL"));
        Assert.Equal("STRUCTURE", canonicalError.Source);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task MultipleUriFields_AllInvalid_ShouldEmitMultipleErrors()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "implicitRules": "abc def"
              }
            },
            {
              "resource": {
                "resourceType": "Patient",
                "implicitRules": "xyz   123"
              }
            }
          ]
        }
        """;

        SetupPatientSchemaWithUri();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var uriErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_URI").ToList();
        Assert.Equal(2, uriErrors.Count);
    }

    [Fact]
    public async Task MixedUriUrlCanonical_AllInvalid_ShouldEmitCorrectErrors()
    {
        // Arrange - requires a resource with uri, url, and canonical fields
        // Using extension as it can contain uri values
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "implicitRules": "abc def",
                "extension": [
                  {
                    "url": "Patient/123",
                    "valueCanonical": "relative/path"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupPatientSchemaWithUriAndExtension();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        Assert.Contains(errors, e => e.ErrorCode == "FHIR_INVALID_URI");
        Assert.Contains(errors, e => e.ErrorCode == "FHIR_INVALID_URL");
        Assert.Contains(errors, e => e.ErrorCode == "FHIR_INVALID_CANONICAL");
    }

    [Fact]
    public async Task NestedExtensionWithInvalidUrl_ShouldEmitError()
    {
        // Arrange
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
                    "url": "relative/path",
                    "valueString": "test"
                  }
                ]
              }
            }
          ]
        }
        """;

        SetupPatientSchemaWithExtension();

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var urlError = Assert.Single(errors.Where(e => e.ErrorCode == "FHIR_INVALID_URL"));
        Assert.Equal("STRUCTURE", urlError.Source);
        Assert.Contains("extension", urlError.Path);
    }

    #endregion

    #region Schema Setup Helpers

    private void SetupPatientSchemaWithUri()
    {
        var bundleSchema = new FhirSchemaNode
        {
            ElementName = "Bundle",
            Type = "Bundle",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "entry",
                    Type = "BackboneElement",
                    IsArray = true
                }
            }
        };

        var patientSchema = new FhirSchemaNode
        {
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "implicitRules",
                    Type = "uri",
                    IsArray = false
                }
            }
        };

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);
    }

    private void SetupQuestionnaireSchemaWithUrl()
    {
        var bundleSchema = new FhirSchemaNode
        {
            ElementName = "Bundle",
            Type = "Bundle",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "entry",
                    Type = "BackboneElement",
                    IsArray = true
                }
            }
        };

        var questionnaireSchema = new FhirSchemaNode
        {
            ElementName = "Questionnaire",
            Type = "Questionnaire",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "url",
                    Type = "url",
                    IsArray = false
                }
            }
        };

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Questionnaire", It.IsAny<CancellationToken>()))
            .ReturnsAsync(questionnaireSchema);
    }

    private void SetupStructureDefinitionSchemaWithCanonical()
    {
        var bundleSchema = new FhirSchemaNode
        {
            ElementName = "Bundle",
            Type = "Bundle",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "entry",
                    Type = "BackboneElement",
                    IsArray = true
                }
            }
        };

        var structureDefSchema = new FhirSchemaNode
        {
            ElementName = "StructureDefinition",
            Type = "StructureDefinition",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "baseDefinition",
                    Type = "canonical",
                    IsArray = false
                }
            }
        };

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("StructureDefinition", It.IsAny<CancellationToken>()))
            .ReturnsAsync(structureDefSchema);
    }

    private void SetupPatientSchemaWithExtension()
    {
        var bundleSchema = new FhirSchemaNode
        {
            ElementName = "Bundle",
            Type = "Bundle",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "entry",
                    Type = "BackboneElement",
                    IsArray = true
                }
            }
        };

        var extensionSchema = new FhirSchemaNode
        {
            ElementName = "Extension",
            Type = "Extension",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "url",
                    Type = "url",
                    IsArray = false
                },
                new FhirSchemaNode
                {
                    ElementName = "valueString",
                    Type = "string",
                    IsArray = false
                }
            }
        };

        var patientSchema = new FhirSchemaNode
        {
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "extension",
                    Type = "Extension",
                    IsArray = true,
                    Children = extensionSchema.Children
                }
            }
        };

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);
    }

    private void SetupPatientSchemaWithUriAndExtension()
    {
        var bundleSchema = new FhirSchemaNode
        {
            ElementName = "Bundle",
            Type = "Bundle",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "entry",
                    Type = "BackboneElement",
                    IsArray = true
                }
            }
        };

        var extensionSchema = new FhirSchemaNode
        {
            ElementName = "Extension",
            Type = "Extension",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "url",
                    Type = "url",
                    IsArray = false
                },
                new FhirSchemaNode
                {
                    ElementName = "valueCanonical",
                    Type = "canonical",
                    IsArray = false
                }
            }
        };

        var patientSchema = new FhirSchemaNode
        {
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "implicitRules",
                    Type = "uri",
                    IsArray = false
                },
                new FhirSchemaNode
                {
                    ElementName = "extension",
                    Type = "Extension",
                    IsArray = true,
                    Children = extensionSchema.Children
                }
            }
        };

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);
    }

    #endregion
}
