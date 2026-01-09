namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Phase 7.4: Project summary view (read-only).
/// </summary>
public class ProjectDetailsDto
{
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsPublicEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public ProjectCountsDto Counts { get; set; } = new();
}

public class ProjectCountsDto
{
    public int ArtifactCount { get; set; }
    public int BundleCount { get; set; }
    public int RuleCount { get; set; }
}
