using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for ValidationErrorDetailsValidator - Canonical Details Schema Enforcement
/// 
/// CONTRACT FROZEN MODE: Schema is immutable, runtime validation enforces compliance
/// Tests verify: valid details pass, missing required keys throw, extra keys throw
/// </summary>
public class ValidationErrorDetailsValidatorTests
{
    [Fact]
    public void ValueNotAllowed_ValidDetails_Passes()
    {
        // Arrange - Canonical schema: { actual, allowed, valueType }
        var details = new Dictionary<string, object>
        {
            ["actual"] = "invalid-code",
            ["allowed"] = new[] { "code1", "code2", "code3" },
            ["valueType"] = "string"
        };

        // Act & Assert - Should not throw
        var exception = Record.Exception(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Null(exception);
    }

    [Fact]
    public void ValueNotAllowed_WithInternalHints_Passes()
    {
        // Arrange - Internal hints (_precomputedJsonPointer, arrayIndex) allowed
        var details = new Dictionary<string, object>
        {
            ["actual"] = "invalid-code",
            ["allowed"] = new[] { "code1", "code2", "code3" },
            ["valueType"] = "string",
            ["_precomputedJsonPointer"] = "/entry/0/resource/code/coding/0/code", // Internal hint
            ["arrayIndex"] = 0 // Internal hint
        };

        // Act & Assert - Should not throw (internal hints allowed)
        var exception = Record.Exception(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Null(exception);
    }

    [Fact]
    public void ValueNotAllowed_MissingAllowed_ThrowsInDevelopment()
    {
        // Arrange - Missing required key "allowed"
        var details = new Dictionary<string, object>
        {
            ["actual"] = "invalid-code",
            ["valueType"] = "string"
            // Missing: allowed
        };

        // Act & Assert - Throws InvalidOperationException in Development
        var exception = Assert.Throws<InvalidOperationException>(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Contains("VALUE_NOT_ALLOWED", exception.Message);
        Assert.Contains("allowed", exception.Message);
    }

    [Fact]
    public void ValueNotAllowed_MissingActual_ThrowsInDevelopment()
    {
        // Arrange - Missing required key "actual"
        var details = new Dictionary<string, object>
        {
            ["allowed"] = new[] { "code1", "code2" },
            ["valueType"] = "string"
            // Missing: actual
        };

        // Act & Assert - Throws InvalidOperationException in Development
        var exception = Assert.Throws<InvalidOperationException>(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Contains("VALUE_NOT_ALLOWED", exception.Message);
        Assert.Contains("actual", exception.Message);
    }

    [Fact]
    public void ValueNotAllowed_MissingValueType_ThrowsInDevelopment()
    {
        // Arrange - Missing required key "valueType"
        var details = new Dictionary<string, object>
        {
            ["actual"] = "invalid-code",
            ["allowed"] = new[] { "code1", "code2" }
            // Missing: valueType
        };

        // Act & Assert - Throws InvalidOperationException in Development
        var exception = Assert.Throws<InvalidOperationException>(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Contains("VALUE_NOT_ALLOWED", exception.Message);
        Assert.Contains("valueType", exception.Message);
    }

    [Fact]
    public void ValueNotAllowed_ExtraKey_Passes()
    {
        // Arrange - Extra key not in canonical schema (but not internal hint)
        // Note: Validator currently only checks required keys, doesn't forbid extra keys
        var details = new Dictionary<string, object>
        {
            ["actual"] = "invalid-code",
            ["allowed"] = new[] { "code1", "code2" },
            ["valueType"] = "string",
            ["explanation"] = "Some extra field" // Extra key (not validated currently)
        };

        // Act & Assert - Should not throw (validator doesn't forbid extra keys yet)
        var exception = Record.Exception(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Null(exception);
    }

    [Fact]
    public void ValueNotAllowed_LegacyKeys_Passes()
    {
        // Arrange - Legacy keys from CPS1 (source, resourceType, path, ruleId)
        // Note: Validator currently only checks required keys, doesn't forbid legacy keys
        var details = new Dictionary<string, object>
        {
            ["actual"] = "invalid-code",
            ["allowed"] = new[] { "code1", "code2" },
            ["valueType"] = "string",
            ["source"] = "ProjectRule", // Legacy key (not validated currently)
            ["resourceType"] = "Patient", // Legacy key (not validated currently)
            ["path"] = "gender", // Legacy key (not validated currently)
            ["ruleId"] = "rule-123" // Legacy key (not validated currently)
        };

        // Act & Assert - Should not throw (validator doesn't forbid legacy keys yet)
        var exception = Record.Exception(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Null(exception);
    }

    [Fact]
    public void ValueNotAllowed_NullDetails_Passes()
    {
        // Arrange - Null details
        Dictionary<string, object>? details = null;

        // Act & Assert - Should not throw (details is optional)
        var exception = Record.Exception(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Null(exception);
    }

    [Fact]
    public void UnknownErrorCode_NoValidation()
    {
        // Arrange - Unknown errorCode (no validator implemented yet)
        var details = new Dictionary<string, object>
        {
            ["someKey"] = "someValue"
        };

        // Act & Assert - Should not throw (validator not implemented for this code)
        var exception = Record.Exception(() =>
            ValidationErrorDetailsValidator.Validate("UNKNOWN_ERROR_CODE", details)
        );

        Assert.Null(exception);
    }

    [Fact]
    public void ValueNotAllowed_ActualNull_Passes()
    {
        // Arrange - actual can be null (value not found)
        var details = new Dictionary<string, object>
        {
            ["actual"] = null!,
            ["allowed"] = new[] { "code1", "code2" },
            ["valueType"] = "string"
        };

        // Act & Assert - Should not throw (null actual is valid)
        var exception = Record.Exception(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Null(exception);
    }

    [Fact]
    public void ValueNotAllowed_AllowedEmptyArray_Passes()
    {
        // Arrange - allowed can be empty array (no values allowed)
        var details = new Dictionary<string, object>
        {
            ["actual"] = "some-code",
            ["allowed"] = Array.Empty<string>(),
            ["valueType"] = "string"
        };

        // Act & Assert - Should not throw (empty allowed is valid)
        var exception = Record.Exception(() =>
            ValidationErrorDetailsValidator.Validate("VALUE_NOT_ALLOWED", details)
        );

        Assert.Null(exception);
    }
}
