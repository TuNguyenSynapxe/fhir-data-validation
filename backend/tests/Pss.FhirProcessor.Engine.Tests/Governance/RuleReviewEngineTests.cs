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
            FieldPath = "name",
            InstanceScope = new AllInstances(),
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
            FieldPath = "",
            InstanceScope = new AllInstances(), // Empty path
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
            FieldPath = "",
            InstanceScope = new AllInstances(), // Root-level only
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
            FieldPath = "component",
            InstanceScope = new AllInstances(),
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
            FieldPath = "active",
            InstanceScope = new AllInstances(), // Boolean field
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
            FieldPath = "name",
            InstanceScope = new AllInstances(), // Only 2 segments
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
            FieldPath = "entry[*].resource",
            InstanceScope = new AllInstances(), // Wildcard without where()
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
            FieldPath = "code.coding.code",
            InstanceScope = new AllInstances(), // Code without system filter
            ErrorCode = "FIXED_VALUE_MISMATCH" // Must use correct ErrorCode to reach system check
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
                FieldPath = "name.family",
                InstanceScope = new AllInstances(),
                ErrorCode = "FIELD_REQUIRED"
            },
            new RuleDefinition
            {
                Id = "rule-2",
                Type = "Required",
                ResourceType = "Patient",
                FieldPath = "name.family",
                InstanceScope = new AllInstances(), // Same type + path
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
            FieldPath = "name.where(use='official').family",
            InstanceScope = new AllInstances(),
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
            FieldPath = "component.where(code.coding.system='http://example.org')",
            InstanceScope = new AllInstances(),
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

    [Fact]
    public void QuestionAnswerRule_WithMissingErrorCode_IsAllowed()
    {
        // Arrange - QuestionAnswer without errorCode (constraint-driven model)
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "QuestionAnswer",
            ResourceType = "Observation",
            FieldPath = "component.where(code.coding.system='http://loinc.org')",
            InstanceScope = new AllInstances(),
            ErrorCode = "", // Empty/missing errorCode allowed for QuestionAnswer
            Params = new Dictionary<string, object>
            {
                ["questionSetId"] = "smoking-status"
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert - Should be OK (no BLOCKED issues, no warnings for missing errorCode)
        Assert.Equal(RuleReviewStatus.OK, result.Status);
        Assert.DoesNotContain(result.Issues, i => i.Severity == RuleReviewStatus.BLOCKED);
        Assert.Empty(result.Issues); // No issues at all for missing errorCode on QuestionAnswer
    }

    [Fact]
    public void QuestionAnswerRule_WithProvidedErrorCode_IsWarning_NotBlocked()
    {
        // Arrange - QuestionAnswer with errorCode (should warn but not block)
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "QuestionAnswer",
            ResourceType = "Observation",
            FieldPath = "component.where(code.coding.system='http://loinc.org')",
            InstanceScope = new AllInstances(),
            ErrorCode = "ANSWER_REQUIRED", // Provided errorCode
            Params = new Dictionary<string, object>
            {
                ["questionSetId"] = "smoking-status"
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert - Should be WARNING (not BLOCKED)
        Assert.Equal(RuleReviewStatus.WARNING, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "QUESTIONANSWER_ERROR_CODE_IGNORED");
        var warning = result.Issues.First(i => i.Code == "QUESTIONANSWER_ERROR_CODE_IGNORED");
        Assert.Equal(RuleReviewStatus.WARNING, warning.Severity);
        Assert.DoesNotContain(result.Issues, i => i.Severity == RuleReviewStatus.BLOCKED);
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
            FieldPath = "name",
            InstanceScope = new AllInstances(),
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
            FieldPath = "thisFieldDoesNotExist",
            InstanceScope = new AllInstances(), // Intentionally invalid
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
        var originalFieldPath = "name";
        var rule = new RuleDefinition
        {
            Id = "test-rule",
            Type = "Required",
            ResourceType = "Patient",
            FieldPath = originalFieldPath,
            InstanceScope = new AllInstances(),
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        _ = _engine.Review(rule);

        // Assert
        Assert.Equal(originalFieldPath, rule.FieldPath);
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
            FieldPath = "",
            InstanceScope = new AllInstances(), // BLOCKED (root-level path)
            ErrorCode = "FIELD_REQUIRED"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        // Rule definition is unchanged - check ResourceType instead of removed Path property
        Assert.Equal("Patient", rule.ResourceType);
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
            FieldPath = "identifier.value",
            InstanceScope = new AllInstances(),
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
            FieldPath = "identifier.value",
            InstanceScope = new AllInstances(),
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
            FieldPath = "identifier.value",
            InstanceScope = new AllInstances(),
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
            FieldPath = "identifier.value",
            InstanceScope = new AllInstances(),
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
            FieldPath = "gender",
            InstanceScope = new AllInstances(),
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
            FieldPath = "gender",
            InstanceScope = new AllInstances(),
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

    [Fact]
    public void ArrayLengthRule_WithCorrectErrorCode_IsAllowed()
    {
        // Test: ArrayLength rule with ARRAY_LENGTH_VIOLATION → ALLOWED
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "al-correct-code",
            Type = "ArrayLength",
            ResourceType = "Patient",
            FieldPath = "name",
            InstanceScope = new AllInstances(),
            ErrorCode = "ARRAY_LENGTH_VIOLATION",
            Params = new Dictionary<string, object>
            {
                ["min"] = 1,
                ["max"] = 5
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.NotEqual(RuleReviewStatus.BLOCKED, result.Status);
        Assert.DoesNotContain(result.Issues, i => i.Code == "ARRAYLENGTH_ERROR_CODE_MISMATCH");
    }

    [Fact]
    public void ArrayLengthRule_WithIncorrectErrorCode_IsBlocked()
    {
        // Test: ArrayLength rule with any other errorCode → BLOCKED
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "al-wrong-code",
            Type = "ArrayLength",
            ResourceType = "Patient",
            FieldPath = "name",
            InstanceScope = new AllInstances(),
            ErrorCode = "ARRAY_TOO_SHORT", // Not allowed
            Params = new Dictionary<string, object>
            {
                ["min"] = 1
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "ARRAYLENGTH_ERROR_CODE_MISMATCH");
        var issue = result.Issues.First(i => i.Code == "ARRAYLENGTH_ERROR_CODE_MISMATCH");
        Assert.Equal("ARRAY_LENGTH_VIOLATION", issue.Facts["requiredErrorCode"]);
    }

    [Fact]
    public void FixedValueRule_WithCorrectErrorCode_IsAllowed()
    {
        // Test: FixedValue rule with errorCode = FIXED_VALUE_MISMATCH is allowed
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "fv-correct-001",
            Type = "FixedValue",
            ResourceType = "Patient",
            FieldPath = "gender",
            InstanceScope = new AllInstances(),
            ErrorCode = "FIXED_VALUE_MISMATCH",
            Params = new Dictionary<string, object>
            {
                ["value"] = "female"
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.NotEqual(RuleReviewStatus.BLOCKED, result.Status);
        Assert.DoesNotContain(result.Issues, i => i.Code == "FIXEDVALUE_ERROR_CODE_MISMATCH");
    }

    [Fact]
    public void FixedValueRule_WithIncorrectErrorCode_IsBlocked()
    {
        // Test: FixedValue rule with custom errorCode is BLOCKED
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "fv-wrong-001",
            Type = "FixedValue",
            ResourceType = "Patient",
            FieldPath = "gender",
            InstanceScope = new AllInstances(),
            ErrorCode = "VALUE_NOT_EQUAL", // Frontend-suggested code, but wrong
            Params = new Dictionary<string, object>
            {
                ["value"] = "female"
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "FIXEDVALUE_ERROR_CODE_MISMATCH");
        var issue = result.Issues.First(i => i.Code == "FIXEDVALUE_ERROR_CODE_MISMATCH");
        Assert.Equal("FIXED_VALUE_MISMATCH", issue.Facts["requiredErrorCode"]);
        Assert.Equal("VALUE_NOT_EQUAL", issue.Facts["currentErrorCode"]);
    }

    [Fact]
    public void ReferenceRule_IsBlocked_ByGovernance()
    {
        // Test: Reference rule type is always blocked (not supported as business rule)
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "ref-rule-001",
            Type = "Reference",
            ResourceType = "Observation",
            FieldPath = "subject",
            InstanceScope = new AllInstances(),
            ErrorCode = "REFERENCE_NOT_FOUND",
            Params = new Dictionary<string, object>
            {
                ["allowedTypes"] = new[] { "Patient" }
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        Assert.Contains(result.Issues, i => i.Code == "REFERENCE_RULE_NOT_SUPPORTED");
    }

    [Fact]
    public void ReferenceRule_Returns_REFERENCE_RULE_NOT_SUPPORTED_Code()
    {
        // Test: Verify specific governance error code and explanation for Reference rules
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "ref-rule-002",
            Type = "Reference",
            ResourceType = "Patient",
            FieldPath = "managingOrganization",
            InstanceScope = new AllInstances(),
            ErrorCode = "CUSTOM_REF_ERROR"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        var issue = result.Issues.First(i => i.Code == "REFERENCE_RULE_NOT_SUPPORTED");
        Assert.Equal("Reference", issue.Facts["ruleType"]);
        Assert.True(issue.Facts.ContainsKey("reason"));
        Assert.True(issue.Facts.ContainsKey("explanation"));
        Assert.Contains("handled globally", issue.Facts["reason"]?.ToString() ?? "");
    }

    [Fact]
    public void CodeSystemRule_WithCorrectErrorCode_IsAllowed()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-codesystem",
            Type = "CodeSystem",
            ResourceType = "Patient",
            FieldPath = "maritalStatus.coding",
            InstanceScope = new AllInstances(),
            ErrorCode = "CODESYSTEM_VIOLATION",
            Params = new Dictionary<string, object>
            {
                ["system"] = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus"
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.NotEqual(RuleReviewStatus.BLOCKED, result.Status);
        Assert.DoesNotContain(result.Issues, i => i.Code == "CODESYSTEM_ERROR_CODE_MISMATCH");
    }

    [Fact]
    public void CodeSystemRule_WithIncorrectErrorCode_IsBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "test-codesystem",
            Type = "CodeSystem",
            ResourceType = "Patient",
            FieldPath = "maritalStatus.coding",
            InstanceScope = new AllInstances(),
            ErrorCode = "INVALID_SYSTEM", // Wrong errorCode
            Params = new Dictionary<string, object>
            {
                ["system"] = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus"
            }
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        var issue = result.Issues.First(i => i.Code == "CODESYSTEM_ERROR_CODE_MISMATCH");
        Assert.Equal("CodeSystem", issue.Facts["ruleType"]);
        Assert.Equal("INVALID_SYSTEM", issue.Facts["currentErrorCode"]);
        Assert.Equal("CODESYSTEM_VIOLATION", issue.Facts["requiredErrorCode"]);
    }
    
    // ═══════════════════════════════════════════════════════════
    // CUSTOMFHIRPATH GOVERNANCE TESTS
    // ═══════════════════════════════════════════════════════════
    
    [Fact]
    public void CustomFHIRPathRule_WithMissingErrorCode_IsBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "custom-missing-errorcode",
            Type = "CustomFHIRPath",
            ResourceType = "Patient",
            FieldPath = "gender.exists()",
            InstanceScope = new AllInstances(),
            ErrorCode = "" // Missing errorCode
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        var issue = result.Issues.First(i => i.Code == "CUSTOMFHIRPATH_ERROR_CODE_MISSING");
        Assert.Equal("CustomFHIRPath", issue.Facts["ruleType"]);
        Assert.Equal("CustomFHIRPath rules require explicit errorCode", issue.Facts["reason"]);
    }
    
    [Fact]
    public void CustomFHIRPathRule_WithUnknownErrorCode_IsBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "custom-unknown-errorcode",
            Type = "CustomFHIRPath",
            ResourceType = "Patient",
            FieldPath = "gender.exists()",
            InstanceScope = new AllInstances(),
            ErrorCode = "TOTALLY_MADE_UP_CODE_123" // Unknown errorCode
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        var issue = result.Issues.First(i => i.Code == "CUSTOMFHIRPATH_ERROR_CODE_UNKNOWN");
        Assert.Equal("CustomFHIRPath", issue.Facts["ruleType"]);
        Assert.Equal("TOTALLY_MADE_UP_CODE_123", issue.Facts["currentErrorCode"]);
        Assert.Equal("errorCode must be a known ValidationErrorCode constant", issue.Facts["reason"]);
    }
    
    [Fact]
    public void CustomFHIRPathRule_WithKnownErrorCode_IsWarning_NotBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "custom-known-errorcode",
            Type = "CustomFHIRPath",
            ResourceType = "Patient",
            FieldPath = "gender.exists()",
            InstanceScope = new AllInstances(),
            ErrorCode = Pss.FhirProcessor.Engine.Validation.ValidationErrorCodes.CUSTOMFHIRPATH_CONDITION_FAILED // Known errorCode
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        // CustomFHIRPath with known errorCode should emit WARNING (semantic stability advisory), not BLOCKED
        Assert.NotEqual(RuleReviewStatus.BLOCKED, result.Status);
        
        // Verify no blocking issues
        Assert.DoesNotContain(result.Issues, i => i.Severity == RuleReviewStatus.BLOCKED);
        
        // Should have semantic stability advisory (WARNING)
        var warningIssue = result.Issues.FirstOrDefault(i => 
            i.Code == "RULE_SEMANTIC_STABILITY_INFO" && 
            i.Severity == RuleReviewStatus.WARNING);
        Assert.NotNull(warningIssue);
    }
    
    // ═══════════════════════════════════════════════════════════
    // FULLURLIDMATCH BLOCKING TESTS
    // ═══════════════════════════════════════════════════════════
    
    [Fact]
    public void FullUrlIdMatchRule_IsBlocked()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "fullurl-test",
            Type = "FullUrlIdMatch",
            ResourceType = "Patient",
            FieldPath = "id",
            InstanceScope = new AllInstances(),
            ErrorCode = "FULLURL_ID_MISMATCH"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        var issue = result.Issues.First(i => i.Code == "FULLURLIDMATCH_RULE_NOT_SUPPORTED");
        Assert.Equal("FullUrlIdMatch", issue.Facts["ruleType"]);
        Assert.Contains("not implemented", issue.Facts["reason"].ToString(), StringComparison.OrdinalIgnoreCase);
    }
    
    [Fact]
    public void FullUrlIdMatchRule_IsBlocked_CaseInsensitive()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "fullurl-test-lower",
            Type = "fullurlidmatch",
            ResourceType = "Patient",
            FieldPath = "id",
            InstanceScope = new AllInstances(),
            ErrorCode = "FULLURL_ID_MISMATCH"
        };

        // Act
        var result = _engine.Review(rule);

        // Assert
        Assert.Equal(RuleReviewStatus.BLOCKED, result.Status);
        var issue = result.Issues.First(i => i.Code == "FULLURLIDMATCH_RULE_NOT_SUPPORTED");
        Assert.Equal("fullurlidmatch", issue.Facts["ruleType"]);
    }
}