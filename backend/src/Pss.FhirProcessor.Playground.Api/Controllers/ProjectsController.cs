using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Playground.Api.Models;
using Pss.FhirProcessor.Playground.Api.Services;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(
        IProjectService projectService,
        ILogger<ProjectsController> logger)
    {
        _projectService = projectService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new project
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Project>> CreateProject([FromBody] CreateProjectRequest request)
    {
        try
        {
            var project = await _projectService.CreateProjectAsync(
                request.Name, 
                request.Description, 
                request.FhirVersion);
            
            return CreatedAtAction(nameof(GetProject), new { id = project.Id }, project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating project");
            return StatusCode(500, new { error = "Failed to create project", message = ex.Message });
        }
    }

    /// <summary>
    /// List all projects
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectMetadata>>> ListProjects()
    {
        try
        {
            var projects = await _projectService.ListProjectsAsync();
            return Ok(projects);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing projects");
            return StatusCode(500, new { error = "Failed to list projects", message = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific project by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<Project>> GetProject(Guid id)
    {
        try
        {
            var project = await _projectService.GetProjectAsync(id);
            
            if (project == null)
                return NotFound(new { error = "Project not found", projectId = id });
            
            return Ok(project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to get project", message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a project
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteProject(Guid id)
    {
        try
        {
            var deleted = await _projectService.DeleteProjectAsync(id);
            
            if (!deleted)
                return NotFound(new { error = "Project not found", projectId = id });
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to delete project", message = ex.Message });
        }
    }

    /// <summary>
    /// Update rules for a project
    /// </summary>
    [HttpPost("{id}/rules")]
    public async Task<ActionResult<Project>> UpdateRules(Guid id, [FromBody] SaveRuleRequest request)
    {
        try
        {
            var project = await _projectService.UpdateRulesAsync(id, request.RulesJson);
            return Ok(project);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating rules for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to update rules", message = ex.Message });
        }
    }

    /// <summary>
    /// Update CodeMaster for a project
    /// </summary>
    [HttpPost("{id}/codemaster")]
    public async Task<ActionResult<Project>> UpdateCodeMaster(Guid id, [FromBody] SaveCodeMasterRequest request)
    {
        try
        {
            var project = await _projectService.UpdateCodeMasterAsync(id, request.CodeMasterJson);
            return Ok(project);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating CodeMaster for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to update CodeMaster", message = ex.Message });
        }
    }

    /// <summary>
    /// Update sample bundle for a project
    /// </summary>
    [HttpPost("{id}/bundle")]
    public async Task<ActionResult<Project>> UpdateSampleBundle(Guid id, [FromBody] SaveBundleRequest request)
    {
        try
        {
            var project = await _projectService.UpdateSampleBundleAsync(id, request.BundleJson);
            return Ok(project);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating sample bundle for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to update sample bundle", message = ex.Message });
        }
    }

    /// <summary>
    /// Update validation settings for a project (runtime configuration, separate from rules)
    /// </summary>
    [HttpPost("{id}/validation-settings")]
    public async Task<ActionResult<Project>> UpdateValidationSettings(Guid id, [FromBody] SaveValidationSettingsRequest request)
    {
        try
        {
            var project = await _projectService.UpdateValidationSettingsAsync(id, request.ValidationSettingsJson);
            return Ok(project);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating validation settings for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to update validation settings", message = ex.Message });
        }
    }

    /// <summary>
    /// Export rule package (rules + codemaster) for external teams
    /// </summary>
    [HttpGet("{id}/export")]
    public async Task<ActionResult> ExportRulePackage(Guid id)
    {
        try
        {
            var package = await _projectService.ExportRulePackageAsync(id);
            return Ok(package);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting rule package for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to export rule package", message = ex.Message });
        }
    }

    /// <summary>
    /// Validate a project using the Engine
    /// </summary>
    [HttpPost("{id}/validate")]
    public async Task<ActionResult> ValidateProject(Guid id, [FromBody] ValidateProjectRequest? request = null)
    {
        try
        {
            var result = await _projectService.ValidateProjectAsync(id, request?.BundleJson, request?.ValidationMode);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating project {ProjectId}", id);
            return StatusCode(500, new { error = "Validation failed", message = ex.Message });
        }
    }
}
