namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Error for missing HL7 FHIR required field (advisory only).
/// Carries metadata from SpecHint for proper error formatting.
/// </summary>
public class SpecHintIssue
{
    /// <summary>
    /// Resource type where the field is missing
    /// </summary>
    public required string ResourceType { get; set; }
    
    /// <summary>
    /// Resource ID (if available)
    /// </summary>
    public string? ResourceId { get; set; }
    
    /// <summary>
    /// FHIRPath to the missing field
    /// </summary>
    public required string Path { get; set; }
    
    /// <summary>
    /// Explanation of why this field is required
    /// </summary>
    public required string Reason { get; set; }
    
    /// <summary>
    /// Severity (warning | info)
    /// </summary>
    public required string Severity { get; set; }
    
    /// <summary>
    /// JSON pointer to the resource
    /// </summary>
    public string? JsonPointer { get; set; }
    
    /// <summary>
    /// METADATA: If true, this issue came from a conditional hint.
    /// Drives error code and message formatting.
    /// </summary>
    public bool IsConditional { get; set; }
    
    /// <summary>
    /// METADATA: The FHIRPath condition that was evaluated (if conditional).
    /// Used for error details.
    /// </summary>
    public string? Condition { get; set; }
    
    /// <summary>
    /// METADATA: If true, validation was applied to each array element.
    /// Used for error details.
    /// </summary>
    public bool AppliesToEach { get; set; }
}
