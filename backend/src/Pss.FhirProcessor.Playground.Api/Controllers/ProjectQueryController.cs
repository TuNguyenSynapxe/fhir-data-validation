using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Application.Projects.Queries;
using Pss.FhirProcessor.Playground.Api.Dtos;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// Phase 7.4: Read-only HTTP API for imported projects.
/// NO validation execution, NO mutations, NO business logic.
/// </summary>
[ApiController]
[Route("api/v2/projects")]
public class ProjectQueryController : ControllerBase
{
    private readonly ProjectQueryService _projectQueryService;
    private readonly ProjectArtifactQueryService _artifactQueryService;
    private readonly ProjectBundleQueryService _bundleQueryService;
    private readonly ProjectRuleQueryService _ruleQueryService;
    private readonly ILogger<ProjectQueryController> _logger;

    public ProjectQueryController(
        ProjectQueryService projectQueryService,
        ProjectArtifactQueryService artifactQueryService,
        ProjectBundleQueryService bundleQueryService,
        ProjectRuleQueryService ruleQueryService,
        ILogger<ProjectQueryController> logger)
    {
        _projectQueryService = projectQueryService;
        _artifactQueryService = artifactQueryService;
        _bundleQueryService = bundleQueryService;
        _ruleQueryService = ruleQueryService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/projects
    /// List all imported projects (demo-scale, no pagination).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ProjectListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllProjects(CancellationToken cancellationToken)
    {
        try
        {
            var projects = await _projectQueryService.GetAllProjectsAsync(cancellationToken);

            var dtos = projects.Select(p => new ProjectListItemDto
            {
                ProjectId = p.ProjectId,
                Name = p.Name,
                IsPublicEnabled = p.IsPublicEnabled,
                ArtifactCount = p.ArtifactCount,
                BundleCount = p.BundleCount,
                RuleCount = p.RuleCount,
                CreatedAt = p.CreatedAt
            }).ToList();

            _logger.LogInformation("Returned {Count} projects", dtos.Count);
            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve projects");
            return StatusCode(500, new { error = "QUERY_ERROR", message = "Failed to retrieve projects" });
        }
    }

    /// <summary>
    /// GET /api/projects/{projectId}
    /// Get project details with counts.
    /// </summary>
    [HttpGet("{projectId:guid}")]
    [ProducesResponseType(typeof(ProjectDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectDetails(Guid projectId, CancellationToken cancellationToken)
    {
        try
        {
            var project = await _projectQueryService.GetProjectDetailsAsync(projectId, cancellationToken);

            if (project == null)
            {
                _logger.LogWarning("Project {ProjectId} not found", projectId);
                return NotFound(new { error = "PROJECT_NOT_FOUND", message = $"Project {projectId} not found" });
            }

            var dto = new ProjectDetailsDto
            {
                ProjectId = project.ProjectId,
                Name = project.Name,
                IsPublicEnabled = project.IsPublicEnabled,
                CreatedAt = project.CreatedAt,
                Counts = new ProjectCountsDto
                {
                    ArtifactCount = project.Counts.ArtifactCount,
                    BundleCount = project.Counts.BundleCount,
                    RuleCount = project.Counts.RuleCount
                }
            };

            _logger.LogInformation("Returned project details for {ProjectId}", projectId);
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve project {ProjectId}", projectId);
            return StatusCode(500, new { error = "QUERY_ERROR", message = "Failed to retrieve project details" });
        }
    }

    /// <summary>
    /// GET /api/projects/{projectId}/artifacts
    /// Get all artifacts for a project (metadata only, no JSON content).
    /// </summary>
    [HttpGet("{projectId:guid}/artifacts")]
    [ProducesResponseType(typeof(List<ProjectArtifactDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectArtifacts(Guid projectId, CancellationToken cancellationToken)
    {
        try
        {
            // Check project exists
            if (!await _projectQueryService.ProjectExistsAsync(projectId, cancellationToken))
            {
                _logger.LogWarning("Project {ProjectId} not found", projectId);
                return NotFound(new { error = "PROJECT_NOT_FOUND", message = $"Project {projectId} not found" });
            }

            var artifacts = await _artifactQueryService.GetProjectArtifactsAsync(projectId, cancellationToken);

            var dtos = artifacts.Select(a => new ProjectArtifactDto
            {
                ArtifactId = a.ArtifactId,
                ArtifactType = a.ArtifactType,
                ResourceType = a.ResourceType,
                FileName = a.FileName,
                FilePath = a.FilePath,
                CanonicalUrl = a.CanonicalUrl,
                Hash = a.Hash
            }).ToList();

            _logger.LogInformation("Returned {Count} artifacts for project {ProjectId}", dtos.Count, projectId);
            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve artifacts for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "QUERY_ERROR", message = "Failed to retrieve artifacts" });
        }
    }

    /// <summary>
    /// GET /api/projects/{projectId}/bundles
    /// Get all bundles for a project (metadata only, no JSON content).
    /// </summary>
    [HttpGet("{projectId:guid}/bundles")]
    [ProducesResponseType(typeof(List<ProjectBundleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectBundles(Guid projectId, CancellationToken cancellationToken)
    {
        try
        {
            // Check project exists
            if (!await _projectQueryService.ProjectExistsAsync(projectId, cancellationToken))
            {
                _logger.LogWarning("Project {ProjectId} not found", projectId);
                return NotFound(new { error = "PROJECT_NOT_FOUND", message = $"Project {projectId} not found" });
            }

            var bundles = await _bundleQueryService.GetProjectBundlesAsync(projectId, cancellationToken);

            var dtos = bundles.Select(b => new ProjectBundleDto
            {
                BundleId = b.BundleId,
                Name = b.Name,
                Source = b.Source,
                CreatedAt = b.CreatedAt
            }).ToList();

            _logger.LogInformation("Returned {Count} bundles for project {ProjectId}", dtos.Count, projectId);
            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve bundles for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "QUERY_ERROR", message = "Failed to retrieve bundles" });
        }
    }

    /// <summary>
    /// GET /api/projects/{projectId}/rules
    /// Get all rules for a project (metadata only, provenance visible).
    /// </summary>
    [HttpGet("{projectId:guid}/rules")]
    [ProducesResponseType(typeof(List<ProjectRuleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectRules(Guid projectId, CancellationToken cancellationToken)
    {
        try
        {
            // Check project exists
            if (!await _projectQueryService.ProjectExistsAsync(projectId, cancellationToken))
            {
                _logger.LogWarning("Project {ProjectId} not found", projectId);
                return NotFound(new { error = "PROJECT_NOT_FOUND", message = $"Project {projectId} not found" });
            }

            var rules = await _ruleQueryService.GetProjectRulesAsync(projectId, cancellationToken);

            var dtos = rules.Select(r => new ProjectRuleDto
            {
                RuleId = r.RuleId,
                Scope = r.Scope,
                BundleId = r.BundleId,
                RuleType = r.RuleType,
                Provenance = r.Provenance,
                Title = r.Title,
                IsEnabled = r.IsEnabled
            }).ToList();

            _logger.LogInformation("Returned {Count} rules for project {ProjectId}", dtos.Count, projectId);
            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve rules for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "QUERY_ERROR", message = "Failed to retrieve rules" });
        }
    }
}
