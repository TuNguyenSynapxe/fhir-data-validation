using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models.Terminology;

/// <summary>
/// Represents an advisory about potential issues in terminology authoring.
/// Advisories are non-blocking informational messages that help authors
/// maintain referential integrity without enforcing it.
/// 
/// Design principles:
/// - Generated dynamically (NOT persisted)
/// - Non-blocking (does not prevent saves)
/// - Informational only (user can choose to fix or ignore)
/// </summary>
public class RuleAdvisory
{
    /// <summary>
    /// Advisory code that identifies the type of issue.
    /// Examples: CODE_NOT_FOUND, DUPLICATE_CODE, AMBIGUOUS_REFERENCE
    /// </summary>
    [JsonPropertyName("advisoryCode")]
    public required string AdvisoryCode { get; set; }

    /// <summary>
    /// Severity level of the advisory.
    /// Info: Informational (e.g., unused code)
    /// Warning: Potential issue (e.g., missing display text)
    /// Error: Likely problem (e.g., broken reference)
    /// </summary>
    [JsonPropertyName("severity")]
    public AdvisorySeverity Severity { get; set; }

    /// <summary>
    /// Human-readable message describing the issue.
    /// </summary>
    [JsonPropertyName("message")]
    public required string Message { get; set; }

    /// <summary>
    /// Additional context about the advisory.
    /// Contains details like system, code, constraintId, etc.
    /// </summary>
    [JsonPropertyName("context")]
    public AdvisoryContext Context { get; set; } = new();

    /// <summary>
    /// Suggested actions the user can take to resolve the advisory.
    /// </summary>
    [JsonPropertyName("suggestedActions")]
    public List<string>? SuggestedActions { get; set; }

    /// <summary>
    /// Timestamp when the advisory was generated.
    /// </summary>
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Severity levels for rule advisories.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AdvisorySeverity
{
    /// <summary>
    /// Informational message (e.g., unused code, optimization suggestion)
    /// </summary>
    Info,

    /// <summary>
    /// Warning about potential issue (e.g., missing display, inconsistent naming)
    /// </summary>
    Warning,

    /// <summary>
    /// Error indicating likely problem (e.g., broken reference, missing required data)
    /// </summary>
    Error
}

/// <summary>
/// Context information for a rule advisory.
/// Flexible structure that can contain various metadata depending on advisory type.
/// </summary>
public class AdvisoryContext
{
    /// <summary>
    /// CodeSystem URL involved in the advisory (if applicable)
    /// </summary>
    [JsonPropertyName("system")]
    public string? System { get; set; }

    /// <summary>
    /// Concept code involved in the advisory (if applicable)
    /// </summary>
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    /// <summary>
    /// Display text for the code (if applicable)
    /// </summary>
    [JsonPropertyName("display")]
    public string? Display { get; set; }

    /// <summary>
    /// TerminologyConstraint ID that has the issue (if applicable)
    /// </summary>
    [JsonPropertyName("constraintId")]
    public string? ConstraintId { get; set; }

    /// <summary>
    /// Resource type affected by the constraint (if applicable)
    /// </summary>
    [JsonPropertyName("resourceType")]
    public string? ResourceType { get; set; }

    /// <summary>
    /// FHIRPath expression for the constraint (if applicable)
    /// </summary>
    [JsonPropertyName("path")]
    public string? Path { get; set; }

    /// <summary>
    /// ValueSet URL referenced in the constraint (if applicable)
    /// </summary>
    [JsonPropertyName("valueSetUrl")]
    public string? ValueSetUrl { get; set; }

    /// <summary>
    /// Additional arbitrary metadata
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, object>? Metadata { get; set; }
}
