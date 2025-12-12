namespace Pss.FhirProcessor.Engine.DTOs;

/// <summary>
/// Response model for FHIRPath validation endpoint.
/// </summary>
public class FhirPathValidationResponse
{
    /// <summary>
    /// Indicates whether the FHIRPath expression is syntactically valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Error message if validation failed (null if valid).
    /// </summary>
    public string? Error { get; set; }
}
