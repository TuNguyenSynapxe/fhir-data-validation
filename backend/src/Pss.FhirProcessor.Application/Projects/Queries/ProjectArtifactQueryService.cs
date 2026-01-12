using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Queries;

/// <summary>
/// Phase 7.4: Query service for project artifacts (read-only, no JSON content).
/// </summary>
public class ProjectArtifactQueryService
{
    private readonly FhirProcessorDbContext _dbContext;

    public ProjectArtifactQueryService(FhirProcessorDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Get all artifacts for a project.
    /// Ordered by ArtifactType, then FilePath.
    /// Does NOT return ResourceJson.
    /// </summary>
    public async Task<List<ArtifactMetadata>> GetProjectArtifactsAsync(
        Guid projectId,
        CancellationToken cancellationToken = default)
    {
        var artifacts = await _dbContext.ProjectArtifacts
            .AsNoTracking()
            .Where(a => a.ProjectId == projectId)
            .OrderBy(a => a.ArtifactType)
            .ThenBy(a => a.FilePath)
            .Select(a => new ArtifactMetadata
            {
                ArtifactId = a.Id,
                ArtifactType = a.ArtifactType,
                ResourceType = a.ResourceType,
                FileName = a.FileName,
                FilePath = a.FilePath,
                CanonicalUrl = a.CanonicalUrl,
                Hash = a.Hash
            })
            .ToListAsync(cancellationToken);

        return artifacts;
    }

    /// <summary>
    /// Phase 3.1: Get artifact by ID including JSON content.
    /// Used for runtime SD constraint extraction.
    /// </summary>
    public async Task<ArtifactWithContent?> GetArtifactByIdAsync(
        Guid projectId,
        string artifactId,
        CancellationToken cancellationToken = default)
    {
        var artifact = await _dbContext.ProjectArtifacts
            .AsNoTracking()
            .Where(a => a.ProjectId == projectId && a.Id.ToString() == artifactId)
            .Select(a => new ArtifactWithContent
            {
                ArtifactId = a.Id.ToString(),
                ArtifactType = a.ArtifactType.ToString(),
                ResourceType = a.ResourceType,
                CanonicalUrl = a.CanonicalUrl,
                ResourceJson = a.ResourceJson
            })
            .FirstOrDefaultAsync(cancellationToken);

        return artifact;
    }
}

// Query result model
public class ArtifactMetadata
{
    public Guid ArtifactId { get; set; }
    public ArtifactType ArtifactType { get; set; }
    public string ResourceType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string? CanonicalUrl { get; set; }
    public string Hash { get; set; } = string.Empty;
}

/// <summary>
/// Phase 3.1: Artifact with full JSON content.
/// Used for runtime SD constraint extraction.
/// </summary>
public class ArtifactWithContent
{
    public string ArtifactId { get; set; } = string.Empty;
    public string ArtifactType { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string? CanonicalUrl { get; set; }
    public string ResourceJson { get; set; } = string.Empty;
}
