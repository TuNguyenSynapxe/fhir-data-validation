using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Application.Projects.Commands;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// Phase 9.4: CRUD API for bundle-scoped manual rules (ManualCustom only).
/// ImportedGenerated rules are READ-ONLY (managed via Phase 7.2 import).
/// </summary>
[ApiController]
[Route("api/v2/projects/{projectId:guid}/bundles/{bundleId:guid}/rules")]
public class ProjectRuleManagementController : ControllerBase
{
    private readonly ProjectRuleCommandService _ruleCommandService;
    private readonly ILogger<ProjectRuleManagementController> _logger;

    public ProjectRuleManagementController(
        ProjectRuleCommandService ruleCommandService,
        ILogger<ProjectRuleManagementController> logger)
    {
        _ruleCommandService = ruleCommandService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/v2/projects/{projectId}/bundles/{bundleId}/rules
    /// Get all rules for a specific bundle (imported + manual, with full details).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<BundleRuleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBundleRules(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken)
    {
        try
        {
            var rules = await _ruleCommandService.GetBundleRulesAsync(projectId, bundleId, cancellationToken);

            var dtos = rules.Select(r => new BundleRuleDto
            {
                RuleId = r.RuleId,
                RuleType = r.RuleType,
                Provenance = r.Provenance,
                Title = r.Title,
                Description = r.Description,
                FhirPathExpression = r.FhirPathExpression,
                IsEnabled = r.IsEnabled,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            }).ToList();

            _logger.LogInformation(
                "Returned {Count} rules for bundle {BundleId} in project {ProjectId}",
                dtos.Count, bundleId, projectId);

            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve rules for bundle {BundleId}", bundleId);
            return StatusCode(500, new { error = "QUERY_ERROR", message = "Failed to retrieve bundle rules" });
        }
    }

    /// <summary>
    /// POST /api/v2/projects/{projectId}/bundles/{bundleId}/rules
    /// Create a new bundle-scoped manual rule.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(CreateRuleResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateBundleRule(
        Guid projectId,
        Guid bundleId,
        [FromBody] CreateBundleRuleDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Title is required" });
        }

        if (string.IsNullOrWhiteSpace(request.FhirPathExpression))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "FHIRPath expression is required" });
        }

        try
        {
            var commandRequest = new CreateBundleRuleRequest
            {
                Title = request.Title,
                Description = request.Description,
                FhirPathExpression = request.FhirPathExpression,
                IsEnabled = request.IsEnabled
            };

            var ruleId = await _ruleCommandService.CreateBundleRuleAsync(
                projectId,
                bundleId,
                commandRequest,
                cancellationToken);

            _logger.LogInformation(
                "Created manual rule {RuleId} for bundle {BundleId} in project {ProjectId}",
                ruleId, bundleId, projectId);

            var response = new CreateRuleResponse
            {
                RuleId = ruleId,
                Message = "Rule created successfully"
            };

            return CreatedAtAction(
                nameof(GetBundleRules),
                new { projectId, bundleId },
                response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to create rule: {Message}", ex.Message);
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create rule for bundle {BundleId}", bundleId);
            return StatusCode(500, new { error = "CREATE_ERROR", message = "Failed to create rule" });
        }
    }

    /// <summary>
    /// PUT /api/v2/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}
    /// Update an existing bundle-scoped manual rule.
    /// FORBIDDEN: Editing ImportedGenerated rules (returns 403).
    /// </summary>
    [HttpPut("{ruleId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateBundleRule(
        Guid projectId,
        Guid bundleId,
        Guid ruleId,
        [FromBody] UpdateBundleRuleDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Title is required" });
        }

        if (string.IsNullOrWhiteSpace(request.FhirPathExpression))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "FHIRPath expression is required" });
        }

        try
        {
            var commandRequest = new UpdateBundleRuleRequest
            {
                Title = request.Title,
                Description = request.Description,
                FhirPathExpression = request.FhirPathExpression,
                IsEnabled = request.IsEnabled
            };

            await _ruleCommandService.UpdateBundleRuleAsync(
                projectId,
                bundleId,
                ruleId,
                commandRequest,
                cancellationToken);

            _logger.LogInformation(
                "Updated manual rule {RuleId} for bundle {BundleId} in project {ProjectId}",
                ruleId, bundleId, projectId);

            return NoContent();
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Cannot edit imported rules"))
        {
            _logger.LogWarning(ex, "Attempted to edit imported rule {RuleId}", ruleId);
            return StatusCode(403, new
            {
                error = "FORBIDDEN",
                message = "Cannot edit imported rules. Only custom manual rules can be modified."
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to update rule: {Message}", ex.Message);
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update rule {RuleId}", ruleId);
            return StatusCode(500, new { error = "UPDATE_ERROR", message = "Failed to update rule" });
        }
    }

    /// <summary>
    /// DELETE /api/v2/projects/{projectId}/bundles/{bundleId}/rules/{ruleId}
    /// Delete a bundle-scoped manual rule.
    /// FORBIDDEN: Deleting ImportedGenerated rules (returns 403).
    /// </summary>
    [HttpDelete("{ruleId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBundleRule(
        Guid projectId,
        Guid bundleId,
        Guid ruleId,
        CancellationToken cancellationToken)
    {
        try
        {
            await _ruleCommandService.DeleteBundleRuleAsync(
                projectId,
                bundleId,
                ruleId,
                cancellationToken);

            _logger.LogInformation(
                "Deleted manual rule {RuleId} from bundle {BundleId} in project {ProjectId}",
                ruleId, bundleId, projectId);

            return NoContent();
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Cannot delete imported rules"))
        {
            _logger.LogWarning(ex, "Attempted to delete imported rule {RuleId}", ruleId);
            return StatusCode(403, new
            {
                error = "FORBIDDEN",
                message = "Cannot delete imported rules. Only custom manual rules can be deleted."
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to delete rule: {Message}", ex.Message);
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete rule {RuleId}", ruleId);
            return StatusCode(500, new { error = "DELETE_ERROR", message = "Failed to delete rule" });
        }
    }
}

// DTOs
public class BundleRuleDto
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

public class CreateBundleRuleDto
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required string FhirPathExpression { get; set; }
    public bool IsEnabled { get; set; } = true;
}

public class UpdateBundleRuleDto
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required string FhirPathExpression { get; set; }
    public bool IsEnabled { get; set; }
}

public class CreateRuleResponse
{
    public Guid RuleId { get; set; }
    public required string Message { get; set; }
}
