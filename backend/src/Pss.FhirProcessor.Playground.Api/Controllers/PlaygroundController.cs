using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlaygroundController : ControllerBase
{
    private readonly IValidationPipeline _validationPipeline;
    private readonly ILogger<PlaygroundController> _logger;

    public PlaygroundController(
        IValidationPipeline validationPipeline,
        ILogger<PlaygroundController> logger)
    {
        _validationPipeline = validationPipeline;
        _logger = logger;
    }

    /// <summary>
    /// Validates a FHIR bundle with rules using the Engine
    /// </summary>
    [HttpPost("validate")]
    public async Task<ActionResult<ValidationResponse>> ValidateBundle(
        [FromBody] ValidationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Validating FHIR bundle");
            var response = await _validationPipeline.ValidateAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during validation");
            return StatusCode(500, new { error = "Validation failed", message = ex.Message });
        }
    }

    /// <summary>
    /// Exports rule package for external teams
    /// </summary>
    [HttpPost("export")]
    public ActionResult<object> ExportRulePackage([FromBody] ExportRequest request)
    {
        try
        {
            var package = new
            {
                rules = request.Rules,
                codeMaster = request.CodeMaster
            };

            return Ok(package);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during export");
            return StatusCode(500, new { error = "Export failed", message = ex.Message });
        }
    }
}

public class ExportRequest
{
    public object? Rules { get; set; }
    public object? CodeMaster { get; set; }
}
