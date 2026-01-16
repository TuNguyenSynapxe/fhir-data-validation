namespace Pss.FhirProcessor.Terminology.Domain;

/// <summary>
/// ValueSet preview with codes and metadata.
/// No Firely references - pure domain model.
/// </summary>
public sealed class ValueSetPreview
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public string? Publisher { get; init; }
    public string? Description { get; init; }
    public required ValueSetCapability Capability { get; init; }
    public required ValueSetPreviewability Previewability { get; init; }
    public required IReadOnlyList<ValueSetCode> Codes { get; init; }
    
    /// <summary>
    /// Creates an empty preview for a ValueSet URL.
    /// </summary>
    public static ValueSetPreview Empty(string url) => new()
    {
        Url = url,
        Name = string.Empty,
        Publisher = null,
        Description = null,
        Capability = ValueSetCapability.Previewable,
        Previewability = ValueSetPreviewability.Unsupported,
        Codes = Array.Empty<ValueSetCode>()
    };
}
