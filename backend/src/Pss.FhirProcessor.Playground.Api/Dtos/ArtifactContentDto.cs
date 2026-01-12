using System.Text.Json;

namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Phase 3.1: DTO for artifact JSON content.
/// Read-only access to raw artifact JSON (StructureDefinitions only).
/// </summary>
public sealed record ArtifactContentDto
{
    /// <summary>
    /// Unique identifier of the artifact.
    /// </summary>
    public Guid ArtifactId { get; init; }

    /// <summary>
    /// Type of artifact (e.g., "StructureDefinition", "ValueSet").
    /// </summary>
    public string ArtifactType { get; init; } = string.Empty;

    /// <summary>
    /// Canonical URL of the artifact.
    /// </summary>
    public string CanonicalUrl { get; init; } = string.Empty;

    /// <summary>
    /// Raw JSON content of the artifact.
    /// For StructureDefinitions, this contains the full SD JSON for runtime constraint extraction.
    /// </summary>
    public JsonElement Content { get; init; }
}
