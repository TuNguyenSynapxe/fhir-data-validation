using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.DTOs;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Api.Controllers;

/// <summary>
/// Controller for FHIRPath validation operations.
/// </summary>
[ApiController]
[Route("api/fhir/fhirpath")]
public class FhirPathController : ControllerBase
{
    private readonly IFhirPathValidationService _validationService;
    private readonly ILogger<FhirPathController> _logger;

    public FhirPathController(
        IFhirPathValidationService validationService,
        ILogger<FhirPathController> logger)
    {
        _validationService = validationService;
        _logger = logger;
    }

    /// <summary>
    /// Validates a FHIRPath expression for syntax correctness.
    /// Does NOT evaluate the expression - only validates compilation.
    /// </summary>
    /// <param name="request">The validation request containing resource type, bundle JSON, and FHIRPath expression.</param>
    /// <returns>Validation result indicating if the expression is valid.</returns>
    /// <response code="200">Returns validation result (valid or invalid with error message)</response>
    /// <response code="400">If the request is malformed</response>
    [HttpPost("validate")]
    [ProducesResponseType(typeof(FhirPathValidationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FhirPathValidationResponse>> ValidateFhirPath(
        [FromBody] FhirPathValidationRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new { error = "Request body is required" });
            }

            if (string.IsNullOrWhiteSpace(request.FhirPath))
            {
                return BadRequest(new { error = "FhirPath property is required" });
            }

            _logger.LogInformation(
                "Validating FHIRPath expression: {FhirPath} for resource type: {ResourceType}",
                request.FhirPath,
                request.ResourceType);

            var result = await _validationService.ValidateFhirPathAsync(request);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating FHIRPath expression");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "An error occurred while validating the FHIRPath expression" });
        }
    }
}
