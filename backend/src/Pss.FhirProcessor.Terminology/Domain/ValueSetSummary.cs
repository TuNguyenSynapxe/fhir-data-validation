namespace Pss.FhirProcessor.Terminology.Domain;

/// <summary>
/// ValueSet summary for search results.
/// No Firely references - pure domain model.
/// </summary>
public sealed class ValueSetSummary
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public required string Publisher { get; init; }
    public string? Description { get; init; }
    
    /// <summary>
    /// HL7-level capability (import-time structural classification).
    /// </summary>
    public required ValueSetCapability Capability { get; init; }
    
    /// <summary>
    /// Runtime-derived previewability (actual engine capability).
    /// Determines whether preview can actually be shown.
    /// </summary>
    public required ValueSetPreviewability Previewability { get; init; }
}
