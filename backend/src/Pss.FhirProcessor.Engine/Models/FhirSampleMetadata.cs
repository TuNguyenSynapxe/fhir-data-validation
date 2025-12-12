namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Metadata for a FHIR sample JSON file
/// </summary>
public class FhirSampleMetadata
{
    /// <summary>
    /// Sample identifier (derived from filename, e.g., "patient-full")
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// FHIR resource type (e.g., "Patient")
    /// </summary>
    public string ResourceType { get; set; } = string.Empty;

    /// <summary>
    /// FHIR version (e.g., "R4")
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// Display name for UI (derived from filename or JSON)
    /// </summary>
    public string Display { get; set; } = string.Empty;

    /// <summary>
    /// Optional description
    /// </summary>
    public string? Description { get; set; }
}
