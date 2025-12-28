using Pss.FhirProcessor.Engine.Governance;
using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Governance;

/// <summary>
/// Phase 7 Governance Tests
/// Ensures rule review engine enforces quality without affecting runtime validation
/// </summary>
public class RuleReviewEngineTests
{
    private readonly RuleReviewEngine _engine;

    public RuleReviewEngineTests()
    {
        _engine = new RuleReviewEngine();
    }

    // ═══════════════════════════════════════════════════════════
    // BLOCKED CHECKS
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void MissingErrorCode_IsBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            Path = "Patient.name",
            ErrorCode = "" // Empty errorCode
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "MISSING_ERROR_CODE");
    }

    [Fact]
    public void EmptyPath_IsBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            Path = "", // Empty path
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "EMPTY_PATH");
    }

    [Fact]
    public void RootLevelPath_IsBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            Path = "Patient", // Root-level only
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "ROOT_LEVEL_PATH");
    }

    [Fact]
    public void QuestionAnswerWithoutQuestionSetId_IsBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "QuestionAnswer",
            ResourceType = "Observation",
            Path = "Observation.component",
            ErrorCode = "INVALID_ANSWER",
            Params = new Dictionary<string, object>() // No questionSetId
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "QUESTION_ANSWER_WITHOUT_QUESTION_SET_ID");
    }

    [Fact]
    public void PatternOnNonStringField_IsBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Regex",
            ResourceType = "Patient",
            Path = "Patient.active", // Boolean field
            ErrorCode = "PATTERN_MISMATCH"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "PATTERN_ON_NON_STRING");
    }

    // ═══════════════════════════════════════════════════════════
    // WARNING CHECKS
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void BroadPath_IsWarning()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            Path = "Patient.name", // Only 2 segments
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.WARNING, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "BROAD_PATH");
    }

    [Fact]
    public void GenericWildcard_IsWarning()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Bundle",
            Path = "Bundle.entry[*].resource", // Wildcard without where()
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.WARNING, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "GENERIC_WILDCARD");
    }

    [Fact]
    public void FixedValueOnCodeWithoutSystem_IsWarning()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "FixedValue",
            ResourceType = "Observation",
            Path = "Observation.code.coding.code", // Code without system filter
            ErrorCode = "VALUE_NOT_EQUAL"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.WARNING, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "FIXED_VALUE_WITHOUT_SYSTEM");
    }

    [Fact]
    public void DuplicateRules_AreWarnings()
    {
        // Arrange
        var rules = new[]
        {
            new RuleDefinition
            {
                Id = "rule-1",
                Type = "Required",
                ResourceType = "Patient",
                Path = "Patient.name.family",
                ErrorCode = "FIELD_REQUIRED"
            },
            new RuleDefinition
            {
                Id = "rule-2",
                Type = "Required",
                ResourceType = "Patient",
                Path = "Patient.name.family", // Same type + path
                ErrorCode = "FIELD_REQUIRED"
            }
        };

        // Act
        var results = _engine.ReviewRuleSet(rules);

        // Assert
        var duplicateResult = results.First(r => r.RuleId == "rule-2");
        Assert.Equal(RuleReviewStatus.WARNING, duplicateResult.Status);
        Assert.Contains(duplicateResult.Issues, i => i.Code == "DUPLICATE_RULE");
    }

    // ═══════════════════════════════════════════════════════════
    // OK CHECKS
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void ValidRule_IsOK()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            Path = "Patient.name.where(use='official').family",
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.OK, result.Status);
        Assert.Empty(result.Issues);
    }

    [Fact]
    public void QuestionAnswerWithQuestionSetId_IsOK()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "QuestionAnswer",
            ResourceType = "Observation",
            Path = "Observation.component.where(code.coding.system='http://example.org')",
            ErrorCode = "INVALID_ANSWER",
            Params = new Dictionary<string, object>
            {
                ["questionSetId"] = "smoking-status"
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.OK, result.Status);
        Assert.Empty(result.Issues);
    }

    // ═══════════════════════════════════════════════════════════
    // DETERMINISM & NO RUNTIME CHANGES
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void SameRule_AlwaysProducesSameResult()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            Path = "Patient.name",
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        var result1 = _engine.Review(rule);
        var result2 = _engine.Review(rule);

        // Assert
        Assert.Equal(result1.Status, result2.Status);
        Assert.Equal(result1.Issues.Count, result2.Issues.Count);
    }

    [Fact]
    public void ReviewEngine_DoesNotAccessRuntimeData()
    {
        // This test ensures review engine only looks at rule metadata
        // No FHIR bundle, no validation execution, no sample data

        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            Path = "Patient.thisFieldDoesNotExist", // Intentionally invalid
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        // Review should complete without errors (it doesn't validate against FHIR schema)
        // This proves it's NOT accessing runtime data or FHIR model
        Assert.NotNull(result);
        // The invalid path might trigger warnings, but should NOT throw
    }

    [Fact]
    public void ReviewEngine_DoesNotMutateRule()
    {
        // Arrange
        var originalPath = "Patient.name";
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            Path = originalPath,
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        _ = _engine.Review(rule);

        // Assert
        Assert.Equal(originalPath, rule.Path);
        Assert.Equal("test-rule", rule.Id);
        Assert.Equal("Required", rule.Type);
    }

    [Fact]
    public void BlockedRule_DoesNotAffectValidationBehavior()
    {
        // Phase 7 governance does NOT change runtime validation
        // BLOCKED rules should still validate if executed (they just can't be saved)
        
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            Path = "Patient", // BLOCKED (root-level path)
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        // Rule definition is unchanged
        Assert.Equal("Patient", rule.Path);
        // If this rule were passed to validation pipeline, it would still execute
        // (governance is orthogonal to validation)
    }

    // ═══════════════════════════════════════════════════════════
    // PATTERN RULE ERRORCODE HARDENING TESTS
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void PatternRule_WithCorrectErrorCode_IsAllowed()
    {
        // Test: Pattern rule with PATTERN_MISMATCH → ALLOWED
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "pattern-correct",
            Type = "Pattern",
            ResourceType = "Patient",
            Path = "Patient.identifier.value",
            ErrorCode = "PATTERN_MISMATCH"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        // Should not be BLOCKED (may have warnings, but not blocked for errorCode)
        Assert.NotEqual(RuleReviewStatus.BLOCKED, result.Status);
        Assert.DoesNotContain(result.Issues, i => i.Code == "PATTERN_ERROR_CODE_MISMATCH");
    }

    [Fact]
    public void PatternRule_WithIncorrectErrorCode_IsBlocked()
    {
        // Test: Pattern rule with any other errorCode → BLOCKED
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "pattern-wrong-code",
            Type = "Pattern",
            ResourceType = "Patient",
            Path = "Patient.identifier.value",
            ErrorCode = "INVALID_FORMAT" // Not allowed
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "PATTERN_ERROR_CODE_MISMATCH");
    }

    [Fact]
    public void RegexRule_WithCorrectErrorCode_IsAllowed()
    {
        // Test: Regex rule with PATTERN_MISMATCH → ALLOWED
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "regex-correct",
            Type = "Regex",
            ResourceType = "Patient",
            Path = "Patient.identifier.value",
            ErrorCode = "PATTERN_MISMATCH"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.NotEqual(RuleReviewStatus.BLOCKED, result.Status);
        Assert.DoesNotContain(result.Issues, i => i.Code == "PATTERN_ERROR_CODE_MISMATCH");
    }

    [Fact]
    public void RegexRule_WithIncorrectErrorCode_IsBlocked()
    {
        // Test: Regex rule with any other errorCode → BLOCKED
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "regex-wrong-code",
            Type = "Regex",
            ResourceType = "Patient",
            Path = "Patient.identifier.value",
            ErrorCode = "REGEX_NO_MATCH" // Not allowed
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "PATTERN_ERROR_CODE_MISMATCH");
        var issue = result.Issues.First(i => i.Code == "PATTERN_ERROR_CODE_MISMATCH");
        Assert.Equal("PATTERN_MISMATCH", issue.Facts["requiredErrorCode"]);
    }

    [Fact]
    public void AllowedValuesRule_WithCorrectErrorCode_IsAllowed()
    {
        // Test: AllowedValues rule with VALUE_NOT_ALLOWED → ALLOWED
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "av-correct-code",
            Type = "AllowedValues",
            ResourceType = "Patient",
            Path = "Patient.gender",
            ErrorCode = "VALUE_NOT_ALLOWED",
            Params = new Dictionary<string, object>
            {
                ["values"] = new List<string> { "male", "female", "other" }
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.NotEqual(RuleReviewStatus.BLOCKED, result.Status);
        Assert.DoesNotContain(result.Issues, i => i.Code == "ALLOWEDVALUES_ERROR_CODE_MISMATCH");
    }

    [Fact]
    public void AllowedValuesRule_WithIncorrectErrorCode_IsBlocked()
    {
        // Test: AllowedValues rule with any other errorCode → BLOCKED
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "av-wrong-code",
            Type = "AllowedValues",
            ResourceType = "Patient",
            Path = "Patient.gender",
            ErrorCode = "ENUM_VIOLATION", // Not allowed
            Params = new Dictionary<string, object>
            {
                ["values"] = new List<string> { "male", "female", "other" }
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "ALLOWEDVALUES_ERROR_CODE_MISMATCH");
        var issue = result.Issues.First(i => i.Code == "ALLOWEDVALUES_ERROR_CODE_MISMATCH");
        Assert.Equal("VALUE_NOT_ALLOWED", issue.Facts["requiredErrorCode"]);
    }
}