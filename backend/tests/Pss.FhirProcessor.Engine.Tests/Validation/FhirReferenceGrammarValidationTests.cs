using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Phase 1, Rule 5: FHIR Reference Grammar Validation (STRUCTURE)
/// 
/// Tests that Reference elements follow correct FHIR grammar:
/// 1. Reference.reference format validation (relative, UUID, absolute URL)
/// 2. Field combination rules (reference + identifier is invalid)
/// 
/// This is STRUCTURE validation (blocking), not resolution or advisory.
/// </summary>
public class FhirReferenceGrammarValidationTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly Mock<ILogger<JsonNodeStructuralValidator>> _mockLogger;
    private readonly JsonNodeStructuralValidator _validator;

    public FhirReferenceGrammarValidationTests()
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

    #region Valid Reference Formats

    [Fact]
    public async Task ValidReference_RelativeFormat_ShouldNotEmitError()
    {
        // Arrange: Patient/123
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "Patient/123"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
    }

    [Fact]
    public async Task ValidReference_UuidFormat_ShouldNotEmitError()
    {
        // Arrange: urn:uuid:...
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "urn:uuid:550e8400-e29b-41d4-a716-446655440000"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
    }

    [Fact]
    public async Task ValidReference_AbsoluteUrlFormat_ShouldNotEmitError()
    {
        // Arrange: https://...
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "https://example.org/fhir/Patient/123"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
    }

    [Fact]
    public async Task ValidReference_IdentifierOnly_ShouldNotEmitError()
    {
        // Arrange: identifier only (no reference)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "identifier": {
                  "system": "http://hospital.org/patients",
                  "value": "12345"
                }
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT" || 
             e.ErrorCode == "FHIR_REFERENCE_INVALID_COMBINATION"));
    }

    [Fact]
    public async Task ValidReference_DisplayOnly_ShouldNotEmitError()
    {
        // Arrange: display only (no reference or identifier)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "display": "John Doe"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT" || 
             e.ErrorCode == "FHIR_REFERENCE_INVALID_COMBINATION"));
    }

    [Fact]
    public async Task ValidReference_ReferenceAndDisplay_ShouldNotEmitError()
    {
        // Arrange: reference + display (valid combination)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "Patient/123",
                "display": "John Doe"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT" || 
             e.ErrorCode == "FHIR_REFERENCE_INVALID_COMBINATION"));
    }

    [Fact]
    public async Task ValidReference_IdentifierAndDisplay_ShouldNotEmitError()
    {
        // Arrange: identifier + display (valid combination)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "identifier": {
                  "system": "http://hospital.org/patients",
                  "value": "12345"
                },
                "display": "John Doe"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        Assert.DoesNotContain(errors, e => 
            e.Source == "STRUCTURE" && 
            (e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT" || 
             e.ErrorCode == "FHIR_REFERENCE_INVALID_COMBINATION"));
    }

    #endregion

    #region Invalid Reference Formats

    [Fact]
    public async Task InvalidReference_EmptyString_ShouldEmitStructureError()
    {
        // Arrange: empty reference string
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": ""
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
        Assert.Equal("Observation", error.ResourceType);
        Assert.Contains("Observation.subject", error.Path);
        Assert.Contains("relative reference", error.Message);
        Assert.Contains("absolute URL", error.Message);
        Assert.Contains("urn:uuid", error.Message);
    }

    [Fact]
    public async Task InvalidReference_RandomString_ShouldEmitStructureError()
    {
        // Arrange: random string without format
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "abc"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
        Assert.Equal("Observation", error.ResourceType);
        Assert.Contains("Observation.subject", error.Path);
    }

    [Fact]
    public async Task InvalidReference_LowercaseResourceType_ShouldEmitStructureError()
    {
        // Arrange: patient/123 (lowercase)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "patient/123"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
        Assert.Equal("Observation", error.ResourceType);
        Assert.Contains("Observation.subject", error.Path);
    }

    [Fact]
    public async Task InvalidReference_MissingId_ShouldEmitStructureError()
    {
        // Arrange: Patient (no id)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "Patient"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
        Assert.Equal("Observation", error.ResourceType);
        Assert.Contains("Observation.subject", error.Path);
    }

    [Fact]
    public async Task InvalidReference_WithWhitespace_ShouldEmitStructureError()
    {
        // Arrange: reference with whitespace
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "Patient / 123"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
        Assert.Equal("Observation", error.ResourceType);
        Assert.Contains("Observation.subject", error.Path);
    }

    [Fact]
    public async Task InvalidReference_InvalidUuid_ShouldEmitStructureError()
    {
        // Arrange: malformed UUID
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "urn:uuid:not-a-valid-uuid"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
        Assert.Equal("Observation", error.ResourceType);
        Assert.Contains("Observation.subject", error.Path);
    }

    #endregion

    #region Invalid Field Combinations

    [Fact]
    public async Task InvalidCombination_ReferenceAndIdentifier_ShouldEmitStructureError()
    {
        // Arrange: reference + identifier (invalid)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "Patient/123",
                "identifier": {
                  "system": "http://hospital.org/patients",
                  "value": "12345"
                }
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_REFERENCE_INVALID_COMBINATION");
        Assert.Equal("Observation", error.ResourceType);
        Assert.Contains("Observation.subject", error.Path);
        Assert.Contains("must not contain both reference and identifier", error.Message);
    }

    [Fact]
    public async Task InvalidCombination_ReferenceIdentifierDisplay_ShouldEmitStructureError()
    {
        // Arrange: reference + identifier + display (invalid)
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "Patient/123",
                "identifier": {
                  "system": "http://hospital.org/patients",
                  "value": "12345"
                },
                "display": "John Doe"
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_REFERENCE_INVALID_COMBINATION");
        Assert.Equal("Observation", error.ResourceType);
        Assert.Contains("Observation.subject", error.Path);
        Assert.Contains("must not contain both reference and identifier", error.Message);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task MultipleReferences_SomeInvalid_ShouldEmitCorrectErrors()
    {
        // Arrange: Multiple references, one invalid format, one invalid combination
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "DiagnosticReport",
              "id": "report1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "11502-2"}]
              },
              "subject": {
                "reference": "patient/123"
              },
              "performer": [{
                "reference": "Practitioner/456",
                "identifier": {
                  "system": "http://hospital.org/staff",
                  "value": "789"
                }
              }],
              "resultsInterpreter": [{
                "reference": "Practitioner/789"
              }]
            }
          }]
        }
        """;

        SetupBundleWithDiagnosticReportSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var structureErrors = errors.Where(e => e.Source == "STRUCTURE").ToList();
        Assert.Equal(2, structureErrors.Count);
        
        Assert.Contains(structureErrors, e => 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT" && 
            e.Path.Contains("DiagnosticReport.subject"));
        
        Assert.Contains(structureErrors, e => 
            e.ErrorCode == "FHIR_REFERENCE_INVALID_COMBINATION" && 
            e.Path.Contains("DiagnosticReport.performer"));
    }

    [Fact]
    public async Task ReferenceInArray_InvalidFormat_ShouldEmitError()
    {
        // Arrange: Reference in array with invalid format
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "DiagnosticReport",
              "id": "report1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "11502-2"}]
              },
              "performer": [{
                "reference": "Practitioner/123"
              }, {
                "reference": "invalid-ref"
              }]
            }
          }]
        }
        """;

        SetupBundleWithDiagnosticReportSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var error = Assert.Single(errors, e => 
            e.Source == "STRUCTURE" && 
            e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
        Assert.Contains("DiagnosticReport.performer[1]", error.Path);
    }

    [Fact]
    public async Task BothFormatAndCombinationInvalid_ShouldEmitBothErrors()
    {
        // Arrange: Both format and combination violations
        var bundle = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Observation",
              "id": "obs1",
              "status": "final",
              "code": {
                "coding": [{"system": "http://loinc.org", "code": "15074-8"}]
              },
              "subject": {
                "reference": "invalid",
                "identifier": {
                  "system": "http://hospital.org/patients",
                  "value": "12345"
                }
              }
            }
          }]
        }
        """;

        SetupBundleWithObservationSchema();

        // Act
        var errors = await _validator.ValidateAsync(bundle, "R5");

        // Assert
        var structureErrors = errors.Where(e => 
            e.Source == "STRUCTURE" && 
            e.Path.Contains("Observation.subject")).ToList();
        Assert.Equal(2, structureErrors.Count);
        Assert.Contains(structureErrors, e => e.ErrorCode == "FHIR_INVALID_REFERENCE_FORMAT");
        Assert.Contains(structureErrors, e => e.ErrorCode == "FHIR_REFERENCE_INVALID_COMBINATION");
    }

    #endregion

    #region Schema Setup Helpers

    private void SetupBundleWithObservationSchema()
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
                            // No children - resources are validated separately via GetResourceSchemaAsync
                            Children = new List<FhirSchemaNode>()
                        }
                    }
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        // Setup Observation schema
        var observationSchema = new FhirSchemaNode
        {
            Path = "Observation",
            ElementName = "Observation",
            Type = "Observation",
            Children = new List<FhirSchemaNode>
            {
                new() { ElementName = "resourceType", Type = "code" },
                new() { ElementName = "id", Type = "id" },
                new() { ElementName = "status", Type = "code" },
                new()
                {
                    ElementName = "code",
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
                    ElementName = "subject",
                    Type = "Reference",
                    Children = new List<FhirSchemaNode>
                    {
                        new() { ElementName = "reference", Type = "string" },
                        new()
                        {
                            ElementName = "identifier",
                            Type = "Identifier",
                            Children = new List<FhirSchemaNode>
                            {
                                new() { ElementName = "system", Type = "uri" },
                                new() { ElementName = "value", Type = "string" }
                            }
                        },
                        new() { ElementName = "display", Type = "string" }
                    }
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Observation", It.IsAny<CancellationToken>()))
            .ReturnsAsync(observationSchema);
    }

    private void SetupBundleWithDiagnosticReportSchema()
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
                            // No children - resources are validated separately via GetResourceSchemaAsync
                            Children = new List<FhirSchemaNode>()
                        }
                    }
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        // Setup DiagnosticReport schema
        var diagnosticReportSchema = new FhirSchemaNode
        {
            Path = "DiagnosticReport",
            ElementName = "DiagnosticReport",
            Type = "DiagnosticReport",
            Children = new List<FhirSchemaNode>
            {
                new() { ElementName = "resourceType", Type = "code" },
                new() { ElementName = "id", Type = "id" },
                new() { ElementName = "status", Type = "code" },
                new()
                {
                    ElementName = "code",
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
                    ElementName = "subject",
                    Type = "Reference",
                    Children = new List<FhirSchemaNode>
                    {
                        new() { ElementName = "reference", Type = "string" },
                        new()
                        {
                            ElementName = "identifier",
                            Type = "Identifier",
                            Children = new List<FhirSchemaNode>
                            {
                                new() { ElementName = "system", Type = "uri" },
                                new() { ElementName = "value", Type = "string" }
                            }
                        },
                        new() { ElementName = "display", Type = "string" }
                    }
                },
                new()
                {
                    ElementName = "performer",
                    Type = "Reference",
                    IsArray = true,
                    Children = new List<FhirSchemaNode>
                    {
                        new() { ElementName = "reference", Type = "string" },
                        new()
                        {
                            ElementName = "identifier",
                            Type = "Identifier",
                            Children = new List<FhirSchemaNode>
                            {
                                new() { ElementName = "system", Type = "uri" },
                                new() { ElementName = "value", Type = "string" }
                            }
                        },
                        new() { ElementName = "display", Type = "string" }
                    }
                },
                new()
                {
                    ElementName = "resultsInterpreter",
                    Type = "Reference",
                    IsArray = true,
                    Children = new List<FhirSchemaNode>
                    {
                        new() { ElementName = "reference", Type = "string" },
                        new()
                        {
                            ElementName = "identifier",
                            Type = "Identifier",
                            Children = new List<FhirSchemaNode>
                            {
                                new() { ElementName = "system", Type = "uri" },
                                new() { ElementName = "value", Type = "string" }
                            }
                        },
                        new() { ElementName = "display", Type = "string" }
                    }
                }
            }
        };

        _mockSchemaService
            .Setup(x => x.GetResourceSchemaAsync("DiagnosticReport", It.IsAny<CancellationToken>()))
            .ReturnsAsync(diagnosticReportSchema);
    }

    #endregion
}
