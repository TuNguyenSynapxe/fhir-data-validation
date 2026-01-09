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
