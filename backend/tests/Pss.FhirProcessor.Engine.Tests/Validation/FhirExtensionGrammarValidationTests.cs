using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Phase 1, Rule 6: FHIR Extension Grammar Validation (STRUCTURE)
/// 
/// Tests that Extension elements follow correct FHIR grammar:
/// 1. url must be present and non-empty
/// 2. Extension must contain either value[x] OR extension[], not both
/// 3. Extension must not be empty (url only)
/// 
/// This is STRUCTURE validation (blocking), not profile validation.
/// </summary>
public class FhirExtensionGrammarValidationTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly Mock<ILogger<JsonNodeStructuralValidator>> _mockLogger;
    private readonly JsonNodeStructuralValidator _validator;

    public FhirExtensionGrammarValidationTests()
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

    #region Valid Extension Shapes

    [Fact]
    public async Task ValidExtension_UrlAndValueString_ShouldNotEmitError()
    {
        // Arrange: Extension with url + valueString
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "url": "http://example.org/ethnicity",
                "valueString": "Hispanic"
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_EXTENSION_MISSING_URL" || 
             e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE"));
    }

    [Fact]
    public async Task ValidExtension_UrlAndValueCodeableConcept_ShouldNotEmitError()
    {
        // Arrange: Extension with url + valueCodeableConcept
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "url": "http://example.org/status",
                "valueCodeableConcept": {
                  "coding": [{
                    "system": "http://example.org",
                    "code": "active"
                  }]
                }
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_EXTENSION_MISSING_URL" || 
             e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE"));
    }

    [Fact]
    public async Task ValidExtension_UrlAndNestedExtensions_ShouldNotEmitError()
    {
        // Arrange: Extension with url + nested extension[]
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "url": "http://example.org/address",
                "extension": [
                  {
                    "url": "http://example.org/city",
                    "valueString": "Boston"
                  },
                  {
                    "url": "http://example.org/state",
                    "valueString": "MA"
                  }
                ]
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_EXTENSION_MISSING_URL" || 
             e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE"));
    }

    [Fact]
    public async Task ValidExtension_MultipleIndependentExtensions_ShouldNotEmitError()
    {
        // Arrange: Multiple valid extensions
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [
                {
                  "url": "http://example.org/ethnicity",
                  "valueString": "Hispanic"
                },
                {
                  "url": "http://example.org/race",
                  "valueCode": "2106-3"
                }
              ]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_EXTENSION_MISSING_URL" || 
             e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE"));
    }

    #endregion

    #region Invalid - Missing or Empty URL

    [Fact]
    public async Task InvalidExtension_MissingUrl_ShouldEmitStructureError()
    {
        // Arrange: Extension without url
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "valueString": "Hispanic"
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_EXTENSION_MISSING_URL");
        Assert.Equal("Patient", error.ResourceType);
        Assert.Contains("Patient.extension[0]", error.Path);
        Assert.Contains("must contain a non-empty url", error.Message);
    }

    [Fact]
    public async Task InvalidExtension_EmptyUrl_ShouldEmitStructureError()
    {
        // Arrange: Extension with empty url
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "url": "",
                "valueString": "Hispanic"
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_EXTENSION_MISSING_URL");
        Assert.Equal("Patient", error.ResourceType);
        Assert.Contains("Patient.extension[0]", error.Path);
    }

    [Fact]
    public async Task InvalidExtension_UrlNotString_ShouldEmitStructureError()
    {
        // Arrange: Extension with non-string url
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "url": 123,
                "valueString": "Hispanic"
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_EXTENSION_MISSING_URL");
        Assert.Equal("Patient", error.ResourceType);
        Assert.Contains("Patient.extension[0]", error.Path);
    }

    #endregion

    #region Invalid - Shape Violations

    [Fact]
    public async Task InvalidExtension_UrlOnly_ShouldEmitStructureError()
    {
        // Arrange: Extension with only url (no value or nested extensions)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "url": "http://example.org/ethnicity"
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE");
        Assert.Equal("Patient", error.ResourceType);
        Assert.Contains("Patient.extension[0]", error.Path);
        Assert.Contains("must contain either a single value[x] or nested extensions", error.Message);
    }

    [Fact]
    public async Task InvalidExtension_BothValueAndNestedExtensions_ShouldEmitStructureError()
    {
        // Arrange: Extension with both valueString AND nested extension[]
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "url": "http://example.org/address",
                "valueString": "123 Main St",
                "extension": [{
                  "url": "http://example.org/city",
                  "valueString": "Boston"
                }]
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE");
        Assert.Equal("Patient", error.ResourceType);
        Assert.Contains("Patient.extension[0]", error.Path);
        Assert.Contains("must contain either a single value[x] or nested extensions, but not both", error.Message);
    }

    [Fact]
    public async Task InvalidExtension_MultipleValueFields_ShouldEmitValueXError()
    {
        // Arrange: Extension with multiple value[x] fields
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "url": "http://example.org/test",
                "valueString": "abc",
                "valueBoolean": true
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        // Should emit value[x] exclusivity error (Rule 4), not extension shape error
        var valueXError = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_MULTIPLE_VALUE_X");
        Assert.Contains("Patient.extension[0]", valueXError.Path);
        
        // Should NOT emit extension shape error
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task InvalidExtension_NestedExtensionMissingUrl_ShouldEmitError()
    {
        // Arrange: Nested extension without url
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [{
                "url": "http://example.org/address",
                "extension": [{
                  "valueString": "Boston"
                }]
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_EXTENSION_MISSING_URL");
        Assert.Contains("Patient.extension[0].extension[0]", error.Path);
    }

    [Fact]
    public async Task InvalidExtension_MultipleInvalidExtensions_ShouldEmitMultipleErrors()
    {
        // Arrange: Multiple extensions with different violations
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": [
                {
                  "valueString": "no url"
                },
                {
                  "url": "http://example.org/empty"
                },
                {
                  "url": "http://example.org/both",
                  "valueString": "test",
                  "extension": [{
                    "url": "http://example.org/nested",
                    "valueCode": "x"
                  }]
                }
              ]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert - Should have 3 extension errors
        var extensionErrors = errors.Where(e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_EXTENSION_MISSING_URL" || 
             e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE")).ToList();
        Assert.Equal(3, extensionErrors.Count);
        
        // First: missing url
        Assert.Contains(extensionErrors, e => 
            e.ErrorCode == "FHIR_EXTENSION_MISSING_URL" && 
            e.Path.Contains("extension[0]"));
        
        // Second: url only
        Assert.Contains(extensionErrors, e => 
            e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE" && 
            e.Path.Contains("extension[1]"));
        
        // Third: both value and nested
        Assert.Contains(extensionErrors, e => 
            e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE" && 
            e.Path.Contains("extension[2]"));
    }

    [Fact]
    public async Task ValidExtension_DoesNotSuppressOtherErrors()
    {
        // Arrange: Invalid extension + invalid primitive
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "invalid@id",
              "extension": [{
                "url": "http://example.org/empty"
              }]
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert - Should have both extension error and id error
        Assert.Contains(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE");
        Assert.Contains(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_ID_FORMAT");
    }

    [Fact]
    public async Task ValidExtension_EmptyExtensionArray_ShouldNotEmitError()
    {
        // Arrange: Empty extension array (no extensions at all)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "id": "pat1",
              "extension": []
            }
          }]
        }
        """;

        SetupBundleWithPatientSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert - Empty array is valid, no errors expected
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_EXTENSION_MISSING_URL" || 
             e.ErrorCode == "FHIR_EXTENSION_INVALID_SHAPE"));
    }

    #endregion

    #region Schema Setup

    private void SetupBundleWithPatientSchema()
    {
        var bundleSchema = new FhirSchemaNode
        {
            Path = "Bundle",
            ElementName = "Bundle",
            Type = "Bundle",
            Children = new List<FhirSchemaNode>
            {
                new() { ElementName = "resourceType", Type = "code" },
                new() { ElementName = "type", Type = "code" },
                new()
                {
                    ElementName = "entry",
                    Type = "BackboneElement",
                    IsArray = true,
                    Children = new List<FhirSchemaNode>
                    {
                        new()
                        {
                            ElementName = "resource",
                            Type = "Resource",
                            Children = new List<FhirSchemaNode>()
                        }
                    }
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Bundle", It.IsAny<System.Threading.CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        // Setup Patient schema with extension support
        var patientSchema = new FhirSchemaNode
        {
            Path = "Patient",
            ElementName = "Patient",
            Type = "Patient",
            Children = new List<FhirSchemaNode>
            {
                new() { ElementName = "resourceType", Type = "code" },
                new() { ElementName = "id", Type = "id" },
                new()
                {
                    ElementName = "extension",
                    Type = "Extension",
                    IsArray = true,
                    Children = new List<FhirSchemaNode>
                    {
                        new() { ElementName = "url", Type = "uri" },
                        new() { ElementName = "valueString", Type = "string" },
                        new() { ElementName = "valueBoolean", Type = "boolean" },
                        new() { ElementName = "valueCode", Type = "code" },
                        new()
                        {
                            ElementName = "valueCodeableConcept",
                            Type = "CodeableConcept",
                            Children = new List<FhirSchemaNode>
                            {
                                new()
                                {
                                    ElementName = "coding",
                                    Type = "Coding",
                                    IsArray = true,
                                    Children = new List<FhirSchemaNode>
                                    {
                                        new() { ElementName = "system", Type = "uri" },
                                        new() { ElementName = "code", Type = "code" }
                                    }
                                }
                            }
                        },
                        new()
                        {
                            ElementName = "extension",
                            Type = "Extension",
                            IsArray = true,
                            Children = new List<FhirSchemaNode>
                            {
                                new() { ElementName = "url", Type = "uri" },
                                new() { ElementName = "valueString", Type = "string" },
                                new() { ElementName = "valueCode", Type = "code" }
                            }
                        }
                    }
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Patient", It.IsAny<System.Threading.CancellationToken>()))
            .ReturnsAsync(patientSchema);
    }

    #endregion
}
