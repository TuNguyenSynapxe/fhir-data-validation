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
    /// </summary>
    [JsonPropertyName("severity")]
    public required string Severity { get; set; }
    
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
    
    /// <summary>
    /// Navigation metadata for frontend
    /// </summary>
    [JsonPropertyName("navigation")]
    public NavigationInfo? Navigation { get; set; }
}
