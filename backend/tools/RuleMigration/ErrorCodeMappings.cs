namespace Pss.FhirProcessor.RuleMigration;

/// <summary>
/// PHASE 5: Static mapping table for deterministic rule types
/// NO guessing, NO inference, NO prose inspection
/// </summary>
public static class ErrorCodeMappings
{
    /// <summary>
    /// Maps rule types to their default ErrorCode when the rule type is deterministic
    /// </summary>
    public static readonly Dictionary<string, string> DefaultErrorCodeByRuleType = new()
    {
        // Deterministic rule types (single possible meaning)
        ["Required"] = "FIELD_REQUIRED",
        ["Pattern"] = "PATTERN_MISMATCH",
        ["FixedValue"] = "VALUE_NOT_EQUAL",
        ["AllowedValues"] = "VALUE_NOT_ALLOWED",
        ["ArrayLength"] = "ARRAY_LENGTH_VIOLATION",
        ["Reference"] = "REFERENCE_NOT_FOUND",
        ["Regex"] = "REGEX_NO_MATCH"
    };

    /// <summary>
    /// Rule types that have multiple possible meanings and MUST be manually reviewed
    /// </summary>
    public static readonly HashSet<string> AmbiguousRuleTypes = new()
    {
        "QuestionAnswer",      // Could be INVALID_ANSWER_VALUE, ANSWER_OUT_OF_RANGE, etc.
        "CustomFHIRPath",      // Completely user-defined
        "CodeMaster",          // Could be UNKNOWN_SCREENING_TYPE, MISSING_QUESTION_CODE, etc.
        "Custom"               // Generic custom validation
    };

    /// <summary>
    /// Check if a rule type can be automatically migrated
    /// </summary>
    public static bool IsDeterministic(string ruleType)
    {
        return DefaultErrorCodeByRuleType.ContainsKey(ruleType);
    }

    /// <summary>
    /// Check if a rule type is ambiguous and requires manual review
    /// </summary>
    public static bool IsAmbiguous(string ruleType)
    {
        return AmbiguousRuleTypes.Contains(ruleType);
    }

    /// <summary>
    /// Get the default errorCode for a deterministic rule type
    /// Returns null if the rule type is not deterministic
    /// </summary>
    public static string? GetDefaultErrorCode(string ruleType)
    {
        return DefaultErrorCodeByRuleType.GetValueOrDefault(ruleType);
    }
}
