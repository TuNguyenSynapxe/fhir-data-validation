using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.SdBuilder.Adapters;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// ValueSet Lookup Controller - Read-only helpers for SD Builder.
/// 
/// STRICT RULES:
/// - Read-only UX helper only
/// - NO instance validation
/// - NO Firely SDK usage
/// - Uses ISdFhirAdapter only
/// - Deterministic, paged, max-limited results
/// </summary>
[ApiController]
[Route("api/sd-builder/valuesets")]
public sealed class ValueSetLookupController : ControllerBase
{
    private readonly ISdFhirAdapter _adapter;
    private readonly ILogger<ValueSetLookupController> _logger;

    public ValueSetLookupController(
        ISdFhirAdapter adapter,
        ILogger<ValueSetLookupController> logger)
    {
        _adapter = adapter;
        _logger = logger;
    }

    /// <summary>
    /// Search for ValueSets.
    /// </summary>
    /// <param name="query">Search query (name/url contains)</param>
    /// <param name="elementPath">Optional element path for context filtering</param>
    /// <param name="resourceType">Optional resource type for context filtering</param>
    /// <param name="limit">Max results (default 20, max 50)</param>
    /// <param name="ct">Cancellation token</param>
    [HttpGet("search")]
    public async Task<IActionResult> SearchValueSets(
        [FromQuery] string? query,
        [FromQuery] string? elementPath,
        [FromQuery] string? resourceType,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        // Guardrails
        var clampedLimit = Math.Clamp(limit, 1, 50);

        var request = new SdBuilder.Adapters.ValueSetSearchRequest
        {
            Query = query,
            ElementPath = elementPath,
            ResourceType = resourceType,
            Limit = clampedLimit
        };

        try
        {
            var results = await _adapter.SearchValueSetsAsync(request, ct);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching ValueSets");
            return StatusCode(500, new { error = "ValueSet search failed" });
        }
    }

    /// <summary>
    /// Preview ValueSet codes.
    /// </summary>
    /// <param name="url">ValueSet canonical URL</param>
    /// <param name="maxItems">Max codes to return (default 50, max 200)</param>
    /// <param name="ct">Cancellation token</param>
    [HttpGet("preview")]
    public async Task<IActionResult> PreviewValueSet(
        [FromQuery] string? url,
        [FromQuery] int maxItems = 50,
        CancellationToken ct = default)
    {
        // Validate required parameter
        if (string.IsNullOrWhiteSpace(url))
        {
            return BadRequest(new { error = "Parameter 'url' is required" });
        }

        // Guardrails
        var clampedMax = Math.Clamp(maxItems, 1, 200);

        try
        {
            var preview = await _adapter.PreviewValueSetAsync(url, clampedMax, ct);
            return Ok(preview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error previewing ValueSet: {Url}", url);
            return StatusCode(500, new { error = "ValueSet preview failed" });
        }
    }
}
