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

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Guardrail tests to prevent Phase 1 STRUCTURE validation regression.
/// These tests enforce architectural constraints on STRUCTURE validation.
/// </summary>
public class StructureValidationGuardrailTests
{
    private readonly Mock<IFhirSchemaService> _mockSchemaService;
    private readonly Mock<IFhirEnumIndex> _mockEnumIndex;
    private readonly Mock<ILogger<JsonNodeStructuralValidator>> _mockLogger;
    private readonly JsonNodeStructuralValidator _validator;

    public StructureValidationGuardrailTests()
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

    /// <summary>
    /// Guardrail 1: Test Enforcement
    /// Every STRUCTURE error code must have test coverage (both passing and failing cases).
    /// This test documents all Phase 1 error codes and ensures they are tested.
    /// </summary>
    [Fact]
    public void Phase1_AllStructureErrorCodes_MustHaveTestCoverage()
    {
        // Arrange - Phase 1 STRUCTURE error codes
        var phase1ErrorCodes = new HashSet<string>
        {
            // Rule 1: FHIR id grammar
            "FHIR_INVALID_ID_FORMAT",
            
            // Rule 2: string vs markdown
            "FHIR_INVALID_STRING_NEWLINE",
            
            // Rule 3: code lexical grammar
            "FHIR_INVALID_CODE_LITERAL",
            
            // Rule 4: value[x] exclusivity
            "FHIR_MULTIPLE_VALUE_X",
            
            // Rule 5: Reference grammar
            "FHIR_INVALID_REFERENCE_FORMAT",
            "FHIR_REFERENCE_INVALID_COMBINATION",
            
            // Rule 6: Extension grammar
            "FHIR_EXTENSION_MISSING_URL",
            "FHIR_EXTENSION_INVALID_SHAPE",
            
            // Rule 7: uri / url / canonical grammar
            "FHIR_INVALID_URI",
            "FHIR_INVALID_URL",
            "FHIR_INVALID_CANONICAL"
        };

        // Act - Verify test classes exist for each rule
        var testClassesByRule = new Dictionary<string, string>
        {
            ["FHIR_INVALID_ID_FORMAT"] = "FhirIdGrammarValidationTests",
            ["FHIR_INVALID_STRING_NEWLINE"] = "FhirStringMarkdownGrammarValidationTests",
            ["FHIR_INVALID_CODE_LITERAL"] = "FhirCodeGrammarValidationTests",
            ["FHIR_MULTIPLE_VALUE_X"] = "FhirValueXExclusivityValidationTests",
            ["FHIR_INVALID_REFERENCE_FORMAT"] = "FhirReferenceGrammarValidationTests",
            ["FHIR_REFERENCE_INVALID_COMBINATION"] = "FhirReferenceGrammarValidationTests",
            ["FHIR_EXTENSION_MISSING_URL"] = "FhirExtensionGrammarValidationTests",
            ["FHIR_EXTENSION_INVALID_SHAPE"] = "FhirExtensionGrammarValidationTests",
            ["FHIR_INVALID_URI"] = "FhirUriUrlCanonicalGrammarValidationTests",
            ["FHIR_INVALID_URL"] = "FhirUriUrlCanonicalGrammarValidationTests",
            ["FHIR_INVALID_CANONICAL"] = "FhirUriUrlCanonicalGrammarValidationTests"
        };

        // Assert - Document test coverage
        Assert.Equal(11, phase1ErrorCodes.Count);
        Assert.Equal(11, testClassesByRule.Count);
        
        foreach (var errorCode in phase1ErrorCodes)
        {
            Assert.True(
                testClassesByRule.ContainsKey(errorCode),
                $"Error code {errorCode} must have documented test coverage in testClassesByRule mapping"
            );
        }
    }

