using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Application.Projects.BundleProfiles;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using Pss.FhirProcessor.Playground.Api.Dtos;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// Phase 8.3: Admin API for managing Bundle ↔ StructureDefinition associations.
/// 
/// NO UI WORK. Backend support only.
/// </summary>
[ApiController]
[Route("api/v2/projects/{projectId:guid}/bundles/{bundleId:guid}/profile")]
public sealed class BundleProfileController : ControllerBase
{
    private readonly IBundleProfileResolutionService _resolutionService;
    private readonly FhirProcessorDbContext _dbContext;
    private readonly ILogger<BundleProfileController> _logger;

    public BundleProfileController(
        IBundleProfileResolutionService resolutionService,
        FhirProcessorDbContext dbContext,
        ILogger<BundleProfileController> logger)
    {
        _resolutionService = resolutionService;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Gets the current Bundle profile resolution status.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(BundleProfileResponseDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetBundleProfile(
        [FromRoute] Guid projectId,
        [FromRoute] Guid bundleId,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug(
            "GET bundle profile: ProjectId={ProjectId}, BundleId={BundleId}",
            projectId, bundleId);

        // Verify bundle exists
        var bundleExists = await _dbContext.ProjectBundles
            .AnyAsync(b => b.Id == bundleId && b.ProjectId == projectId, cancellationToken);

        if (!bundleExists)
        {
            return NotFound(new { error = "BUNDLE_NOT_FOUND", message = "Bundle not found" });
        }

        // Resolve profile
        var result = await _resolutionService.ResolveAsync(projectId, bundleId, cancellationToken);

        var response = new BundleProfileResponseDto
        {
            State = result.State.ToString().ToLowerInvariant(),
            StructureDefinitionId = result.StructureDefinitionId,
            Source = result.Source?.ToString().ToLowerInvariant()
        };

        // If resolved, fetch SD details
        if (result.State == BundleProfileState.Resolved && result.StructureDefinitionId.HasValue)
        {
            var sd = await _dbContext.ProjectArtifacts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == result.StructureDefinitionId.Value, cancellationToken);

            if (sd != null)
            {
                response.CanonicalUrl = sd.CanonicalUrl;
                response.Name = sd.FileName;
            }
        }

        return Ok(response);
    }

    /// <summary>
    /// Manually sets or clears the Bundle profile association.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetBundleProfile(
        [FromRoute] Guid projectId,
        [FromRoute] Guid bundleId,
        [FromBody] SetBundleProfileRequestDto request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "POST bundle profile: ProjectId={ProjectId}, BundleId={BundleId}, SDID={SDID}",
            projectId, bundleId, request.StructureDefinitionId);

        try
        {
            await _resolutionService.SetProfileAsync(
                projectId,
                bundleId,
                request.StructureDefinitionId,
                cancellationToken);

            return Ok(new { message = "Bundle profile updated successfully" });
        }
        catch (BundleProfileResolutionException ex)
        {
            _logger.LogWarning(ex, "Bundle profile resolution failed: {ErrorCode}", ex.ErrorCode);

            return ex.ErrorCode switch
            {
                BundleProfileResolutionErrorCodes.BundleNotFound => NotFound(new
                {
                    error = ex.ErrorCode,
                    message = ex.Message
                }),
                BundleProfileResolutionErrorCodes.StructureDefinitionNotFound => NotFound(new
                {
                    error = ex.ErrorCode,
                    message = ex.Message
                }),
                _ => BadRequest(new
                {
                    error = ex.ErrorCode,
                    message = ex.Message,
                    details = ex.Details
                })
            };
        }
    }
}
