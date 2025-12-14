using Xunit;
using Pss.FhirProcessor.Engine.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for LintValidationService - best-effort structural validation layer.
/// These tests verify that lint catches multiple issues without fail-fast behavior.
/// </summary>
public class LintValidationServiceTests
{
    private readonly LintValidationService _lintService;

    public LintValidationServiceTests()
    {
        var schemaService = TestHelper.CreateFhirSchemaService();
        _lintService = new LintValidationService(
            NullLogger<LintValidationService>.Instance,
            schemaService);
    }

    [Fact]
    public async Task EmptyInput_ReturnsLintError()
    {
        // Arrange
        var emptyJson = "";

        // Act
        var issues = await _lintService.ValidateAsync(emptyJson, "R4");

        // Assert
        Assert.Single(issues);
        Assert.Equal("LINT_EMPTY_INPUT", issues[0].RuleId);
        Assert.Equal("Error", issues[0].Severity);
    }

    [Fact]
    public async Task InvalidJson_ReturnsLintError()
    {
        // Arrange
        var invalidJson = "{ invalid json }";

        // Act
        var issues = await _lintService.ValidateAsync(invalidJson, "R4");

        // Assert
        Assert.Single(issues);
        Assert.Equal("LINT_INVALID_JSON", issues[0].RuleId);
        Assert.Equal("Invalid JSON Syntax", issues[0].Title);
        Assert.Contains("Parse error", issues[0].Message);
    }

    [Fact]
    public async Task MissingResourceType_ReturnsLintError()
    {
        // Arrange
        var json = @"{ ""id"": ""test"" }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        Assert.Contains(issues, i => i.RuleId == "LINT_MISSING_RESOURCE_TYPE");
    }

    [Fact]
    public async Task BundleWithoutEntry_ReturnsNoError()
    {
        // Arrange - This is valid, bundle can exist without entries
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection""
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        // Should not report error for missing entry array (it's optional)
        Assert.DoesNotContain(issues, i => i.RuleId == "LINT_ENTRY_NOT_ARRAY");
    }

    [Fact]
    public async Task EntryIsNotArray_ReturnsLintError()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": { ""should"": ""be array"" }
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        Assert.Contains(issues, i => i.RuleId == "LINT_ENTRY_NOT_ARRAY");
    }

    [Fact]
    public async Task EntryWithoutResource_ReturnsLintError()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                { ""fullUrl"": ""urn:uuid:test"" }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        Assert.Contains(issues, i => i.RuleId == "LINT_ENTRY_MISSING_RESOURCE");
    }

    [Fact]
    public async Task ResourceWithoutResourceType_ReturnsLintError()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""id"": ""patient-1""
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        Assert.Contains(issues, i => i.RuleId == "LINT_RESOURCE_MISSING_TYPE");
    }

    [Fact]
    public async Task MultipleErrors_ReturnsAllErrors()
    {
        // Arrange - Bundle with multiple issues
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""id"": ""patient-1""
                    }
                },
                {
                    ""fullUrl"": ""urn:uuid:obs-1""
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - Should catch BOTH errors in one pass
        Assert.Contains(issues, i => i.RuleId == "LINT_RESOURCE_MISSING_TYPE");
        Assert.Contains(issues, i => i.RuleId == "LINT_ENTRY_MISSING_RESOURCE");
        Assert.True(issues.Count >= 2, "Should return multiple errors at once");
    }

    [Fact]
    public async Task InvalidDateFormat_ReturnsWarning()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""birthDate"": ""not-a-date""
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        Assert.Contains(issues, i => i.RuleId == "LINT_INVALID_DATE");
        var dateIssue = issues.First(i => i.RuleId == "LINT_INVALID_DATE");
        Assert.Equal("Warning", dateIssue.Severity);
        Assert.False(string.IsNullOrWhiteSpace(dateIssue.Disclaimer));
        Assert.Equal("Invalid Date Format", dateIssue.Title);
    }

    [Fact]
    public async Task BooleanAsString_ReturnsError()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""active"": ""true""
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        Assert.Contains(issues, i => i.RuleId == "LINT_BOOLEAN_AS_STRING");
    }

    [Fact]
    public async Task ArrayExpectedButObjectProvided_ReturnsError()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""identifier"": {
                            ""system"": ""http://example.org"",
                            ""value"": ""12345""
                        }
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        // identifier should be an array, not an object
        Assert.Contains(issues, i => i.RuleId == "LINT_EXPECTED_ARRAY" && i.JsonPointer.Contains("identifier"));
    }

    [Fact]
    public async Task ValidBundle_ReturnsNoErrors()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""fullUrl"": ""urn:uuid:patient-1"",
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""id"": ""patient-1"",
                        ""active"": true,
                        ""birthDate"": ""1990-01-15"",
                        ""name"": [
                            {
                                ""family"": ""Smith"",
                                ""given"": [""John""]
                            }
                        ]
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        Assert.Empty(issues);
    }

    [Fact]
    public async Task LintErrorsIncludeDisclaimer()
    {
        // Arrange
        var json = @"{ ""resourceType"": ""Bundle"", ""entry"": {} }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        Assert.All(issues, issue =>
        {
            Assert.NotNull(issue.Disclaimer);
            Assert.Contains("best-effort check", issue.Disclaimer);
            Assert.Contains("Final validation is performed by FHIR engine", issue.Disclaimer);
        });
    }

    [Fact]
    public async Task LintDoesNotThrow_EvenOnBadlyMalformedInput()
    {
        // Arrange
        var malformedJson = "{ {{{{ completely broken";

        // Act
        var issues = await _lintService.ValidateAsync(malformedJson, "R4");

        // Assert - Should return error as data, not throw
        Assert.NotEmpty(issues);
        Assert.Contains(issues, i => i.RuleId == "LINT_INVALID_JSON");
    }

    [Fact]
    public async Task LintIncludesJsonPointerPaths()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""id"": ""missing-type""
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var resourceTypeIssue = issues.First(i => i.RuleId == "LINT_RESOURCE_MISSING_TYPE");
        Assert.NotNull(resourceTypeIssue.JsonPointer);
        Assert.Contains("/entry/0/resource", resourceTypeIssue.JsonPointer);
    }
}
