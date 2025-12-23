using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Playground.Api.Models;
using Pss.FhirProcessor.Playground.Api.Services;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly IRuleService _ruleService;
    private readonly IRuleAdvisoryService? _ruleAdvisoryService;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(
        IProjectService projectService,
        IRuleService ruleService,
        ILogger<ProjectsController> logger,
        IRuleAdvisoryService? ruleAdvisoryService = null)
    {
        _projectService = projectService;
        _ruleService = ruleService;
        _ruleAdvisoryService = ruleAdvisoryService;
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

    /// <summary>
    /// Get observed terminology values from project's sample bundle
    /// </summary>
    [HttpGet("{id}/terminology/observed")]
    public async Task<ActionResult<ObservedTerminologyResponse>> GetObservedTerminology(Guid id)
    {
        try
        {
            var result = await _ruleService.GetObservedTerminologyAsync(id);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting observed terminology for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to get observed terminology", message = ex.Message });
        }
    }

    /// <summary>
    /// Create rules in bulk from intents
    /// </summary>
    [HttpPost("{id}/rules/bulk")]
    public async Task<ActionResult<BulkCreateRulesResponse>> BulkCreateRules(Guid id, [FromBody] BulkCreateRulesRequest request)
    {
        try
        {
            var result = await _ruleService.BulkCreateRulesAsync(id, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk creating rules for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to bulk create rules", message = ex.Message });
        }
    }

    /// <summary>
    /// Update feature flags for a project (admin only)
    /// </summary>
    [HttpPatch("{id}/features")]
    public async Task<ActionResult<Project>> UpdateFeatures(Guid id, [FromBody] UpdateFeaturesRequest request)
    {
        try
        {
            var project = await _projectService.UpdateFeaturesAsync(id, request);
            return Ok(project);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating features for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to update features", message = ex.Message });
        }
    }

    /// <summary>
    /// Get terminology rule advisories for a project
    /// Returns dynamically generated advisories about potential issues in terminology authoring
    /// (e.g., broken code references, missing displays, duplicate codes)
    /// </summary>
    [HttpGet("{id}/terminology/advisories")]
    public async Task<IActionResult> GetTerminologyAdvisories(Guid id)
    {
        try
        {
            if (_ruleAdvisoryService == null)
            {
                return StatusCode(501, new { error = "Terminology advisory service is not configured" });
            }

            // Verify project exists
            var project = await _projectService.GetProjectAsync(id);
            if (project == null)
            {
                return NotFound(new { error = "Project not found" });
            }

            _logger.LogInformation("Generating terminology advisories for project {ProjectId}", id);

            // Generate advisories (non-blocking, read-only operation)
            var advisories = await _ruleAdvisoryService.GenerateAdvisoriesAsync(
                id.ToString(), 
                HttpContext.RequestAborted);

            return Ok(new
            {
                projectId = id,
                advisoryCount = advisories.Count,
                advisories = advisories,
                generatedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating terminology advisories for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to generate advisories", message = ex.Message });
        }
    }
}
