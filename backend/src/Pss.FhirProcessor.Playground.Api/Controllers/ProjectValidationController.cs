using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Application.ValidationExecution;
using Pss.FhirProcessor.Application.ValidationExecution.Interfaces;
using Pss.FhirProcessor.Playground.Api.Dtos.Validation;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// Phase 8.2: HTTP API for validation execution.
/// Thin boundary over IProjectValidationExecutionService - contains NO business logic.
/// </summary>
[ApiController]
[Route("api/v2/projects")]
public sealed class ProjectValidationController : ControllerBase
{
    private readonly IProjectValidationExecutionService _executionService;
    private readonly ILogger<ProjectValidationController> _logger;

    public ProjectValidationController(
        IProjectValidationExecutionService executionService,
        ILogger<ProjectValidationController> logger)
    {
        _executionService = executionService;
        _logger = logger;
    }

    /// <summary>
    /// Execute validation for a project bundle using imported rules and structure definitions.
    /// </summary>
    /// <param name="projectId">Project ID (must exist)</param>
    /// <param name="bundleId">Bundle ID (must belong to project)</param>
    /// <param name="request">Optional validation settings</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Validation results with errors and summary</returns>
    [HttpPost("{projectId:guid}/bundles/{bundleId:guid}/validate")]
    [ProducesResponseType(typeof(ExecuteValidationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationExecutionErrorDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ValidationExecutionErrorDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ValidationExecutionErrorDto), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ValidationExecutionErrorDto), StatusCodes.Status499ClientClosedRequest)]
    [ProducesResponseType(typeof(ValidationExecutionErrorDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ExecuteValidation(
        [FromRoute] Guid projectId,
        [FromRoute] Guid bundleId,
        [FromBody] ExecuteValidationRequest? request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation(
                "Executing validation for project {ProjectId}, bundle {BundleId}",
                projectId,
                bundleId);

            // Delegate to Phase 8.1 service (no business logic here)
            var validationResponse = await _executionService.ExecuteAsync(
                projectId,
                bundleId,
                cancellationToken);

            // Map to response DTO
            var response = new ExecuteValidationResponse
            {
                ProjectId = projectId,
                BundleId = bundleId,
                PolicyMode = request?.PolicyMode ?? "strict", // TODO: Get from project if not specified
                Issues = validationResponse.Errors,
                Summary = validationResponse.Summary
            };

            _logger.LogInformation(
                "Validation completed for project {ProjectId}, bundle {BundleId}: {TotalErrors} errors, {WarningCount} warnings",
                projectId,
                bundleId,
                validationResponse.Summary.TotalErrors,
                validationResponse.Summary.WarningCount);

            return Ok(response);
        }
        catch (ValidationExecutionException ex)
        {
            _logger.LogWarning(
                ex,
                "Validation execution failed for project {ProjectId}, bundle {BundleId}: {Code}",
                projectId,
                bundleId,
                ex.Code);

            // Map error code to HTTP status deterministically
            var errorDto = new ValidationExecutionErrorDto
            {
                Code = ex.Code,
                Message = ex.Message
            };

            return ex.Code switch
            {
                ValidationExecutionException.ErrorCodes.PROJECT_NOT_FOUND => NotFound(errorDto),
                ValidationExecutionException.ErrorCodes.BUNDLE_NOT_FOUND => NotFound(errorDto),
                ValidationExecutionException.ErrorCodes.INVALID_BUNDLE_JSON => BadRequest(errorDto),
                ValidationExecutionException.ErrorCodes.NO_STRUCTURE_DEFINITIONS => UnprocessableEntity(errorDto),
                ValidationExecutionException.ErrorCodes.CANCELLED => StatusCode(499, errorDto),
                ValidationExecutionException.ErrorCodes.VALIDATION_ENGINE_FAILURE => StatusCode(500, errorDto),
                _ => StatusCode(500, errorDto)
            };
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogWarning(
                ex,
                "Validation cancelled for project {ProjectId}, bundle {BundleId}",
                projectId,
                bundleId);

            var errorDto = new ValidationExecutionErrorDto
            {
                Code = ValidationExecutionException.ErrorCodes.CANCELLED,
                Message = "Validation was cancelled"
            };

            return StatusCode(499, errorDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unexpected error during validation execution for project {ProjectId}, bundle {BundleId}",
                projectId,
                bundleId);

            var errorDto = new ValidationExecutionErrorDto
            {
                Code = "UNEXPECTED_ERROR",
                Message = "An unexpected error occurred during validation"
            };

            return StatusCode(500, errorDto);
        }
    }
}
