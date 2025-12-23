using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

/// <summary>
/// Generates structured validation errors for Question/Answer validation
/// </summary>
public class QuestionAnswerErrorFactory
{
    /// <summary>
    /// Create error for missing required answer
    /// </summary>
    public static RuleValidationError RequiredMissing(QuestionAnswerContext context)
    {
        return new RuleValidationError
        {
            RuleId = context.Rule.Id,
            RuleType = "QuestionAnswer",
            Severity = context.Rule.Severity,
            ResourceType = context.Rule.ResourceType,
            Path = context.CurrentPath,
            ErrorCode = "REQUIRED_MISSING",
            Message = $"Required question '{context.QuestionCoding?.Code}' has no answer",
            EntryIndex = context.EntryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "QuestionAnswer",
                ["questionCode"] = context.QuestionCoding?.Code ?? "unknown",
                ["questionSystem"] = context.QuestionCoding?.System ?? "",
                ["isRequired"] = context.IsRequired
            }
        };
    }

    /// <summary>
    /// Create error for invalid answer type
    /// </summary>
    public static RuleValidationError InvalidType(QuestionAnswerContext context, string expectedType, string actualType)
    {
        return new RuleValidationError
        {
            RuleId = context.Rule.Id,
            RuleType = "QuestionAnswer",
            Severity = context.Rule.Severity,
            ResourceType = context.Rule.ResourceType,
            Path = context.CurrentPath,
            ErrorCode = "INVALID_TYPE",
            Message = $"Question '{context.QuestionCoding?.Code}' expects {expectedType} but got {actualType}",
            EntryIndex = context.EntryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "QuestionAnswer",
                ["questionCode"] = context.QuestionCoding?.Code ?? "unknown",
                ["expectedType"] = expectedType,
                ["actualType"] = actualType
            }
        };
    }

    /// <summary>
    /// Create error for value out of range
    /// </summary>
    public static RuleValidationError ValueOutOfRange(QuestionAnswerContext context, decimal? min, decimal? max, decimal actual)
    {
        var rangeText = (min.HasValue, max.HasValue) switch
        {
            (true, true) => $"{min} to {max}",
            (true, false) => $"at least {min}",
            (false, true) => $"at most {max}",
            _ => "valid range"
        };

        return new RuleValidationError
        {
            RuleId = context.Rule.Id,
            RuleType = "QuestionAnswer",
            Severity = context.Rule.Severity,
            ResourceType = context.Rule.ResourceType,
            Path = context.CurrentPath,
            ErrorCode = "VALUE_OUT_OF_RANGE",
            Message = $"Question '{context.QuestionCoding?.Code}' value {actual} is outside {rangeText}",
            EntryIndex = context.EntryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "QuestionAnswer",
                ["questionCode"] = context.QuestionCoding?.Code ?? "unknown",
                ["value"] = actual,
                ["min"] = min ?? (object)"none",
                ["max"] = max ?? (object)"none"
            }
        };
    }

    /// <summary>
    /// Create error for invalid code
    /// </summary>
    public static RuleValidationError InvalidCode(QuestionAnswerContext context, string code, string system, string valueSetUrl, string bindingStrength)
    {
        var severity = bindingStrength.ToLowerInvariant() switch
        {
            "required" => "error",
            "extensible" => "warning",
            _ => "information"
        };

        return new RuleValidationError
        {
            RuleId = context.Rule.Id,
            RuleType = "QuestionAnswer",
            Severity = severity,
            ResourceType = context.Rule.ResourceType,
            Path = context.CurrentPath,
            ErrorCode = "INVALID_CODE",
            Message = $"Code '{system}|{code}' is not in ValueSet '{valueSetUrl}' (binding: {bindingStrength})",
            EntryIndex = context.EntryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "QuestionAnswer",
                ["questionCode"] = context.QuestionCoding?.Code ?? "unknown",
                ["codeSystem"] = system,
                ["code"] = code,
                ["valueSet"] = valueSetUrl,
                ["bindingStrength"] = bindingStrength
            }
        };
    }

    /// <summary>
    /// Create error for invalid unit
    /// </summary>
    public static RuleValidationError InvalidUnit(QuestionAnswerContext context, string expectedUnit, string actualUnit)
    {
        return new RuleValidationError
        {
            RuleId = context.Rule.Id,
            RuleType = "QuestionAnswer",
            Severity = context.Rule.Severity,
            ResourceType = context.Rule.ResourceType,
            Path = context.CurrentPath,
            ErrorCode = "INVALID_UNIT",
            Message = $"Question '{context.QuestionCoding?.Code}' expects unit '{expectedUnit}' but got '{actualUnit}'",
            EntryIndex = context.EntryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "QuestionAnswer",
                ["questionCode"] = context.QuestionCoding?.Code ?? "unknown",
                ["expectedUnit"] = expectedUnit,
                ["actualUnit"] = actualUnit
            }
        };
    }

    /// <summary>
    /// Create error for regex mismatch
    /// </summary>
    public static RuleValidationError RegexMismatch(QuestionAnswerContext context, string pattern, string value)
    {
        return new RuleValidationError
        {
            RuleId = context.Rule.Id,
            RuleType = "QuestionAnswer",
            Severity = context.Rule.Severity,
            ResourceType = context.Rule.ResourceType,
            Path = context.CurrentPath,
            ErrorCode = "REGEX_MISMATCH",
            Message = $"Answer '{value}' does not match required pattern '{pattern}'",
            EntryIndex = context.EntryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "QuestionAnswer",
                ["questionCode"] = context.QuestionCoding?.Code ?? "unknown",
                ["pattern"] = pattern,
                ["value"] = value
            }
        };
    }

    /// <summary>
    /// Create error for max length exceeded
    /// </summary>
    public static RuleValidationError MaxLengthExceeded(QuestionAnswerContext context, int maxLength, int actualLength)
    {
        return new RuleValidationError
        {
            RuleId = context.Rule.Id,
            RuleType = "QuestionAnswer",
            Severity = context.Rule.Severity,
            ResourceType = context.Rule.ResourceType,
            Path = context.CurrentPath,
            ErrorCode = "MAX_LENGTH_EXCEEDED",
            Message = $"Answer length {actualLength} exceeds maximum {maxLength}",
            EntryIndex = context.EntryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "QuestionAnswer",
                ["questionCode"] = context.QuestionCoding?.Code ?? "unknown",
                ["maxLength"] = maxLength,
                ["actualLength"] = actualLength
            }
        };
    }

    /// <summary>
    /// Create error for question not in set
    /// </summary>
    public static RuleValidationError QuestionNotInSet(QuestionAnswerContext context, string questionCode)
    {
        return new RuleValidationError
        {
            RuleId = context.Rule.Id,
            RuleType = "QuestionAnswer",
            Severity = "warning",
            ResourceType = context.Rule.ResourceType,
            Path = context.CurrentPath,
            ErrorCode = "QUESTION_NOT_IN_SET",
            Message = $"Question '{questionCode}' is not defined in QuestionSet '{context.QuestionSet?.Id}'",
            EntryIndex = context.EntryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "QuestionAnswer",
                ["questionCode"] = questionCode,
                ["questionSetId"] = context.QuestionSet?.Id ?? "unknown"
            }
        };
    }

    /// <summary>
    /// Create advisory error for missing master data
    /// </summary>
    public static RuleValidationError MasterDataMissing(RuleDefinition rule, string dataType, string identifier, int entryIndex)
    {
        return new RuleValidationError
        {
            RuleId = rule.Id,
            RuleType = "QuestionAnswer",
            Severity = "information",
            ResourceType = rule.ResourceType,
            Path = rule.Path,
            ErrorCode = "MASTER_DATA_MISSING",
            Message = $"{dataType} '{identifier}' not found. Cannot validate Question/Answer constraints.",
            EntryIndex = entryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "QuestionAnswer",
                ["dataType"] = dataType,
                ["identifier"] = identifier,
                ["remediation"] = $"Create the missing {dataType} in the Terminology section"
            }
        };
    }
}
