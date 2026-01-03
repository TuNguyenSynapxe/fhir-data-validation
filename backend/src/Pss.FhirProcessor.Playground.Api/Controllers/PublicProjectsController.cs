using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Persistence.Repositories;
using Pss.FhirProcessor.Playground.Api.Dtos.Validation;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// MVP Controller for published project listing and project-based validation.
/// Separate from authoring ProjectsController to maintain clean separation of concerns.
/// </summary>
[ApiController]
[Route("api/public/projects")]
public class PublicProjectsController : ControllerBase
{
    private readonly IProjectRepository _projectRepository;
    private readonly IValidationPipeline _validationPipeline;
    private readonly ILogger<PublicProjectsController> _logger;

    public PublicProjectsController(
        IProjectRepository projectRepository,
        IValidationPipeline validationPipeline,
        ILogger<PublicProjectsController> logger)
    {
        _projectRepository = projectRepository;
        _validationPipeline = validationPipeline;
        _logger = logger;
    }

    /// <summary>
    /// List all published validation projects.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of published projects</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPublishedProjects(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Listing published projects");

            var projects = await _projectRepository.ListPublishedAsync(cancellationToken);

            var projectDtos = projects.Select(p => new ProjectSummaryDto
            {
                Id = p.Id,
                Slug = p.Slug,
                Name = p.Name,
                Description = p.Description,
                Status = p.Status,
                PublishedAt = p.PublishedAt
            }).ToList();

            _logger.LogInformation("Found {Count} published projects", projectDtos.Count);

            return Ok(projectDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list published projects");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to list projects", message = ex.Message });
        }
    }

    /// <summary>
    /// Get details of a specific published project (by slug).
    /// </summary>
    /// <param name="slug">Project slug</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Project details</returns>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(ProjectDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPublishedProject(string slug, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Getting published project details: Slug={Slug}", slug);

            var project = await _projectRepository.GetPublishedBySlugAsync(slug, cancellationToken);

            if (project == null)
            {
                _logger.LogWarning("Published project not found: Slug={Slug}", slug);
                return NotFound(new { error = "Published project not found", slug });
            }

            // Deserialize ruleset to extract metadata (do NOT pass raw ruleset to client)
            ProjectRulesetMetadata? metadata = null;
            if (!string.IsNullOrWhiteSpace(project.RulesetJson))
            {
                try
                {
                    var ruleset = JsonSerializer.Deserialize<RuleSet>(
                        project.RulesetJson,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (ruleset != null)
                    {
                        metadata = new ProjectRulesetMetadata
                        {
                            RuleCount = ruleset.Rules?.Count ?? 0,
                            CodeSystemCount = ruleset.CodeSystems?.Count ?? 0,
                            FhirVersion = ruleset.FhirVersion ?? "R4"
                        };
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to parse ruleset JSON for metadata: ProjectSlug={Slug}", slug);
                }
            }

            var projectDto = new ProjectDetailDto
            {
                Id = project.Id,
                Slug = project.Slug,
                Name = project.Name,
                Description = project.Description,
                Status = project.Status,
                CreatedAt = project.CreatedAt,
                PublishedAt = project.PublishedAt,
                RulesetMetadata = metadata
            };

            return Ok(projectDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get published project details: Slug={Slug}", slug);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to get project", message = ex.Message });
        }
    }

    /// <summary>
    /// Validate a FHIR Bundle using a published project's ruleset.
    /// This is the main MVP endpoint for project-based validation.
    /// </summary>
    /// <param name="slug">Project slug</param>
    /// <param name="request">Validation request containing bundle JSON</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Validation result</returns>
    [HttpPost("{slug}/validate")]
    [ProducesResponseType(typeof(ValidateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ValidateWithPublishedProject(
        string slug,
        [FromBody] ValidateRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.BundleJson))
        {
            return BadRequest(new { error = "BundleJson is required" });
        }

        try
        {
            _logger.LogInformation(
                "Project validation requested: Slug={Slug}, FhirVersion={FhirVersion}, Mode={ValidationMode}",
                slug,
                request.FhirVersion,
                request.ValidationMode);

            // Load published project from persistence layer (API layer responsibility)
            var project = await _projectRepository.GetPublishedBySlugAsync(slug, cancellationToken);

            if (project == null)
            {
                _logger.LogWarning("Published project not found for validation: Slug={Slug}", slug);
                return NotFound(new { error = "Published project not found", slug });
            }

            // Deserialize ruleset JSON into engine model (API layer responsibility)
            // ⚠️ Persistence layer treats RulesetJson as opaque - deserialization happens HERE
            RuleSet? ruleset = null;
            if (!string.IsNullOrWhiteSpace(project.RulesetJson))
            {
                try
                {
                    ruleset = JsonSerializer.Deserialize<RuleSet>(
                        project.RulesetJson,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    _logger.LogInformation(
                        "Loaded ruleset for project: Slug={Slug}, Rules={RuleCount}, CodeSystems={CodeSystemCount}",
                        slug,
                        ruleset?.Rules?.Count ?? 0,
                        ruleset?.CodeSystems?.Count ?? 0);
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Failed to deserialize ruleset JSON: ProjectSlug={Slug}", slug);
                    return BadRequest(new { error = "Invalid ruleset JSON in project", slug });
                }
            }

            // Serialize ruleset to JSON strings for engine (API layer responsibility)
            string? rulesJson = null;
            string? codeSystemsJson = null;

            if (ruleset != null)
            {
                // Serialize rules array
                if (ruleset.Rules?.Count > 0)
                {
                    rulesJson = JsonSerializer.Serialize(ruleset.Rules);
                }

                // Serialize code systems array
                if (ruleset.CodeSystems?.Count > 0)
                {
                    codeSystemsJson = JsonSerializer.Serialize(ruleset.CodeSystems);
                }
            }

            // Build validation request for engine (explicit string-based input)
            var engineRequest = new ValidationRequest
            {
                BundleJson = request.BundleJson,
                FhirVersion = request.FhirVersion,
                ValidationMode = request.ValidationMode,
                RulesJson = rulesJson, // ✅ Pass serialized rules as JSON string
                CodeSystemsJson = codeSystemsJson // ✅ Pass serialized code systems as JSON string
            };

            // Execute validation through engine (engine has NO database access)
            var engineResponse = await _validationPipeline.ValidateAsync(engineRequest, cancellationToken);

            // Build response DTO
            var response = new ValidateResponse
            {
                IsValid = engineResponse.Summary.TotalErrors == 0,
                EngineResponse = engineResponse
            };

            _logger.LogInformation(
                "Project validation completed: Slug={Slug}, IsValid={IsValid}, Errors={ErrorCount}, Warnings={WarningCount}",
                slug,
                response.IsValid,
                engineResponse.Summary.TotalErrors,
                engineResponse.Summary.WarningCount);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Project validation failed: Slug={Slug}", slug);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Validation failed", message = ex.Message });
        }
    }
}
