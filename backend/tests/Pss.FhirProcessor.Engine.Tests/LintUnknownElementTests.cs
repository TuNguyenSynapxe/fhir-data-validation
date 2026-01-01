using Xunit;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Microsoft.Extensions.Logging.Abstractions;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for UNKNOWN_ELEMENT lint rule - schema-driven detection of unknown FHIR elements.
/// This rule is debug-mode only and best-effort.
/// </summary>
public class LintUnknownElementTests
{
    private readonly LintValidationService _lintService;

    public LintUnknownElementTests()
    {
        var schemaService = TestHelper.CreateFhirSchemaService();
        _lintService = new LintValidationService(
            NullLogger<LintValidationService>.Instance,
            schemaService);
    }

    [Fact]
    public async Task KnownField_NoLintIssue()
    {
        // Arrange - Valid Patient resource with known fields
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""name"": [{
                        ""family"": ""Doe"",
                        ""given"": [""John""]
                    }],
                    ""gender"": ""male"",
                    ""birthDate"": ""1990-01-01""
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - Should NOT flag any known fields as unknown
        Assert.DoesNotContain(issues, i => i.RuleId == "UNKNOWN_ELEMENT");
    }

    [Fact]
    public async Task UnknownField_ReturnsLintWarning()
    {
        // Arrange - Patient with typo field "abcPeriod" (should be "period")
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""name"": [{
                        ""family"": ""Doe"",
                        ""given"": [""John""]
                    }],
                    ""abcPeriod"": {
                        ""start"": ""2020-01-01""
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var unknownIssue = issues.FirstOrDefault(i => i.RuleId == "UNKNOWN_ELEMENT");
        Assert.NotNull(unknownIssue);
        Assert.Equal("Warning", unknownIssue.Severity);
        Assert.Equal("High", unknownIssue.Confidence);
        Assert.Contains("abcPeriod", unknownIssue.Message);
        Assert.Contains("Patient", unknownIssue.Message);
        Assert.Equal("Patient", unknownIssue.ResourceType);
    }

    [Fact(Skip = "Unknown element detection may now be handled by STRUCTURE layer - verify no duplication")]
    public async Task NestedUnknownField_DetectedCorrectly()
    {
        // Arrange - Unknown field inside Patient.contact (abcName instead of name)
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""contact"": [{
                        ""abcName"": {
                            ""family"": ""Emergency"",
                            ""given"": [""Contact""]
                        },
                        ""relationship"": [{
                            ""coding"": [{
                                ""system"": ""http://terminology.hl7.org/CodeSystem/v2-0131"",
                                ""code"": ""C""
                            }]
                        }]
                    }]
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - verify unknown element detected, path format may vary
        var unknownIssue = issues.FirstOrDefault(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            i.Message.Contains("abcName"));
        
        Assert.NotNull(unknownIssue);
        Assert.Contains("abcName", unknownIssue.Message);
        // Path format can vary - just verify it references contact
        Assert.True(
            unknownIssue.FhirPath.Contains("contact") && unknownIssue.FhirPath.Contains("abcName"),
            $"Expected path to contain 'contact' and 'abcName', got: {unknownIssue.FhirPath}");
    }

    [Fact]
    public async Task UnknownFieldInsideArrayItem_DetectedCorrectly()
    {
        // Arrange - Unknown field inside array item
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""name"": [{
                        ""family"": ""Doe"",
                        ""given"": [""John""],
                        ""unknownSuffix"": [""Jr.""]
                    }]
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var unknownIssue = issues.FirstOrDefault(i => i.RuleId == "UNKNOWN_ELEMENT" && i.Message.Contains("unknownSuffix"));
        Assert.NotNull(unknownIssue);
        Assert.Contains("unknownSuffix", unknownIssue.Message);
    }

    [Fact]
    public async Task Extension_NotFlagged()
    {
        // Arrange - extension field should NOT be flagged
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""extension"": [{
                        ""url"": ""http://example.org/custom-extension"",
                        ""valueString"": ""custom value""
                    }],
                    ""name"": [{
                        ""family"": ""Doe""
                    }]
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - extension should NOT be flagged as unknown
        Assert.DoesNotContain(issues, i => i.RuleId == "UNKNOWN_ELEMENT" && i.Message.Contains("extension"));
    }

    [Fact]
    public async Task ModifierExtension_NotFlagged()
    {
        // Arrange - modifierExtension field should NOT be flagged
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""modifierExtension"": [{
                        ""url"": ""http://example.org/modifier-extension"",
                        ""valueBoolean"": true
                    }],
                    ""name"": [{
                        ""family"": ""Doe""
                    }]
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - modifierExtension should NOT be flagged as unknown
        Assert.DoesNotContain(issues, i => i.RuleId == "UNKNOWN_ELEMENT" && i.Message.Contains("modifierExtension"));
    }

    [Fact]
    public async Task ResourceType_NotFlagged()
    {
        // Arrange - resourceType field should NOT be flagged
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""name"": [{
                        ""family"": ""Doe""
                    }]
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - resourceType should NOT be flagged as unknown
        Assert.DoesNotContain(issues, i => i.RuleId == "UNKNOWN_ELEMENT" && i.Message.Contains("resourceType"));
    }

    [Fact]
    public async Task PrimitiveExtension_NotFlagged()
    {
        // Arrange - primitive extension fields (starting with _) should NOT be flagged
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""birthDate"": ""1990-01-01"",
                    ""_birthDate"": {
                        ""extension"": [{
                            ""url"": ""http://example.org/date-precision"",
                            ""valueCode"": ""day""
                        }]
                    },
                    ""name"": [{
                        ""family"": ""Doe""
                    }]
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - _birthDate should NOT be flagged as unknown
        Assert.DoesNotContain(issues, i => i.RuleId == "UNKNOWN_ELEMENT" && i.Message.Contains("_birthDate"));
    }

    [Fact]
    public async Task MultipleUnknownElements_AllReported()
    {
        // Arrange - Multiple unknown fields in one resource
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""unknownField1"": ""value1"",
                    ""name"": [{
                        ""family"": ""Doe"",
                        ""unknownField2"": ""value2""
                    }],
                    ""unknownField3"": {
                        ""nested"": ""value""
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - All unknown fields should be reported
        var unknownIssues = issues.Where(i => i.RuleId == "UNKNOWN_ELEMENT").ToList();
        Assert.True(unknownIssues.Count >= 3, $"Expected at least 3 unknown element issues, got {unknownIssues.Count}");
        
        Assert.Contains(unknownIssues, i => i.Message.Contains("unknownField1"));
        Assert.Contains(unknownIssues, i => i.Message.Contains("unknownField2"));
        Assert.Contains(unknownIssues, i => i.Message.Contains("unknownField3"));
    }

    [Fact]
    public async Task UnknownElement_ContainsProperDetails()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""typoField"": ""value""
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var unknownIssue = issues.FirstOrDefault(i => i.RuleId == "UNKNOWN_ELEMENT");
        Assert.NotNull(unknownIssue);
        Assert.Equal("UNKNOWN_ELEMENT", unknownIssue.RuleId);
        Assert.Equal("SchemaShape", unknownIssue.Category);
        Assert.Equal("Warning", unknownIssue.Severity);
        Assert.Equal("High", unknownIssue.Confidence);
        Assert.Equal("Unknown FHIR element", unknownIssue.Title);
        Assert.Contains("does not exist in the FHIR specification", unknownIssue.Description);
        Assert.Contains("Best-effort check", unknownIssue.Disclaimer);
        Assert.Contains("Extensions or custom elements may be valid", unknownIssue.Disclaimer);
        Assert.NotNull(unknownIssue.Details);
        Assert.True(unknownIssue.Details.ContainsKey("propertyName"));
        Assert.True(unknownIssue.Details.ContainsKey("fhirPath"));
    }

    [Fact]
    public async Task ObservationWithUnknownField_DetectedCorrectly()
    {
        // Arrange - Test with different resource type
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Observation"",
                    ""id"": ""obs-001"",
                    ""status"": ""final"",
                    ""code"": {
                        ""coding"": [{
                            ""system"": ""http://loinc.org"",
                            ""code"": ""15074-8""
                        }]
                    },
                    ""unknownMeasurement"": {
                        ""value"": 120
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var unknownIssue = issues.FirstOrDefault(i => i.RuleId == "UNKNOWN_ELEMENT" && i.Message.Contains("unknownMeasurement"));
        Assert.NotNull(unknownIssue);
        Assert.Equal("Observation", unknownIssue.ResourceType);
        Assert.Contains("unknownMeasurement", unknownIssue.Message);
    }
}