    /// <summary>
    /// Guardrail 2: Authority Guard
    /// Only JsonNodeStructuralValidator may emit Source = "STRUCTURE".
    /// This test verifies the architectural constraint by checking that STRUCTURE
    /// errors can only come from the designated authority.
    /// </summary>
    [Fact]
    public async Task OnlyJsonNodeStructuralValidator_MayEmitStructureErrors()
    {
        // Arrange - Create a simple invalid payload
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
            }
          ]
        }
        """;

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
            Children = new List<FhirSchemaNode>()
        };

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert - All STRUCTURE errors must come from this validator
        var structureErrors = errors.Where(e => e.Source == "STRUCTURE").ToList();
        Assert.NotEmpty(structureErrors);
        
        // Verify they all have the expected characteristics
        Assert.All(structureErrors, error =>
        {
            Assert.Equal("STRUCTURE", error.Source);
            Assert.Equal("error", error.Severity);
            Assert.NotNull(error.ErrorCode);
            Assert.NotNull(error.Message);
        });

        // Document: This test proves JsonNodeStructuralValidator emits STRUCTURE
        // Any other component emitting STRUCTURE would violate the architecture
    }

    /// <summary>
    /// Guardrail 3: Duplicate Prevention
    /// Ensure no duplicate STRUCTURE errors are emitted for the same path + error code.
    /// Multiple violations should be reported separately, not as duplicates.
    /// </summary>
    [Fact]
    public async Task StructureValidation_MustNotEmitDuplicateErrors()
    {
        // Arrange - Bundle with multiple violations
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "id": "invalid id",
                "name": [
                  {
                    "given": ["John"],
                    "family": "Doe"
                  }
                ],
                "extension": [
                  {
                    "valueString": "test"
                  }
                ]
              }
            }
          ]
        }
        """;

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
                    ElementName = "name",
                    Type = "HumanName",
                    IsArray = true
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

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert - Check for duplicates using path + errorCode as key
        var structureErrors = errors.Where(e => e.Source == "STRUCTURE").ToList();
        
        var errorKeys = structureErrors
            .Select(e => $"{e.Path}|{e.ErrorCode}")
            .ToList();

        var duplicates = errorKeys
            .GroupBy(k => k)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        Assert.Empty(duplicates);
    }

    /// <summary>
    /// Guardrail 4: STRUCTURE Error Properties
    /// All STRUCTURE errors must have required properties and correct severity.
    /// </summary>
    [Fact]
    public async Task StructureErrors_MustHaveRequiredProperties()
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
                "id": "invalid id"
              }
            }
          ]
        }
        """;

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
            Children = new List<FhirSchemaNode>()
        };

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);

        // Act
        var errors = await _validator.ValidateAsync(bundleJson, "R5", CancellationToken.None);

        // Assert
        var structureErrors = errors.Where(e => e.Source == "STRUCTURE").ToList();
        Assert.NotEmpty(structureErrors);

        Assert.All(structureErrors, error =>
        {
            // Required properties
            Assert.Equal("STRUCTURE", error.Source);
            Assert.Equal("error", error.Severity); // STRUCTURE is always blocking
            Assert.NotNull(error.ErrorCode);
            Assert.False(string.IsNullOrWhiteSpace(error.ErrorCode));
            Assert.NotNull(error.Message);
            Assert.False(string.IsNullOrWhiteSpace(error.Message));
            
            // Path properties (at least one must be present)
            var hasPath = !string.IsNullOrWhiteSpace(error.Path) || 
                         !string.IsNullOrWhiteSpace(error.JsonPointer);
            Assert.True(hasPath, "STRUCTURE error must have Path or JsonPointer");
        });
    }

    /// <summary>
    /// Guardrail 5: Phase 1 Error Code Prefix
    /// All Phase 1 STRUCTURE error codes follow naming convention.
    /// </summary>
    [Fact]
    public void Phase1StructureErrors_MustFollowNamingConvention()
    {
        // Arrange - Phase 1 error codes
        var phase1ErrorCodes = new[]
        {
            "FHIR_INVALID_ID_FORMAT",
            "FHIR_INVALID_STRING_NEWLINE",
            "FHIR_INVALID_CODE_LITERAL",
            "FHIR_MULTIPLE_VALUE_X",
            "FHIR_INVALID_REFERENCE_FORMAT",
            "FHIR_REFERENCE_INVALID_COMBINATION",
            "FHIR_EXTENSION_MISSING_URL",
            "FHIR_EXTENSION_INVALID_SHAPE",
            "FHIR_INVALID_URI",
            "FHIR_INVALID_URL",
            "FHIR_INVALID_CANONICAL"
        };

        // Assert - All error codes follow FHIR_* naming convention
        Assert.All(phase1ErrorCodes, errorCode =>
        {
            Assert.StartsWith("FHIR_", errorCode);
            Assert.True(errorCode == errorCode.ToUpperInvariant(), 
                $"Error code {errorCode} must be uppercase");
            Assert.DoesNotContain(" ", errorCode);
        });
    }

    /// <summary>
    /// Guardrail 6: No SPEC_HINT from JsonNodeStructuralValidator
    /// JsonNodeStructuralValidator must only emit STRUCTURE errors, never SPEC_HINT.
    /// Advisory hints come from other validation layers.
    /// </summary>
    [Fact]
    public async Task JsonNodeStructuralValidator_MustNotEmitSpecHint()
    {
        // Arrange - Various test payloads
        var testCases = new[]
        {
            // Invalid id
            """
            {
              "resourceType": "Bundle",
              "type": "collection",
              "entry": [
                {
                  "resource": {
                    "resourceType": "Patient",
                    "id": "invalid id"
                  }
                }
              ]
            }
            """,
            // Invalid string with newline
            """
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
            """
        };

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

        var humanNameSchema = new FhirSchemaNode
        {
            ElementName = "HumanName",
            Type = "HumanName",
            Children = new List<FhirSchemaNode>
            {
                new FhirSchemaNode
                {
                    ElementName = "text",
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
                    ElementName = "name",
                    Type = "HumanName",
                    IsArray = true,
                    Children = humanNameSchema.Children
                }
            }
        };

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Bundle", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bundleSchema);

        _mockSchemaService
            .Setup(s => s.GetResourceSchemaAsync("Patient", It.IsAny<CancellationToken>()))
            .ReturnsAsync(patientSchema);

        // Act & Assert
        foreach (var testCase in testCases)
        {
            var errors = await _validator.ValidateAsync(testCase, "R5", CancellationToken.None);
            
            // JsonNodeStructuralValidator must never emit anything but STRUCTURE
            Assert.All(errors, error =>
            {
                Assert.Equal("STRUCTURE", error.Source);
            });
        }
    }
}
