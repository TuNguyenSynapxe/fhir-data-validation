using Xunit;
using Pss.FhirProcessor.Engine.Catalogs;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Authoring;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for LintRuleCatalog to verify metadata completeness and consistency.
/// </summary>
public class LintRuleCatalogTests
{
    [Fact]
    public void AllRules_ShouldHaveUniqueIds()
    {
        // Arrange & Act
        var ruleIds = LintRuleCatalog.AllRules.Select(r => r.Id).ToList();
        var duplicates = ruleIds.GroupBy(id => id)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        // Assert
        Assert.Empty(duplicates);
    }

    [Fact]
    public void AllRules_ShouldHaveRequiredMetadata()
    {
        // Act & Assert
        foreach (var rule in LintRuleCatalog.AllRules)
        {
            Assert.False(string.IsNullOrWhiteSpace(rule.Id), $"Rule is missing Id");
            Assert.False(string.IsNullOrWhiteSpace(rule.Title), $"Rule {rule.Id} is missing Title");
            Assert.False(string.IsNullOrWhiteSpace(rule.Description), $"Rule {rule.Id} is missing Description");
            Assert.False(string.IsNullOrWhiteSpace(rule.Severity), $"Rule {rule.Id} is missing Severity");
            Assert.False(string.IsNullOrWhiteSpace(rule.Confidence), $"Rule {rule.Id} is missing Confidence");
            Assert.False(string.IsNullOrWhiteSpace(rule.Disclaimer), $"Rule {rule.Id} is missing Disclaimer");
            Assert.NotEmpty(rule.ApplicableFhirVersions);
        }
    }

    [Fact]
    public void AllRules_ShouldHaveValidSeverity()
    {
        // Arrange
        var validSeverities = new[] { "Error", "Warning", "Info" };

        // Act & Assert
        foreach (var rule in LintRuleCatalog.AllRules)
        {
            Assert.Contains(rule.Severity, validSeverities);
        }
    }

    [Fact]
    public void AllRules_ShouldHaveValidConfidence()
    {
        // Arrange
        var validConfidenceLevels = new[] { "High", "Medium", "Low" };

        // Act & Assert
        foreach (var rule in LintRuleCatalog.AllRules)
        {
            Assert.Contains(rule.Confidence, validConfidenceLevels);
        }
    }

    [Fact]
    public void GetRuleById_ShouldReturnCorrectRule()
    {
        // Act
        var rule = LintRuleCatalog.GetRuleById("LINT_INVALID_JSON");

        // Assert
        Assert.NotNull(rule);
        Assert.Equal("LINT_INVALID_JSON", rule.Id);
        Assert.Equal(LintRuleCategory.Json, rule.Category);
    }

    [Fact]
    public void GetRuleById_WithInvalidId_ShouldReturnNull()
    {
        // Act
        var rule = LintRuleCatalog.GetRuleById("INVALID_RULE_ID");

        // Assert
        Assert.Null(rule);
    }

    [Fact]
    public void GetRulesForVersion_R4_ShouldReturnAllRules()
    {
        // Act
        var r4Rules = LintRuleCatalog.GetRulesForVersion("R4").ToList();

        // Assert
        Assert.NotEmpty(r4Rules);
        Assert.All(r4Rules, rule => Assert.Contains("R4", rule.ApplicableFhirVersions));
    }

    [Fact]
    public void GetRulesByCategory_Json_ShouldReturnJsonRules()
    {
        // Act
        var jsonRules = LintRuleCatalog.GetRulesByCategory(LintRuleCategory.Json).ToList();

        // Assert
        Assert.NotEmpty(jsonRules);
        Assert.All(jsonRules, rule => Assert.Equal(LintRuleCategory.Json, rule.Category));
        Assert.Contains(jsonRules, r => r.Id == "LINT_INVALID_JSON");
        Assert.Contains(jsonRules, r => r.Id == "LINT_EMPTY_INPUT");
    }

