namespace Pss.FhirProcessor.Engine.DTOs;

/// <summary>
/// Request model for FHIRPath validation endpoint.
/// </summary>
public class FhirPathValidationRequest
{
    /// <summary>
    /// The FHIR resource type to validate against (e.g., "Patient", "Observation").
    /// </summary>
    public string ResourceType { get; set; } = string.Empty;

    /// <summary>
    /// The FHIR bundle or resource JSON to use as context for validation.
    /// </summary>
    public string BundleJson { get; set; } = string.Empty;

    /// <summary>
    /// The FHIRPath expression to validate.
    /// </summary>
    public string FhirPath { get; set; } = string.Empty;
}
