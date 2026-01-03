using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Moq;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation;
using Xunit;
using Microsoft.Extensions.Logging.Abstractions;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Phase 1, Rule 1: Tests for FHIR id grammar validation.
/// Ensures JsonNodeStructuralValidator correctly enforces FHIR id primitive constraints.
/// </summary>
public class FhirIdGrammarValidationTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly JsonNodeStructuralValidator _validator;

    public FhirIdGrammarValidationTests()
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

    [Theory]
    [InlineData("abc123")]          // alphanumeric
    [InlineData("ABC123")]          // uppercase
    [InlineData("a1b2c3")]          // mixed case
    [InlineData("test-id")]         // with dash
    [InlineData("test.id")]         // with dot
    [InlineData("test-id.123")]     // combination
    [InlineData("a")]               // single character
    [InlineData("1234567890123456789012345678901234567890123456789012345678901234")] // 64 chars max
    public async Task ValidFhirId_ShouldNotEmitError(string validId)
    {
        // Arrange
        var bundleJson = $$"""
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "id": "{{validId}}"
              }
            }
          ]
        }
        """;

        SetupBundleAndPatientSchema(withId: true, withBirthDate: false);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var idErrors = errors.Where(e => e.Path == "Patient.id").ToList();
        Assert.Empty(idErrors);
    }

    [Theory]
    [InlineData("", "empty string")]
    [InlineData("abc def", "contains space")]
    [InlineData("abc@123", "invalid character @")]
    [InlineData("abc#123", "invalid character #")]
    [InlineData("abc$123", "invalid character $")]
    [InlineData("abc%123", "invalid character %")]
    [InlineData("abc&123", "invalid character &")]
    [InlineData("abc*123", "invalid character *")]
    [InlineData("abc(123", "invalid character (")]
    [InlineData("abc)123", "invalid character )")]
    [InlineData("abc/123", "invalid character /")]
    [InlineData("abc\\123", "invalid character \\")]
    [InlineData("12345678901234567890123456789012345678901234567890123456789012345", "65 chars - too long")]
    public async Task InvalidFhirId_ShouldEmitStructureError(string invalidId, string reason)
    {
        // Arrange
        var bundleJson = $$"""
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "id": "{{invalidId}}"
              }
            }
          ]
        }
        """;

        var patientSchema = CreatePatientSchemaWithId();
        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", default))
            .ReturnsAsync(patientSchema);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Filter id errors only
        var idErrors = errors.Where(e => e.Path == "Patient.id").ToList();
        
        Assert.NotEmpty(idErrors);
        var idError = idErrors.First();
        
        // Verify error properties
        Assert.Equal("STRUCTURE", idError.Source);
        Assert.Equal("error", idError.Severity);
        Assert.Equal("FHIR_INVALID_ID_FORMAT", idError.ErrorCode);
        Assert.Equal("Patient", idError.ResourceType);
        Assert.Equal("Patient.id", idError.Path);
        Assert.Contains("Must be 1-64 characters containing only [A-Za-z0-9.-]", idError.Message);
        
        // Verify details
        Assert.NotNull(idError.Details);
        Assert.Equal(invalidId, idError.Details["actual"]);
        Assert.Equal("id", idError.Details["expectedType"]);
    }

    [Fact]
    public async Task MultipleInvalidIds_ShouldEmitMultipleErrors()
    {
        // Arrange - Two patients with invalid ids
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "id": "invalid id with spaces"
              }
            },
            {
              "resource": {
                "resourceType": "Patient",
                "id": "invalid@id"
              }
            }
          ]
        }
        """;

        var patientSchema = CreatePatientSchemaWithId();
        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", default))
            .ReturnsAsync(patientSchema);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Should have 2 id validation errors
        var idErrors = errors.Where(e => e.ErrorCode == "FHIR_INVALID_ID_FORMAT").ToList();
        Assert.Equal(2, idErrors.Count);
        
        // All should be STRUCTURE/error
        Assert.All(idErrors, error =>
        {
            Assert.Equal("STRUCTURE", error.Source);
            Assert.Equal("error", error.Severity);
        });
    }

    [Fact]
    public async Task ValidId_WithOtherInvalidPrimitives_ShouldOnlyEmitNonIdErrors()
    {
        // Arrange - Valid id, invalid birthDate
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "id": "valid-id-123",
                "birthDate": "not-a-date"
              }
            }
          ]
        }
        """;

        var patientSchema = CreatePatientSchemaWithIdAndBirthDate();
        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", default))
            .ReturnsAsync(patientSchema);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert
        var idErrors = errors.Where(e => e.Path == "Patient.id").ToList();
        var birthDateErrors = errors.Where(e => e.Path == "Patient.birthDate").ToList();
        
        Assert.Empty(idErrors); // Valid id should not emit error
        Assert.NotEmpty(birthDateErrors); // Invalid birthDate should emit error
    }

    [Fact]
    public async Task NoDuplicateErrors_IdValidatedOnce()
    {
        // Arrange - Invalid id
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "id": "invalid@id"
              }
            }
          ]
        }
        """;

        var patientSchema = CreatePatientSchemaWithId();
        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", default))
            .ReturnsAsync(patientSchema);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R4", default);

        // Assert - Should have exactly 1 id error (no duplicates)
        var idErrors = errors.Where(e => e.Path == "Patient.id").ToList();
        Assert.Single(idErrors);
    }

    // Helper methods

    private void SetupBundleAndPatientSchema(bool withId, bool withBirthDate)
    {
        // Setup Bundle schema
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
                    IsArray = true,
                    Min = 0,
                    Max = "*"
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Bundle", default))
            .ReturnsAsync(bundleSchema);

        // Setup Patient schema
        var patientChildren = new List<FhirSchemaNode>();
        
        if (withId)
        {
            patientChildren.Add(new FhirSchemaNode
            {
                Path = "Patient.id",
                ElementName = "id",
                Type = "id",
                Min = 0,
                Max = "1"
            });
        }
        
        if (withBirthDate)
        {
            patientChildren.Add(new FhirSchemaNode
            {
                Path = "Patient.birthDate",
                ElementName = "birthDate",
                Type = "date",
                Min = 0,
                Max = "1"
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
            .Setup(x => x.GetResourceSchemaAsync("Patient", default))
            .ReturnsAsync(patientSchema);
    }

    private FhirSchemaNode CreatePatientSchemaWithId()
    {
        return new FhirSchemaNode
        {
            Path = "Patient",
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Patient.id",
                    ElementName = "id",
                    Type = "id",
                    Min = 0,
                    Max = "1"
                }
            }
        };
    }

    private FhirSchemaNode CreatePatientSchemaWithIdAndBirthDate()
    {
        return new FhirSchemaNode
        {
            Path = "Patient",
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new()
                {
                    Path = "Patient.id",
                    ElementName = "id",
                    Type = "id",
                    Min = 0,
                    Max = "1"
                },
                new()
                {
                    Path = "Patient.birthDate",
                    ElementName = "birthDate",
                    Type = "date",
                    Min = 0,
                    Max = "1"
                }
            }
        };
    }
}