    [Fact]
    public void GetRulesByCategory_SchemaShape_ShouldReturnSchemaRules()
    {
        // Act
        var schemaRules = LintRuleCatalog.GetRulesByCategory(LintRuleCategory.SchemaShape).ToList();

        // Assert
        Assert.NotEmpty(schemaRules);
        Assert.Contains(schemaRules, r => r.Id == "LINT_EXPECTED_ARRAY");
        Assert.Contains(schemaRules, r => r.Id == "LINT_EXPECTED_OBJECT");
    }

    [Fact]
    public void AllRules_ShouldCoverAllExistingLintCodes()
    {
        // Arrange - List of all error codes currently used in LintValidationService
        var expectedCodes = new[]
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
            "LINT_INVALID_DATE",
            "LINT_INVALID_DATETIME",
            "LINT_BOOLEAN_AS_STRING",
            "LINT_INTERNAL_ERROR",
            "LINT_R5_FIELD_IN_R4",
            "LINT_DEPRECATED_R4_FIELD",
            "UNKNOWN_ELEMENT"
        };

        // Act
        var catalogCodes = LintRuleCatalog.AllRules.Select(r => r.Id).ToList();

        // Assert - Every expected code should be in catalog (advisory LINT codes only)
        foreach (var expectedCode in expectedCodes)
        {
            Assert.Contains(expectedCode, catalogCodes);
        }
        
        // Note: Catalog may have additional codes (e.g., for documentation) - we only verify expected codes exist
    }

    [Fact]
    public void SchemaShapeRules_ShouldHaveSchemaDisclaimer()
    {
        // Act
        var schemaRules = LintRuleCatalog.GetRulesByCategory(LintRuleCategory.SchemaShape).ToList();

        // Assert - Schema rules should reference schema or FHIR spec
        Assert.All(schemaRules, rule =>
        {
            var hasSchemaRef = rule.Disclaimer.Contains("schema", StringComparison.OrdinalIgnoreCase) ||
                              rule.Disclaimer.Contains("FHIR", StringComparison.OrdinalIgnoreCase);
            Assert.True(hasSchemaRef, $"Rule {rule.Id} should reference schema or FHIR in disclaimer");
        });
    }

    [Fact]
    public void PrimitiveRules_ShouldHaveMediumOrHighConfidence()
    {
        // Act
        var primitiveRules = LintRuleCatalog.GetRulesByCategory(LintRuleCategory.Primitive).ToList();

        // Assert
        Assert.All(primitiveRules, rule =>
        {
            Assert.True(rule.Confidence == "Medium" || rule.Confidence == "High",
                $"Primitive rule {rule.Id} should have medium or high confidence");
        });
    }

    [Fact]
    public void StructureRules_ShouldHaveHighConfidence()
    {
        // Act
        var structureRules = LintRuleCatalog.GetRulesByCategory(LintRuleCategory.Structure).ToList();

        // Assert
        Assert.All(structureRules, rule =>
        {
            Assert.Equal("High", rule.Confidence);
        });
    }

    [Fact]
    public void JsonRules_ShouldHaveErrorSeverity()
    {
        // Act
        var jsonRules = LintRuleCatalog.GetRulesByCategory(LintRuleCategory.Json).ToList();

        // Assert
        Assert.All(jsonRules, rule =>
        {
            Assert.Equal("Error", rule.Severity);
        });
    }

    [Fact]
    public void DateTimeRules_ShouldHaveWarningSeverity()
    {
        // Act
        var dateRule = LintRuleCatalog.GetRuleById("LINT_INVALID_DATE");
        var dateTimeRule = LintRuleCatalog.GetRuleById("LINT_INVALID_DATETIME");

        // Assert
        Assert.NotNull(dateRule);
        Assert.NotNull(dateTimeRule);
        Assert.Equal("Warning", dateRule.Severity);
        Assert.Equal("Warning", dateTimeRule.Severity);
    }
}
