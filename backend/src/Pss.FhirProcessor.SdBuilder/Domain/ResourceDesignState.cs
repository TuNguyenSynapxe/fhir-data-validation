namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Represents the design-time state of a FHIR resource profile.
/// </summary>
public sealed class ResourceDesignState
{
    /// <summary>
    /// Resource type (e.g., "Patient", "Observation").
    /// </summary>
    public string ResourceType { get; set; } = string.Empty;

    /// <summary>
    /// Canonical URL of the base StructureDefinition.
    /// </summary>
    public string BaseCanonicalUrl { get; set; } = string.Empty;

    /// <summary>
    /// Visibility mode used during initialization (Minimal or Full).
    /// UI-only; does not affect export logic.
    /// </summary>
    public VisibilityMode VisibilityMode { get; set; }

    /// <summary>
    /// All elements in the resource (including excluded ones).
    /// </summary>
    public List<ElementDesignState> Elements { get; set; } = new();
}
