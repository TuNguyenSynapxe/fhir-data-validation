using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Playground.Api.Models;

namespace Pss.FhirProcessor.Playground.Api.Services;

/// <summary>
/// Service interface for project management
/// </summary>
public interface IProjectService
{
    Task<Project> CreateProjectAsync(string name, string? description, string fhirVersion);
    Task<Project?> GetProjectAsync(Guid id);
    Task<IEnumerable<ProjectMetadata>> ListProjectsAsync();
    Task<bool> DeleteProjectAsync(Guid id);
    
    Task<Project> UpdateRulesAsync(Guid id, string rulesJson);
    Task<Project> UpdateCodeMasterAsync(Guid id, string codeMasterJson);
    Task<Project> UpdateSampleBundleAsync(Guid id, string bundleJson);
    Task<Project> UpdateValidationSettingsAsync(Guid id, string validationSettingsJson);
    
    Task<object> ExportRulePackageAsync(Guid id);
    Task<ValidationResponse> ValidateProjectAsync(Guid id, string? bundleJsonOverride = null, string? validationMode = null);
}
