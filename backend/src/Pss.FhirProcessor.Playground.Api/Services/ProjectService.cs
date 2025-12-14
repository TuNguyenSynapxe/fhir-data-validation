using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Playground.Api.Models;
using Pss.FhirProcessor.Playground.Api.Storage;

namespace Pss.FhirProcessor.Playground.Api.Services;

/// <summary>
/// Service for managing validation projects
/// Coordinates between repository and validation engine
/// </summary>
public class ProjectService : IProjectService
{
    private readonly IProjectRepository _repository;
    private readonly IValidationPipeline _validationPipeline;
    private readonly ILogger<ProjectService> _logger;

    public ProjectService(
        IProjectRepository repository,
        IValidationPipeline validationPipeline,
        ILogger<ProjectService> logger)
    {
        _repository = repository;
        _validationPipeline = validationPipeline;
        _logger = logger;
    }

    public async Task<Project> CreateProjectAsync(string name, string? description, string fhirVersion)
    {
        var project = new Project
        {
            Name = name,
            Description = description,
            FhirVersion = fhirVersion
        };
        
        var created = await _repository.CreateAsync(project);
        _logger.LogInformation("Created project {ProjectId} with name {Name}", created.Id, created.Name);
        
        return created;
    }

    public async Task<Project?> GetProjectAsync(Guid id)
    {
        return await _repository.GetAsync(id);
    }

    public async Task<IEnumerable<ProjectMetadata>> ListProjectsAsync()
    {
        return await _repository.ListAsync();
    }

    public async Task<bool> DeleteProjectAsync(Guid id)
    {
        var deleted = await _repository.DeleteAsync(id);
        
        if (deleted)
        {
            _logger.LogInformation("Deleted project {ProjectId}", id);
        }
        
        return deleted;
    }

    public async Task<Project> UpdateRulesAsync(Guid id, string rulesJson)
    {
        var project = await _repository.SaveRulesAsync(id, rulesJson);
        _logger.LogInformation("Updated rules for project {ProjectId}", id);
        
        return project;
    }

    public async Task<Project> UpdateCodeMasterAsync(Guid id, string codeMasterJson)
    {
        var project = await _repository.SaveCodeMasterAsync(id, codeMasterJson);
        _logger.LogInformation("Updated CodeMaster for project {ProjectId}", id);
        
        return project;
    }

    public async Task<Project> UpdateSampleBundleAsync(Guid id, string bundleJson)
    {
        var project = await _repository.SaveSampleBundleAsync(id, bundleJson);
        _logger.LogInformation("Updated sample bundle for project {ProjectId}", id);
        
        return project;
    }

    public async Task<object> ExportRulePackageAsync(Guid id)
    {
        var project = await _repository.GetAsync(id);
        
        if (project == null)
            throw new InvalidOperationException($"Project {id} not found");
        
        var package = new
        {
            projectId = project.Id,
            projectName = project.Name,
            fhirVersion = project.FhirVersion,
            exportedAt = DateTime.UtcNow,
            rules = project.RulesJson,
            codeMaster = project.CodeMasterJson
        };
        
        _logger.LogInformation("Exported rule package for project {ProjectId}", id);
        
        return package;
    }

    public async Task<ValidationResponse> ValidateProjectAsync(Guid id, string? bundleJsonOverride = null, string? validationMode = null)
    {
        var project = await _repository.GetAsync(id);
        
        if (project == null)
            throw new InvalidOperationException($"Project {id} not found");
        
        // Use override bundle if provided, otherwise use project's sample bundle
        var bundleJson = bundleJsonOverride ?? project.SampleBundleJson;
        
        _logger.LogInformation("Validating project {ProjectId}, bundleJson length: {Length}, override: {Override}, mode: {ValidationMode}", 
            id, bundleJson?.Length ?? 0, bundleJsonOverride != null, validationMode ?? "default");
        
        if (string.IsNullOrEmpty(bundleJson))
        {
            _logger.LogWarning("No bundle JSON for project {ProjectId}. SampleBundleJson is null or empty.", id);
            throw new InvalidOperationException("No bundle JSON provided for validation");
        }
        
        // Build validation request
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            RulesJson = project.RulesJson,
            CodeMasterJson = project.CodeMasterJson,
            FhirVersion = project.FhirVersion,
            ValidationMode = validationMode
        };
        
        _logger.LogInformation("Validating project {ProjectId} with bundle of {Length} chars", id, bundleJson.Length);
        
        // Call the Engine for validation
        var result = await _validationPipeline.ValidateAsync(request);
        
        _logger.LogInformation("Validation complete for project {ProjectId}: {ErrorCount} errors", 
            id, result.Summary.TotalErrors);
        
        return result;
    }
}
