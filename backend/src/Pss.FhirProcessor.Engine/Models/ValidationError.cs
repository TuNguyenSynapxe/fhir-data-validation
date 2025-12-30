using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Unified error model as defined in docs/08_unified_error_model.md
/// </summary>
public class ValidationError
{
    /// <summary>
    /// Error source: FHIR, Business, CodeMaster, Reference
    /// </summary>
    [JsonPropertyName("source")]
    public required string Source { get; set; }
    
    /// <summary>
    /// Severity: error, warning, info
    /// This is the EFFECTIVE severity after any downgrade logic is applied.
    /// </summary>
    [JsonPropertyName("severity")]
    public required string Severity { get; set; }
    
    /// <summary>
    /// Original configured severity before any downgrade (optional).
    /// Only populated when severity was modified from the rule's configured value.
    /// Useful for debugging why a severity was downgraded.
    /// </summary>
    [JsonPropertyName("configuredSeverity")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ConfiguredSeverity { get; set; }
    
    /// <summary>
    /// Validation classification (optional).
    /// Indicates whether this validation is Contract, Structural, or Advisory.
    /// </summary>
    [JsonPropertyName("validationClass")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public ValidationClass? ValidationClass { get; set; }
    
    /// <summary>
    /// Reason for severity downgrade (optional).
    /// Only populated for Advisory validations when severity was downgraded.
    /// Examples: "Low confidence heuristic", "SpecHint advisory"
    /// </summary>
    [JsonPropertyName("downgradeReason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DowngradeReason { get; set; }
    
    /// <summary>
    /// Resource type being validated
    /// </summary>
    [JsonPropertyName("resourceType")]
    public string? ResourceType { get; set; }
    
    /// <summary>
    /// Human-readable FHIRPath-like path
    /// </summary>
    [JsonPropertyName("path")]
    public string? Path { get; set; }
    
    /// <summary>
    /// Machine-navigable JSON pointer
    /// </summary>
    [JsonPropertyName("jsonPointer")]
    public string? JsonPointer { get; set; }
    
    /// <summary>
    /// Error code (e.g., MANDATORY_MISSING, INVALID_VALUE)
    /// </summary>
    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }
    
    /// <summary>
    /// Human-readable error message
    /// </summary>
    [JsonPropertyName("message")]
    public required string Message { get; set; }
    
    /// <summary>
    /// Additional error context
    /// </summary>
    [JsonPropertyName("details")]
    public Dictionary<string, object>? Details { get; set; }
    
    /// <summary>
    /// Structured explanation for this issue (optional).
    /// Provides "what" and "how" guidance without blocking validation.
    /// </summary>
    [JsonPropertyName("explanation")]
    public ValidationIssueExplanation? Explanation { get; set; }
}
