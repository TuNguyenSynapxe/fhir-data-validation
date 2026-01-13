namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Metadata for a StructureDefinition.
/// </summary>
public sealed class SdMetadata
{
    /// <summary>
    /// Name (e.g., "MyPatientProfile").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Canonical URL.
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Version (e.g., "1.0.0").
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// Status (e.g., "draft", "active").
    /// </summary>
    public string Status { get; set; } = "draft";

    /// <summary>
    /// Optional description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Publisher (configurable).
    /// </summary>
    public string? Publisher { get; set; }
}
