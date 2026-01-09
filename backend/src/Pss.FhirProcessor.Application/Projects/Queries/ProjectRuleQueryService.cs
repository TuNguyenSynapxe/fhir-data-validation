using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Queries;

/// <summary>
/// Phase 7.4: Query service for project rules (read-only, provenance-visible).
/// </summary>
public class ProjectRuleQueryService
{
    private readonly FhirProcessorDbContext _dbContext;

    public ProjectRuleQueryService(FhirProcessorDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Get all rules for a project.
    /// Ordered by Scope, then Title.
    /// Provenance (ImportedGenerated vs ManualCustom) is preserved.
    /// Does NOT return DefinitionJson.
    /// </summary>
    public async Task<List<RuleMetadata>> GetProjectRulesAsync(
        Guid projectId,
        CancellationToken cancellationToken = default)
    {
        var rules = await _dbContext.ProjectRules
            .AsNoTracking()
            .Where(r => r.ProjectId == projectId)
            .OrderBy(r => r.Scope)
            .ThenBy(r => r.Title)
            .Select(r => new RuleMetadata
            {
                RuleId = r.Id,
                Scope = r.Scope,
                BundleId = r.BundleId,
                RuleType = r.RuleType,
                Provenance = r.Provenance,
                Title = r.Title,
                IsEnabled = r.IsEnabled
            })
            .ToListAsync(cancellationToken);

        return rules;
    }
}

// Query result model
public class RuleMetadata
{
    public Guid RuleId { get; set; }
    public RuleScope Scope { get; set; }
    public Guid? BundleId { get; set; }
    public RuleType RuleType { get; set; }
    public RuleProvenance Provenance { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
