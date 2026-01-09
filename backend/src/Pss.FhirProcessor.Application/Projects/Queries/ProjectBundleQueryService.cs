using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Queries;

/// <summary>
/// Phase 7.4: Query service for project bundles (read-only).
/// </summary>
public class ProjectBundleQueryService
{
    private readonly FhirProcessorDbContext _dbContext;

    public ProjectBundleQueryService(FhirProcessorDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Get all bundles for a project.
    /// Ordered by CreatedAt DESC (most recent first).
    /// Does NOT return BundleJson.
    /// </summary>
    public async Task<List<BundleMetadata>> GetProjectBundlesAsync(
        Guid projectId,
        CancellationToken cancellationToken = default)
    {
        var bundles = await _dbContext.ProjectBundles
            .AsNoTracking()
            .Where(b => b.ProjectId == projectId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new BundleMetadata
            {
                BundleId = b.Id,
                Name = b.Name,
                Source = b.Source,
                CreatedAt = b.CreatedAt.UtcDateTime
            })
            .ToListAsync(cancellationToken);

        return bundles;
    }
}

// Query result model
public class BundleMetadata
{
    public Guid BundleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public BundleSource Source { get; set; }
    public DateTime CreatedAt { get; set; }
}
