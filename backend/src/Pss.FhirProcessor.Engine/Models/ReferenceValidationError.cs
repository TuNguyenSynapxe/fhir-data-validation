namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Validation error from reference validation
/// NO PROSE: ErrorCode is mandatory, Message is deprecated
/// </summary>
public class ReferenceValidationError
{
    public required string Severity { get; set; }
    public required string ResourceType { get; set; }
    public required string Path { get; set; }
    
    /// <summary>
    /// REQUIRED: Machine-readable error code
    /// Frontend uses this for message lookup
    /// </summary>
    public required string ErrorCode { get; set; }
    
    /// <summary>
    /// Optional: Short contextual label (max 60 chars, no prose)
    /// Displayed as subtitle only
    /// </summary>
    public string? UserHint { get; set; }
    
    public Dictionary<string, object>? Details { get; set; }
    public int? EntryIndex { get; set; }
    public string? ResourceId { get; set; }
    public string? Reference { get; set; }
}
