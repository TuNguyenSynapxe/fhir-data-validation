using Pss.FhirProcessor.Playground.Api.Models;

namespace Pss.FhirProcessor.Playground.Api.Storage;

/// <summary>
/// Repository interface for Project persistence
/// </summary>
public interface IProjectRepository
{
    Task<Project> CreateAsync(Project project);
    Task<Project?> GetAsync(Guid id);
    Task<IEnumerable<ProjectMetadata>> ListAsync();
    Task<Project> UpdateAsync(Project project);
    Task<Project> SaveRulesAsync(Guid id, string rulesJson);
    Task<Project> SaveCodeMasterAsync(Guid id, string codeMasterJson);
    Task<Project> SaveSampleBundleAsync(Guid id, string bundleJson);
    Task<Project> SaveValidationSettingsAsync(Guid id, string validationSettingsJson);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> ExistsAsync(Guid id);
}
