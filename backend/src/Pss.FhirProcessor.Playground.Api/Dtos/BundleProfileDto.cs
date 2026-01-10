namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Phase 8.3: Response for bundle profile resolution status.
/// </summary>
public sealed class BundleProfileResponseDto
{
    /// <summary>
    /// Resolution state: "resolved", "unresolved", or "unprofiled".
    /// </summary>
    public string State { get; set; } = string.Empty;

    /// <summary>
    /// Resolved StructureDefinition ID (only present for "resolved" state).
    /// </summary>
    public Guid? StructureDefinitionId { get; set; }

    /// <summary>
    /// Selection source: "auto" or "manual" (only present if association exists).
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// StructureDefinition canonical URL (only present for "resolved" state).
    /// </summary>
    public string? CanonicalUrl { get; set; }

    /// <summary>
    /// StructureDefinition name (only present for "resolved" state).
    /// </summary>
    public string? Name { get; set; }
}

/// <summary>
/// Phase 8.3: Request to set bundle profile association.
/// </summary>
public sealed class SetBundleProfileRequestDto
{
    /// <summary>
    /// StructureDefinition ID to associate with the Bundle.
    /// null = explicitly unprofiled.
    /// </summary>
    public Guid? StructureDefinitionId { get; set; }
}
