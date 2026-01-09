using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Phase 7.4: Artifact metadata (read-only, no JSON content).
/// </summary>
public class ProjectArtifactDto
{
    public Guid ArtifactId { get; set; }
    public ArtifactType ArtifactType { get; set; }
    public string ResourceType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string? CanonicalUrl { get; set; }
    public string Hash { get; set; } = string.Empty;
}
