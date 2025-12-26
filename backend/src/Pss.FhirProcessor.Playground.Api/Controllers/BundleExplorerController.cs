using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// Controller for FHIR bundle exploration and path extraction
/// </summary>
[ApiController]
[Route("api/fhir/bundle")]
public class BundleExplorerController : ControllerBase
{
    private readonly IBundlePathExplorer _pathExplorer;
    private readonly ILogger<BundleExplorerController> _logger;

    public BundleExplorerController(
        IBundlePathExplorer pathExplorer,
        ILogger<BundleExplorerController> logger)
    {
        _pathExplorer = pathExplorer;
        _logger = logger;
    }

    /// <summary>
    /// Extracts all element paths from a FHIR bundle
    /// </summary>
    /// <param name="request">Request containing the bundle JSON</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of all paths found in the bundle</returns>
    /// <response code="200">Paths extracted successfully</response>
    /// <response code="400">Invalid JSON or request format</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("paths")]
    [ProducesResponseType(typeof(BundlePathResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ExtractPaths(
        [FromBody] BundlePathRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate input
            if (request == null || string.IsNullOrWhiteSpace(request.BundleJson))
            {
                _logger.LogWarning("Empty or null bundle JSON received");
                return BadRequest(new
                {
                    error = "Invalid request",
                    message = "Bundle JSON is required"
                });
            }

            _logger.LogInformation("Extracting paths from bundle (length: {Length} chars)", request.BundleJson.Length);

            // Extract paths
            var result = await _pathExplorer.ExtractPathsAsync(request.BundleJson, cancellationToken);

            _logger.LogInformation("Successfully extracted {PathCount} paths from {ResourceCount} resources",
                result.TotalPaths, result.TotalResources);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid bundle JSON format");
            return BadRequest(new
            {
                error = "Invalid JSON",
                message = ex.Message,
                details = ex.InnerException?.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting paths from bundle");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                error = "Internal server error",
                message = "An error occurred while extracting paths from the bundle"
            });
        }
    }

    /// <summary>
    /// Request model for bundle path extraction
    /// </summary>
    public class BundlePathRequest
    {
        /// <summary>
        /// JSON-encoded FHIR bundle
        /// </summary>
        public string BundleJson { get; set; } = string.Empty;
    }
}
