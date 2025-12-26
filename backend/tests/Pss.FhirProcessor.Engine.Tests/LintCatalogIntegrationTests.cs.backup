using Xunit;
using Pss.FhirProcessor.Engine.Catalogs;
using Pss.FhirProcessor.Engine.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Integration tests verifying that LintRuleCatalog accurately reflects
/// all error codes used in LintValidationService.
/// </summary>
public class LintCatalogIntegrationTests
{
    private readonly LintValidationService _lintService;

    public LintCatalogIntegrationTests()
    {
        var schemaService = TestHelper.CreateFhirSchemaService();
        _lintService = new LintValidationService(
            NullLogger<LintValidationService>.Instance,
            schemaService);
    }

    [Fact]
    public async Task LintService_EmptyInput_UsesCodeFromCatalog()
    {
        // Arrange
        var catalogRule = LintRuleCatalog.EmptyInput;

        // Act
        var issues = await _lintService.ValidateAsync("", "R4");

        // Assert
        Assert.NotEmpty(issues);
        var issue = issues.First();
        Assert.Equal(catalogRule.Id, issue.RuleId);
    }

    [Fact]
    public async Task LintService_InvalidJson_UsesCodeFromCatalog()
    {
        // Arrange
        var catalogRule = LintRuleCatalog.InvalidJson;

        // Act
        var issues = await _lintService.ValidateAsync("{ invalid json }", "R4");

        // Assert
        Assert.NotEmpty(issues);
        var issue = issues.First();
        Assert.Equal(catalogRule.Id, issue.RuleId);
    }

    [Fact]
    public async Task LintService_MissingResourceType_UsesCodeFromCatalog()
    {
        // Arrange
        var catalogRule = LintRuleCatalog.MissingResourceType;
        var json = @"{
            ""type"": ""collection"",
            ""entry"": []
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var issue = issues.FirstOrDefault(i => i.RuleId == catalogRule.Id);
        Assert.NotNull(issue);
    }

    [Fact]
    public async Task LintService_SchemaArrayError_UsesCodeFromCatalog()
    {
        // Arrange
        var catalogRule = LintRuleCatalog.ExpectedArray;
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""name"": {
                            ""family"": ""Smith""
                        }
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var issue = issues.FirstOrDefault(i => i.RuleId == catalogRule.Id);
        Assert.NotNull(issue);
    }

    [Fact]
    public async Task LintService_InvalidDate_UsesCodeFromCatalog()
    {
        // Arrange
        var catalogRule = LintRuleCatalog.InvalidDate;
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""birthDate"": ""invalid-date""
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var issue = issues.FirstOrDefault(i => i.RuleId == catalogRule.Id);
        Assert.NotNull(issue);
    }

    [Fact]
    public async Task LintService_BooleanAsString_UsesCodeFromCatalog()
    {
        // Arrange
        var catalogRule = LintRuleCatalog.BooleanAsString;
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
        var issue = issues.FirstOrDefault(i => i.RuleId == catalogRule.Id);
        Assert.NotNull(issue);
    }

    [Fact]
    public void AllCatalogRules_HaveMatchingLintServiceCode()
    {
        // Arrange
        var catalogCodes = LintRuleCatalog.AllRules.Select(r => r.Id).ToHashSet();

        // Known codes used in LintValidationService
        var lintServiceCodes = new[]
        {
            "LINT_EMPTY_INPUT",
            "LINT_INVALID_JSON",
            "LINT_ROOT_NOT_OBJECT",
            "LINT_MISSING_RESOURCE_TYPE",
            "LINT_NOT_BUNDLE",
            "LINT_ENTRY_NOT_ARRAY",
            "LINT_ENTRY_NOT_OBJECT",
            "LINT_ENTRY_MISSING_RESOURCE",
            "LINT_RESOURCE_NOT_OBJECT",
            "LINT_RESOURCE_MISSING_TYPE",
            "LINT_RESOURCE_TYPE_NOT_STRING",
            "LINT_EXPECTED_ARRAY",
            "LINT_EXPECTED_OBJECT",
            "UNKNOWN_ELEMENT",
            "LINT_INVALID_DATE",
            "LINT_INVALID_DATETIME",
            "LINT_BOOLEAN_AS_STRING",
            "LINT_INTERNAL_ERROR",
            "LINT_R5_FIELD_IN_R4",
            "LINT_DEPRECATED_R4_FIELD"
        };

        // Assert - Bidirectional match
        foreach (var serviceCode in lintServiceCodes)
        {
            Assert.Contains(serviceCode, catalogCodes);
        }

        foreach (var catalogCode in catalogCodes)
        {
            Assert.Contains(catalogCode, lintServiceCodes);
        }
    }

    [Fact]
    public void CatalogMetadata_CanBeUsedToEnrichLintIssue()
    {
        // Arrange
        var ruleId = "LINT_INVALID_JSON";
        var rule = LintRuleCatalog.GetRuleById(ruleId);

        // Assert - Verify metadata is complete enough to use
        Assert.NotNull(rule);
        Assert.False(string.IsNullOrWhiteSpace(rule.Title));
        Assert.False(string.IsNullOrWhiteSpace(rule.Description));
        Assert.False(string.IsNullOrWhiteSpace(rule.Disclaimer));
        Assert.NotEmpty(rule.ApplicableFhirVersions);
        Assert.Contains("R4", rule.ApplicableFhirVersions);
    }
}
