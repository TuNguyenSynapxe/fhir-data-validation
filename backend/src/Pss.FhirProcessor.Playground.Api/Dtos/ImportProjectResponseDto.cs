namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Response DTO for successful project import.
/// </summary>
public sealed class ImportProjectResponseDto
{
    /// <summary>
    /// Unique identifier of the created project.
    /// </summary>
    public Guid ProjectId { get; init; }

    /// <summary>
    /// Public identifier for the project (if public access enabled).
    /// </summary>
    public string? PublicId { get; init; }

    /// <summary>
    /// Number of artifacts imported (StructureDefinitions, ValueSets, etc.).
    /// </summary>
    public int ArtifactCount { get; init; }

    /// <summary>
    /// Number of example bundles imported.
    /// </summary>
    public int BundleCount { get; init; }

    /// <summary>
    /// Number of rules generated from StructureDefinitions.
    /// </summary>
    public int RuleCount { get; init; }

    /// <summary>
    /// Policy mode of the project (Strict or Permissive).
    /// </summary>
    public string PolicyMode { get; init; } = string.Empty;
}
