using System.Text.Json;
using Pss.FhirProcessor.Playground.Api.Models;

namespace Pss.FhirProcessor.Playground.Api.Storage;

/// <summary>
/// File-based repository implementation for projects
/// Uses local file system for lightweight POC storage
/// </summary>
public class ProjectRepository : IProjectRepository
{
    private readonly string _storageDirectory;
    private readonly ILogger<ProjectRepository> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    public ProjectRepository(ILogger<ProjectRepository> logger)
    {
        _logger = logger;
        _storageDirectory = Path.Combine(Directory.GetCurrentDirectory(), "ProjectStorage");
        
        // Ensure storage directory exists
        if (!Directory.Exists(_storageDirectory))
        {
            Directory.CreateDirectory(_storageDirectory);
            _logger.LogInformation("Created project storage directory: {Directory}", _storageDirectory);
        }
    }

    public async Task<Project> CreateAsync(Project project)
    {
        project.Id = Guid.NewGuid();
        project.CreatedAt = DateTime.UtcNow;
        project.UpdatedAt = DateTime.UtcNow;
        
        var filePath = GetProjectFilePath(project.Id);
        var json = JsonSerializer.Serialize(project, JsonOptions);
        await File.WriteAllTextAsync(filePath, json);
        
        _logger.LogInformation("Created project {ProjectId} at {Path}", project.Id, filePath);
        return project;
    }

    public async Task<Project?> GetAsync(Guid id)
    {
        var filePath = GetProjectFilePath(id);
        
        if (!File.Exists(filePath))
        {
            _logger.LogWarning("Project {ProjectId} not found", id);
            return null;
        }
        
        var json = await File.ReadAllTextAsync(filePath);
        var project = JsonSerializer.Deserialize<Project>(json);
        
        return project;
    }

    public async Task<IEnumerable<ProjectMetadata>> ListAsync()
    {
        var projectFiles = Directory.GetFiles(_storageDirectory, "*.json");
        var metadataList = new List<ProjectMetadata>();
        
        foreach (var file in projectFiles)
        {
            try
            {
                var json = await File.ReadAllTextAsync(file);
                var project = JsonSerializer.Deserialize<Project>(json);
                
                if (project != null)
                {
                    metadataList.Add(new ProjectMetadata
                    {
                        Id = project.Id,
                        Name = project.Name,
                        Description = project.Description,
                        FhirVersion = project.FhirVersion,
                        CreatedAt = project.CreatedAt,
                        UpdatedAt = project.UpdatedAt,
                        HasRules = !string.IsNullOrEmpty(project.RulesJson),
                        HasCodeMaster = !string.IsNullOrEmpty(project.CodeMasterJson),
                        HasSampleBundle = !string.IsNullOrEmpty(project.SampleBundleJson)
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading project file {File}", file);
            }
        }
        
        return metadataList.OrderByDescending(p => p.UpdatedAt);
    }

    public async Task<Project> SaveRulesAsync(Guid id, string rulesJson)
    {
        var project = await GetAsync(id);
        if (project == null)
            throw new InvalidOperationException($"Project {id} not found");
        
        project.RulesJson = rulesJson;
        project.UpdatedAt = DateTime.UtcNow;
        
        await SaveProjectAsync(project);
        return project;
    }

    public async Task<Project> SaveCodeMasterAsync(Guid id, string codeMasterJson)
    {
        var project = await GetAsync(id);
        if (project == null)
            throw new InvalidOperationException($"Project {id} not found");
        
        project.CodeMasterJson = codeMasterJson;
        project.UpdatedAt = DateTime.UtcNow;
        
        await SaveProjectAsync(project);
        return project;
    }

    public async Task<Project> SaveSampleBundleAsync(Guid id, string bundleJson)
    {
        var project = await GetAsync(id);
        if (project == null)
            throw new InvalidOperationException($"Project {id} not found");
        
        project.SampleBundleJson = bundleJson;
        project.UpdatedAt = DateTime.UtcNow;
        
        await SaveProjectAsync(project);
        return project;
    }

    public async Task<Project> SaveValidationSettingsAsync(Guid id, string validationSettingsJson)
    {
        var project = await GetAsync(id);
        if (project == null)
            throw new InvalidOperationException($"Project {id} not found");
        
        project.ValidationSettingsJson = validationSettingsJson;
        project.UpdatedAt = DateTime.UtcNow;
        
        await SaveProjectAsync(project);
        return project;
    }

    public Task<bool> DeleteAsync(Guid id)
    {
        var filePath = GetProjectFilePath(id);
        
        if (!File.Exists(filePath))
        {
            _logger.LogWarning("Project {ProjectId} not found for deletion", id);
            return Task.FromResult(false);
        }
        
        File.Delete(filePath);
        _logger.LogInformation("Deleted project {ProjectId}", id);
        return Task.FromResult(true);
    }

    public Task<bool> ExistsAsync(Guid id)
    {
        var filePath = GetProjectFilePath(id);
        return Task.FromResult(File.Exists(filePath));
    }

    private async Task SaveProjectAsync(Project project)
    {
        var filePath = GetProjectFilePath(project.Id);
        var json = JsonSerializer.Serialize(project, JsonOptions);
        await File.WriteAllTextAsync(filePath, json);
        
        _logger.LogInformation("Saved project {ProjectId}", project.Id);
    }

    private string GetProjectFilePath(Guid id)
    {
        return Path.Combine(_storageDirectory, $"{id}.json");
    }
}
