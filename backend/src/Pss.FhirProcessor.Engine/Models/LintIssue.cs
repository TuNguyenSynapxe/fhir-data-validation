namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Represents a quality/advisory finding detected during best-effort structural validation.
/// These are NOT blocking validation errors - they inform and guide developers.
/// Renamed from LintIssue to clarify non-blocking, advisory nature.
/// 
/// Mental model: "Quality findings inform validation, not fail validation."
/// </summary>
public class QualityFinding
{
    /// <summary>
    /// Quality check code (e.g., MISSING_REQUIRED_FIELD, UNKNOWN_ELEMENT)
    /// References a rule in the quality check catalog
    /// </summary>
    public string RuleId { get; set; } = string.Empty;

    /// <summary>
    /// Rule category (Json, Structure, SchemaShape, Primitive, Compatibility)
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Severity level from catalog: "error" or "warning"
    /// Note: This is backend severity - UI will override based on source
    /// Advisory findings are never blocking, regardless of this value
    /// </summary>
    public string Severity { get; set; } = "error";

    /// <summary>
    /// Confidence level: "high", "medium", or "low"
    /// </summary>
    public string Confidence { get; set; } = "high";

    /// <summary>
    /// Short title (e.g., "Invalid JSON Syntax", "Missing Required Field")
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Full description explaining what the rule checks
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Minimal contextual message specific to this occurrence
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

/// <summary>
/// Type alias for backward compatibility.
/// LintIssue is now QualityFinding to clarify non-blocking, advisory nature.
/// </summary>
[Obsolete("Use QualityFinding instead - clarifies that these findings are advisory, not blocking errors")]
public class LintIssue : QualityFinding
{
}
