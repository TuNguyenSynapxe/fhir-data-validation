using System.Text.Json;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models.Terminology;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services.Terminology;

/// <summary>
/// File-based implementation of IConstraintService.
/// Stores TerminologyConstraints as JSON files in a project-specific folder.
/// 
/// Storage structure:
/// {baseDataPath}/{projectId}/constraints/terminology-constraints.json
/// 
/// Note: Stores all constraints for a project in a single file for simplicity.
/// For production with many constraints, consider database storage or individual files.
/// </summary>
public class ConstraintService : IConstraintService
{
    private readonly ILogger<ConstraintService> _logger;
    private readonly string _baseDataPath;
    private readonly JsonSerializerOptions _jsonOptions;

    public ConstraintService(ILogger<ConstraintService> logger, string baseDataPath)
    {
        _logger = logger;
        _baseDataPath = baseDataPath;
        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    public async Task<TerminologyConstraint?> GetConstraintByIdAsync(string constraintId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Getting constraint by ID: {ConstraintId}", constraintId);

        // Search all projects (or could be scoped if needed)
        var projectDirs = Directory.GetDirectories(_baseDataPath);
        
        foreach (var projectDir in projectDirs)
        {
            var constraints = await LoadConstraintsFromProjectAsync(Path.GetFileName(projectDir), cancellationToken);
            var constraint = constraints.FirstOrDefault(c => c.Id == constraintId);
            
            if (constraint != null)
            {
                _logger.LogDebug("Found constraint: {ConstraintId}", constraintId);
                return constraint;
            }
        }

        _logger.LogDebug("Constraint not found: {ConstraintId}", constraintId);
        return null;
    }

    public async Task<List<TerminologyConstraint>> ListConstraintsAsync(string projectId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Listing constraints for project: {ProjectId}", projectId);
        return await LoadConstraintsFromProjectAsync(projectId, cancellationToken);
    }

    public async Task<List<TerminologyConstraint>> ListConstraintsByResourceTypeAsync(
        string projectId, 
        string resourceType, 
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Listing constraints for resource type: {ResourceType} in project: {ProjectId}", resourceType, projectId);

        var allConstraints = await LoadConstraintsFromProjectAsync(projectId, cancellationToken);
        var filtered = allConstraints.Where(c => c.ResourceType == resourceType).ToList();

        _logger.LogDebug("Found {Count} constraints for resource type: {ResourceType}", filtered.Count, resourceType);
        return filtered;
    }

    public async Task<List<TerminologyConstraint>> ListConstraintsByCodeSystemAsync(
        string projectId, 
        string codeSystemUrl, 
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Listing constraints for CodeSystem: {CodeSystemUrl} in project: {ProjectId}", codeSystemUrl, projectId);

        var allConstraints = await LoadConstraintsFromProjectAsync(projectId, cancellationToken);
        
        // Filter constraints that reference the CodeSystem in their allowedAnswers
        var filtered = allConstraints.Where(c => 
            c.ValueSetUrl == codeSystemUrl ||
            c.AllowedAnswers.Any(a => a.System == codeSystemUrl)
        ).ToList();

        _logger.LogDebug("Found {Count} constraints referencing CodeSystem: {CodeSystemUrl}", filtered.Count, codeSystemUrl);
        return filtered;
    }

    public async Task SaveConstraintAsync(string projectId, TerminologyConstraint constraint, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Saving constraint: {ConstraintId} for project: {ProjectId}", constraint.Id, projectId);

        var constraints = await LoadConstraintsFromProjectAsync(projectId, cancellationToken);
        
        // Remove existing constraint with same ID (if exists)
        constraints.RemoveAll(c => c.Id == constraint.Id);
        
        // Add new/updated constraint
        constraints.Add(constraint);

        // Save all constraints
        await SaveConstraintsToProjectAsync(projectId, constraints, cancellationToken);

        _logger.LogInformation("Constraint saved: {ConstraintId}", constraint.Id);
    }

    public async Task<bool> DeleteConstraintAsync(string projectId, string constraintId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Deleting constraint: {ConstraintId} from project: {ProjectId}", constraintId, projectId);

        var constraints = await LoadConstraintsFromProjectAsync(projectId, cancellationToken);
        var countBefore = constraints.Count;
        
        constraints.RemoveAll(c => c.Id == constraintId);
        
        if (constraints.Count < countBefore)
        {
            await SaveConstraintsToProjectAsync(projectId, constraints, cancellationToken);
            _logger.LogInformation("Constraint deleted: {ConstraintId}", constraintId);
            return true;
        }

        _logger.LogDebug("Constraint not found: {ConstraintId}", constraintId);
        return false;
    }

    private async Task<List<TerminologyConstraint>> LoadConstraintsFromProjectAsync(string projectId, CancellationToken cancellationToken)
    {
        var filePath = GetConstraintsFilePath(projectId);

        if (!File.Exists(filePath))
        {
            _logger.LogDebug("Constraints file does not exist for project: {ProjectId}", projectId);
            return new List<TerminologyConstraint>();
        }

        try
        {
            var json = await File.ReadAllTextAsync(filePath, cancellationToken);
            var constraints = JsonSerializer.Deserialize<List<TerminologyConstraint>>(json, _jsonOptions);
            
            _logger.LogDebug("Loaded {Count} constraints from file", constraints?.Count ?? 0);
            return constraints ?? new List<TerminologyConstraint>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load constraints from file: {FilePath}", filePath);
            return new List<TerminologyConstraint>();
        }
    }

    private async Task SaveConstraintsToProjectAsync(string projectId, List<TerminologyConstraint> constraints, CancellationToken cancellationToken)
    {
        var filePath = GetConstraintsFilePath(projectId);
        var directory = Path.GetDirectoryName(filePath);
        
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var json = JsonSerializer.Serialize(constraints, _jsonOptions);
        await File.WriteAllTextAsync(filePath, json, cancellationToken);

        _logger.LogDebug("Saved {Count} constraints to file: {FilePath}", constraints.Count, filePath);
    }

    private string GetConstraintsFilePath(string projectId)
    {
        return Path.Combine(_baseDataPath, projectId, "constraints", "terminology-constraints.json");
    }
}
