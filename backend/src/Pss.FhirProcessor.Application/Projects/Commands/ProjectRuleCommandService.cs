using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Commands;

/// <summary>
/// Phase 9.4: Command service for managing bundle-scoped manual rules.
/// ONLY for ManualCustom rules. ImportedGenerated rules are READ-ONLY.
/// </summary>
public class ProjectRuleCommandService
{
    private readonly FhirProcessorDbContext _dbContext;

    public ProjectRuleCommandService(FhirProcessorDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Create a new bundle-scoped manual rule.
    /// </summary>
    public async Task<Guid> CreateBundleRuleAsync(
        Guid projectId,
        Guid bundleId,
        CreateBundleRuleRequest request,
        CancellationToken cancellationToken = default)
    {
        // Verify project and bundle exist
        var projectExists = await _dbContext.Projects
            .AnyAsync(p => p.Id == projectId, cancellationToken);
        
        if (!projectExists)
        {
            throw new InvalidOperationException($"Project {projectId} not found");
        }

        var bundleExists = await _dbContext.ProjectBundles
            .AnyAsync(b => b.Id == bundleId && b.ProjectId == projectId, cancellationToken);
        
        if (!bundleExists)
        {
            throw new InvalidOperationException($"Bundle {bundleId} not found in project {projectId}");
        }

        // Create rule entity
        var rule = new ProjectRule
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Scope = RuleScope.Bundle,  // Phase 9.4: Bundle-scoped ONLY
            BundleId = bundleId,
            RuleType = RuleType.FhirPathCustom,  // Manual rules are FHIRPath
            Provenance = RuleProvenance.ManualCustom,  // MANDATORY
            Title = request.Title,
            Description = request.Description,
            DefinitionJson = request.FhirPathExpression,  // Store FHIRPath in DefinitionJson
            IsEnabled = request.IsEnabled,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.ProjectRules.Add(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return rule.Id;
    }

    /// <summary>
    /// Update an existing bundle-scoped manual rule.
    /// ONLY allows updating ManualCustom rules. Rejects ImportedGenerated.
    /// </summary>
    public async Task UpdateBundleRuleAsync(
        Guid projectId,
        Guid bundleId,
        Guid ruleId,
        UpdateBundleRuleRequest request,
        CancellationToken cancellationToken = default)
    {
        var rule = await _dbContext.ProjectRules
            .Where(r => r.Id == ruleId 
                && r.ProjectId == projectId 
                && r.BundleId == bundleId)
            .FirstOrDefaultAsync(cancellationToken);

        if (rule == null)
        {
            throw new InvalidOperationException($"Rule {ruleId} not found in bundle {bundleId}");
        }

        // CRITICAL: Reject edits to imported rules
        if (rule.Provenance == RuleProvenance.ImportedGenerated)
        {
            throw new InvalidOperationException("Cannot edit imported rules. Only ManualCustom rules can be modified.");
        }

        // Update fields
        rule.Title = request.Title;
        rule.Description = request.Description;
        rule.DefinitionJson = request.FhirPathExpression;
        rule.IsEnabled = request.IsEnabled;
        rule.UpdatedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Delete a bundle-scoped manual rule.
    /// ONLY allows deleting ManualCustom rules. Rejects ImportedGenerated.
    /// </summary>
    public async Task DeleteBundleRuleAsync(
        Guid projectId,
        Guid bundleId,
        Guid ruleId,
        CancellationToken cancellationToken = default)
    {
        var rule = await _dbContext.ProjectRules
            .Where(r => r.Id == ruleId 
                && r.ProjectId == projectId 
                && r.BundleId == bundleId)
            .FirstOrDefaultAsync(cancellationToken);

        if (rule == null)
        {
            throw new InvalidOperationException($"Rule {ruleId} not found in bundle {bundleId}");
        }

        // CRITICAL: Reject deletion of imported rules
        if (rule.Provenance == RuleProvenance.ImportedGenerated)
        {
            throw new InvalidOperationException("Cannot delete imported rules. Only ManualCustom rules can be deleted.");
        }

        _dbContext.ProjectRules.Remove(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Get bundle-scoped rules (both imported and manual) with full details.
    /// Returns DefinitionJson for inspection.
    /// </summary>
    public async Task<List<BundleRuleDetails>> GetBundleRulesAsync(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken = default)
    {
        var rules = await _dbContext.ProjectRules
            .AsNoTracking()
            .Where(r => r.ProjectId == projectId 
                && r.Scope == RuleScope.Bundle 
                && r.BundleId == bundleId)
            .OrderBy(r => r.Provenance)  // Imported first, then manual
            .ThenBy(r => r.Title)
            .Select(r => new BundleRuleDetails
            {
                RuleId = r.Id,
                RuleType = r.RuleType,
                Provenance = r.Provenance,
                Title = r.Title,
                Description = r.Description,
                FhirPathExpression = r.DefinitionJson,
                IsEnabled = r.IsEnabled,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return rules;
    }
}

// Request models
public class CreateBundleRuleRequest
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required string FhirPathExpression { get; set; }
    public bool IsEnabled { get; set; } = true;
}

public class UpdateBundleRuleRequest
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required string FhirPathExpression { get; set; }
    public bool IsEnabled { get; set; }
}

// Query result model
public class BundleRuleDetails
{
    public Guid RuleId { get; set; }
    public RuleType RuleType { get; set; }
    public RuleProvenance Provenance { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required string FhirPathExpression { get; set; }
    public bool IsEnabled { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
