using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// API for loading FHIR sample JSON files
/// </summary>
[ApiController]
[Route("api/fhir/samples")]
public class SamplesController : ControllerBase
{
    private readonly IFhirSampleProvider _sampleProvider;
    private readonly ILogger<SamplesController> _logger;

    public SamplesController(
        IFhirSampleProvider sampleProvider,
        ILogger<SamplesController> logger)
    {
        _sampleProvider = sampleProvider;
        _logger = logger;
    }

    /// <summary>
    /// Lists available FHIR samples
    /// </summary>
    /// <param name="version">FHIR version (e.g., "R4")</param>
    /// <param name="resourceType">Optional resource type filter</param>
    [HttpGet]
    public async Task<IActionResult> ListSamples(
        [FromQuery] string version = "R4",
        [FromQuery] string? resourceType = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(version))
            {
                return BadRequest(new { error = "Version parameter is required" });
            }

            _logger.LogInformation("Listing samples for version={Version}, resourceType={ResourceType}", 
                version, resourceType);

            var samples = await _sampleProvider.ListSamplesAsync(version, resourceType);

            return Ok(samples);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing samples");
            return StatusCode(500, new 
            { 
                error = "Internal server error", 
                message = "Failed to list samples" 
            });
        }
    }

    /// <summary>
    /// Loads a specific FHIR sample JSON
    /// </summary>
    /// <param name="version">FHIR version (e.g., "R4")</param>
    /// <param name="resourceType">Resource type (e.g., "Patient")</param>
    /// <param name="sampleId">Sample identifier (e.g., "patient-full")</param>
    [HttpGet("{version}/{resourceType}/{sampleId}")]
    public async Task<IActionResult> LoadSample(
        string version,
        string resourceType,
        string sampleId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(version) || 
                string.IsNullOrWhiteSpace(resourceType) || 
                string.IsNullOrWhiteSpace(sampleId))
            {
                return BadRequest(new { error = "Version, resourceType, and sampleId are required" });
            }

            _logger.LogInformation("Loading sample: {Version}/{ResourceType}/{SampleId}", 
                version, resourceType, sampleId);

            var json = await _sampleProvider.LoadSampleJsonAsync(version, resourceType, sampleId);

            return Content(json, "application/json");
        }
        catch (FileNotFoundException ex)
        {
            _logger.LogWarning(ex, "Sample not found");
            return NotFound(new 
            { 
                error = "Sample not found",
                message = ex.Message 
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized sample access attempt");
            return BadRequest(new 
            { 
                error = "Invalid sample path",
                message = "The requested sample path is invalid" 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading sample");
            return StatusCode(500, new 
            { 
                error = "Internal server error", 
                message = "Failed to load sample" 
            });
        }
    }
}
