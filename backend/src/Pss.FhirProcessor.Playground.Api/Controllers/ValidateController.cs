using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Playground.Api.Dtos.Validation;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// Controller for anonymous FHIR validation (no project context).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ValidateController : ControllerBase
{
    private readonly IValidationPipeline _validationPipeline;
    private readonly ILogger<ValidateController> _logger;

    public ValidateController(
        IValidationPipeline validationPipeline,
        ILogger<ValidateController> logger)
    {
        _validationPipeline = validationPipeline;
        _logger = logger;
    }

    /// <summary>
    /// Validate a FHIR Bundle without any project-specific rules.
    /// Performs structural validation, Firely validation, and reference validation only.
    /// </summary>
    /// <param name="request">Validation request containing bundle JSON</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Validation result</returns>
    [HttpPost]
    [ProducesResponseType(typeof(ValidateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Validate(
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
                "Anonymous validation requested: FhirVersion={FhirVersion}, Mode={ValidationMode}",
                request.FhirVersion,
                request.ValidationMode);

            // Build validation request for engine (no ruleset = anonymous validation)
            var engineRequest = new ValidationRequest
            {
                BundleJson = request.BundleJson,
                FhirVersion = request.FhirVersion,
                ValidationMode = request.ValidationMode,
                RulesJson = null, // ⚠️ No business rules for anonymous validation
                CodeSystemsJson = null, // No codesystems for anonymous validation
                CodeMasterJson = null // No codemaster for anonymous validation
            };

            // Execute validation through engine
            var engineResponse = await _validationPipeline.ValidateAsync(engineRequest, cancellationToken);

            // Build response DTO
            var response = new ValidateResponse
            {
                IsValid = engineResponse.Summary.TotalErrors == 0,
                EngineResponse = engineResponse
            };

            _logger.LogInformation(
                "Anonymous validation completed: IsValid={IsValid}, Errors={ErrorCount}, Warnings={WarningCount}",
                response.IsValid,
                engineResponse.Summary.TotalErrors,
                engineResponse.Summary.WarningCount);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Anonymous validation failed");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Validation failed", message = ex.Message });
        }
    }
}
