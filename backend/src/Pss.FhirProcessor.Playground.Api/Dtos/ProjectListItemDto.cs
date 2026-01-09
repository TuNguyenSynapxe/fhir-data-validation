namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Phase 7.4: List item for imported projects (read-only).
/// </summary>
public class ProjectListItemDto
{
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsPublicEnabled { get; set; }
    public int ArtifactCount { get; set; }
    public int BundleCount { get; set; }
    public int RuleCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
