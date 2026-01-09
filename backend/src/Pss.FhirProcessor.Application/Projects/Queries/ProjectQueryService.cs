using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Queries;

/// <summary>
/// Phase 7.4: Query service for project read operations (read-only).
/// </summary>
public class ProjectQueryService
{
    private readonly FhirProcessorDbContext _dbContext;

    public ProjectQueryService(FhirProcessorDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// List all imported projects with counts.
    /// Sorted by CreatedAt DESC (most recent first).
    /// </summary>
    public async Task<List<ProjectListItem>> GetAllProjectsAsync(CancellationToken cancellationToken = default)
    {
        var projects = await _dbContext.Projects
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        var result = new List<ProjectListItem>();

        foreach (var project in projects)
        {
            var artifactCount = await _dbContext.ProjectArtifacts
                .CountAsync(a => a.ProjectId == project.Id, cancellationToken);
            var bundleCount = await _dbContext.ProjectBundles
                .CountAsync(b => b.ProjectId == project.Id, cancellationToken);
            var ruleCount = await _dbContext.ProjectRules
                .CountAsync(r => r.ProjectId == project.Id, cancellationToken);

            result.Add(new ProjectListItem
            {
                ProjectId = project.Id,
                Name = project.Name,
                IsPublicEnabled = project.IsPublicEnabled,
                ArtifactCount = artifactCount,
                BundleCount = bundleCount,
                RuleCount = ruleCount,
                CreatedAt = project.CreatedAt.UtcDateTime
            });
        }

        return result;
    }

    /// <summary>
    /// Get project details with counts.
    /// Returns null if project not found.
    /// </summary>
    public async Task<ProjectDetails?> GetProjectDetailsAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var project = await _dbContext.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            return null;
        }

        var artifactCount = await _dbContext.ProjectArtifacts
            .CountAsync(a => a.ProjectId == projectId, cancellationToken);
        var bundleCount = await _dbContext.ProjectBundles
            .CountAsync(b => b.ProjectId == projectId, cancellationToken);
        var ruleCount = await _dbContext.ProjectRules
            .CountAsync(r => r.ProjectId == projectId, cancellationToken);

        return new ProjectDetails
        {
            ProjectId = project.Id,
            Name = project.Name,
            IsPublicEnabled = project.IsPublicEnabled,
            CreatedAt = project.CreatedAt.UtcDateTime,
            Counts = new ProjectCounts
            {
                ArtifactCount = artifactCount,
                BundleCount = bundleCount,
                RuleCount = ruleCount
            }
        };
    }

    /// <summary>
    /// Check if project exists.
    /// </summary>
    public async Task<bool> ProjectExistsAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Projects
            .AnyAsync(p => p.Id == projectId, cancellationToken);
    }
}

// Query result models
public class ProjectListItem
{
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsPublicEnabled { get; set; }
    public int ArtifactCount { get; set; }
    public int BundleCount { get; set; }
    public int RuleCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProjectDetails
{
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsPublicEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public ProjectCounts Counts { get; set; } = new();
}

public class ProjectCounts
{
    public int ArtifactCount { get; set; }
    public int BundleCount { get; set; }
    public int RuleCount { get; set; }
}
