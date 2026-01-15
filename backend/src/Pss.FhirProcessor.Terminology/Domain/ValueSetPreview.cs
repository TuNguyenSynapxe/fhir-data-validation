namespace Pss.FhirProcessor.Terminology.Domain;

/// <summary>
/// ValueSet preview with codes.
/// No Firely references - pure domain model.
/// </summary>
public sealed class ValueSetPreview
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public required IReadOnlyList<ValueSetCode> Codes { get; init; }
    
    /// <summary>
    /// Creates an empty preview for a ValueSet URL.
    /// </summary>
    public static ValueSetPreview Empty(string url) => new()
    {
        Url = url,
        Name = string.Empty,
        Codes = Array.Empty<ValueSetCode>()
    };
}
