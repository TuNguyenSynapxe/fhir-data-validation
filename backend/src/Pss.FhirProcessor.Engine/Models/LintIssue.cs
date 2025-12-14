namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Represents a best-effort structural lint issue detected during pre-FHIR validation.
/// These are NOT authoritative FHIR validation errors - Firely remains the source of truth.
/// Lint issues are intended to improve developer UX by surfacing multiple structural problems at once.
/// </summary>
public class LintIssue
{
    /// <summary>
    /// Lint-specific error code (e.g., LINT_INVALID_DATE, LINT_MISSING_RESOURCE_TYPE)
    /// References a rule in LintRuleCatalog
    /// </summary>
    public string RuleId { get; set; } = string.Empty;

    /// <summary>
    /// Rule category from LintRuleCatalog (Json, Structure, SchemaShape, Primitive, Compatibility)
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Severity level from catalog: "error" or "warning"
    /// Note: Even "error" severity does not block Firely validation
    /// </summary>
    public string Severity { get; set; } = "error";

    /// <summary>
    /// Confidence level from catalog: "high", "medium", or "low"
    /// </summary>
    public string Confidence { get; set; } = "high";

    /// <summary>
    /// Short title from catalog (e.g., "Invalid JSON Syntax")
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Full description from catalog explaining what the rule checks
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Minimal contextual message specific to this occurrence (e.g., path + reason)
    /// Does NOT duplicate catalog metadata
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Disclaimer from catalog about best-effort nature of check
    /// </summary>
    public string Disclaimer { get; set; } = string.Empty;

    /// <summary>
    /// FHIR resource type where the issue was detected (e.g., "Patient", "Observation")
    /// Null if issue is at bundle level
    /// </summary>
    public string? ResourceType { get; set; }

    /// <summary>
    /// JSON Pointer path to the problematic element (e.g., "/entry/0/resource/birthDate")
    /// </summary>
    public string? JsonPointer { get; set; }

    /// <summary>
    /// FHIRPath expression (best-effort, may be null if not resolvable)
    /// </summary>
    public string? FhirPath { get; set; }

    /// <summary>
    /// Additional contextual information about the issue
    /// </summary>
    public Dictionary<string, object>? Details { get; set; }

    /// <summary>
    /// Legacy property for backward compatibility
    /// </summary>
    [Obsolete("Use RuleId instead")]
    public string Code
    {
        get => RuleId;
        set => RuleId = value;
    }
}
