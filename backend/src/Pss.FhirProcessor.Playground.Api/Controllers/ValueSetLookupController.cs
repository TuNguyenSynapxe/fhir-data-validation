using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Terminology.Abstractions;
using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// ValueSet Lookup Controller - Read-only helpers for SD Builder.
/// 
/// STRICT RULES:
/// - Read-only UX helper only
/// - NO instance validation
/// - NO Firely SDK usage
/// - Uses ITerminologyService (Standalone DLL)
/// - Deterministic, paged, max-limited results
/// </summary>
[ApiController]
[Route("api/sd-builder/valuesets")]
public sealed class ValueSetLookupController : ControllerBase
{
    private readonly ITerminologyService _terminologyService;
    private readonly ILogger<ValueSetLookupController> _logger;

    public ValueSetLookupController(
        ITerminologyService terminologyService,
        ILogger<ValueSetLookupController> logger)
    {
        _terminologyService = terminologyService;
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

        var request = new ValueSetSearchRequest
        {
            Query = query,
            ElementPath = elementPath,
            ResourceType = resourceType
        };

        try
        {
            var results = await _terminologyService.SearchAsync(request, ct);
            
            // Apply limit after deduplication
            var limitedResults = results.Take(clampedLimit).ToList();
            
            _logger.LogInformation(
                "ValueSet search: query='{Query}', found={Count}, returned={Returned}",
                query ?? "(none)", results.Count, limitedResults.Count);
            
            return Ok(limitedResults);
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
            var preview = await _terminologyService.PreviewAsync(url, clampedMax, ct);
            
            if (preview == null)
            {
                _logger.LogWarning("ValueSet not found: {Url}", url);
                // Return empty preview for graceful degradation
                return Ok(ValueSetPreview.Empty(url));
            }
            
            _logger.LogInformation(
                "ValueSet preview: url='{Url}', codes={Count}",
                url, preview.Codes.Count);
            
            return Ok(preview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error previewing ValueSet: {Url}", url);
            return StatusCode(500, new { error = "ValueSet preview failed" });
        }
    }
}
