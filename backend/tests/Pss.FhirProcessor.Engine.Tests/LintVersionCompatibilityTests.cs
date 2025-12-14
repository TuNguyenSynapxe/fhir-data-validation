using Xunit;
using Pss.FhirProcessor.Engine.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for FHIR version compatibility lint checks
/// </summary>
public class LintVersionCompatibilityTests
{
    private readonly LintValidationService _lintService;

    public LintVersionCompatibilityTests()
    {
        var schemaService = TestHelper.CreateFhirSchemaService();
        _lintService = new LintValidationService(
            NullLogger<LintValidationService>.Instance,
            schemaService);
    }

    [Fact]
    public async Task R5Field_InR4Bundle_ReturnsError()
    {
        // Arrange - Use Encounter.actualPeriod which is R5-only
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Encounter"",
                        ""status"": ""finished"",
                        ""class"": {
                            ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                            ""code"": ""IMP""
                        },
                        ""actualPeriod"": {
                            ""start"": ""2023-01-01"",
                            ""end"": ""2023-01-02""
                        }
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var r5Issue = issues.FirstOrDefault(i => i.RuleId == "LINT_R5_FIELD_IN_R4");
        Assert.NotNull(r5Issue);
        Assert.Equal("Compatibility", r5Issue.Category);
        Assert.Equal("Error", r5Issue.Severity);
        Assert.Contains("actualPeriod", r5Issue.Message);
        Assert.Contains("R5", r5Issue.Message);
        Assert.Contains("period", r5Issue.Message.ToLower()); // Should suggest R4 alternative
    }

    [Fact]
    public async Task DeprecatedR4Field_InR5Bundle_ReturnsWarning()
    {
        // Arrange - Use Encounter.period which is deprecated in R5
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Encounter"",
                        ""status"": ""finished"",
                        ""class"": {
                            ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                            ""code"": ""IMP""
                        },
                        ""period"": {
                            ""start"": ""2023-01-01"",
                            ""end"": ""2023-01-02""
                        }
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R5");

        // Assert
        var deprecatedIssue = issues.FirstOrDefault(i => i.RuleId == "LINT_DEPRECATED_R4_FIELD");
        Assert.NotNull(deprecatedIssue);
        Assert.Equal("Compatibility", deprecatedIssue.Category);
        Assert.Equal("Warning", deprecatedIssue.Severity);
        Assert.Contains("period", deprecatedIssue.Message);
        Assert.Contains("deprecated", deprecatedIssue.Message.ToLower());
        Assert.Contains("actualPeriod", deprecatedIssue.Message); // Should suggest R5 replacement
    }

    [Fact]
    public async Task MultipleCompatibilityIssues_AllReturned()
    {
        // Arrange - Multiple R5-only fields in R4
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Encounter"",
                        ""status"": ""finished"",
                        ""class"": {
                            ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                            ""code"": ""IMP""
                        },
                        ""actualPeriod"": {
                            ""start"": ""2023-01-01""
                        }
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""status"": ""final"",
                        ""code"": {
                            ""coding"": [{
                                ""system"": ""http://loinc.org"",
                                ""code"": ""15074-8""
                            }]
                        },
                        ""triggeredBy"": [
                            {
                                ""observation"": {
                                    ""reference"": ""Observation/123""
                                }
                            }
                        ]
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var compatibilityIssues = issues.Where(i => i.RuleId == "LINT_R5_FIELD_IN_R4").ToList();
        Assert.True(compatibilityIssues.Count >= 2, $"Expected at least 2 compatibility issues, got {compatibilityIssues.Count}");
        
        // Check actualPeriod issue
        var actualPeriodIssue = compatibilityIssues.FirstOrDefault(i => i.Message.Contains("actualPeriod"));
        Assert.NotNull(actualPeriodIssue);
        
        // Check triggeredBy issue
        var triggeredByIssue = compatibilityIssues.FirstOrDefault(i => i.Message.Contains("triggeredBy"));
        Assert.NotNull(triggeredByIssue);
    }

    [Fact]
    public async Task R4Field_InR4Bundle_NoCompatibilityIssue()
    {
        // Arrange - Use Encounter.period which is valid in R4
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Encounter"",
                        ""status"": ""finished"",
                        ""class"": {
                            ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                            ""code"": ""IMP""
                        },
                        ""period"": {
                            ""start"": ""2023-01-01"",
                            ""end"": ""2023-01-02""
                        }
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var compatibilityIssues = issues.Where(i => 
            i.RuleId == "LINT_R5_FIELD_IN_R4" || 
            i.RuleId == "LINT_DEPRECATED_R4_FIELD").ToList();
        Assert.Empty(compatibilityIssues);
    }

    [Fact]
    public async Task CompatibilityIssue_IncludesDetails()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Encounter"",
                        ""status"": ""finished"",
                        ""class"": {
                            ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                            ""code"": ""IMP""
                        },
                        ""actualPeriod"": {
                            ""start"": ""2023-01-01""
                        }
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var r5Issue = issues.FirstOrDefault(i => i.RuleId == "LINT_R5_FIELD_IN_R4");
        Assert.NotNull(r5Issue);
        Assert.NotNull(r5Issue.Details);
        Assert.True(r5Issue.Details.ContainsKey("field"));
        Assert.Equal("actualPeriod", r5Issue.Details["field"]);
        Assert.True(r5Issue.Details.ContainsKey("fhirVersion"));
        Assert.Equal("R4", r5Issue.Details["fhirVersion"]);
        Assert.True(r5Issue.Details.ContainsKey("alternative"));
    }

    [Fact]
    public async Task CompatibilityCheck_HasDisclaimer()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Encounter"",
                        ""status"": ""finished"",
                        ""class"": {
                            ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                            ""code"": ""IMP""
                        },
                        ""actualPeriod"": {
                            ""start"": ""2023-01-01""
                        }
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var r5Issue = issues.FirstOrDefault(i => i.RuleId == "LINT_R5_FIELD_IN_R4");
        Assert.NotNull(r5Issue);
        Assert.NotNull(r5Issue.Disclaimer);
        Assert.Contains("best-effort", r5Issue.Disclaimer.ToLower());
        Assert.Contains("compatibility", r5Issue.Disclaimer.ToLower());
    }
}
