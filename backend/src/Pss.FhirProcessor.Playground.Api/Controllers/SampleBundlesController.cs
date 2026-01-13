using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Application.Services;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using Pss.FhirProcessor.Playground.Api.Dtos;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

[ApiController]
[Route("api/v2/projects/{projectId:guid}/sample-bundles")]
public class SampleBundlesController : ControllerBase
{
    private readonly FhirProcessorDbContext _dbContext;
    private readonly IBundleAutoTaggingService _autoTaggingService;
    private readonly ILogger<SampleBundlesController> _logger;

    public SampleBundlesController(
        FhirProcessorDbContext dbContext,
        IBundleAutoTaggingService autoTaggingService,
        ILogger<SampleBundlesController> logger)
    {
        _dbContext = dbContext;
        _autoTaggingService = autoTaggingService;
        _logger = logger;
    }

    /// <summary>
    /// List all sample bundles for a project, optionally filtered by SD canonical URL or tagging mode
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSampleBundles(
        Guid projectId,
        [FromQuery] string? sdCanonicalUrl,
        [FromQuery] string? taggingMode,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.ProjectBundles
            .AsNoTracking()
            .Where(b => b.ProjectId == projectId);

        if (!string.IsNullOrEmpty(sdCanonicalUrl))
        {
            query = query.Where(b => 
                b.AutoTaggedSdCanonicalUrl == sdCanonicalUrl ||
                b.ManuallyTaggedSdCanonicalUrl == sdCanonicalUrl ||
                b.StructureDefinitionCanonicalUrl == sdCanonicalUrl); // Legacy field for backwards compatibility
        }

        if (!string.IsNullOrEmpty(taggingMode))
        {
            if (Enum.TryParse<BundleTaggingMode>(taggingMode, true, out var mode))
            {
                query = query.Where(b => b.TaggingMode == mode);
            }
        }

        var bundles = await query
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new SampleBundleDto(
                b.Id,
                b.Name,
                b.StructureDefinitionCanonicalUrl,
                b.AutoTaggedSdCanonicalUrl,
                b.ManuallyTaggedSdCanonicalUrl,
                b.TaggingMode.ToString(),
                b.Source.ToString(),
                b.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Ok(bundles);
    }

    /// <summary>
    /// Get a specific sample bundle with full JSON
    /// </summary>
    [HttpGet("{bundleId:guid}")]
    public async Task<IActionResult> GetSampleBundle(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken)
    {
        var bundle = await _dbContext.ProjectBundles
            .AsNoTracking()
            .Where(b => b.ProjectId == projectId && b.Id == bundleId)
            .Select(b => new SampleBundleDetailDto(
                b.Id,
                b.Name,
                b.StructureDefinitionCanonicalUrl,
                b.AutoTaggedSdCanonicalUrl,
                b.ManuallyTaggedSdCanonicalUrl,
                b.TaggingMode.ToString(),
                b.Source.ToString(),
                b.BundleJson,
                b.CreatedAt
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (bundle == null)
        {
            return NotFound();
        }

        return Ok(bundle);
    }

    /// <summary>
    /// Create a new sample bundle with auto-tagging
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateSampleBundle(
        Guid projectId,
        [FromBody] CreateSampleBundleRequest request,
        CancellationToken cancellationToken)
    {
        // Validate project exists
        var projectExists = await _dbContext.Projects
            .AnyAsync(p => p.Id == projectId, cancellationToken);

        if (!projectExists)
        {
            return NotFound("Project not found");
        }

        // Validate JSON is not empty
        if (string.IsNullOrWhiteSpace(request.BundleJson))
        {
            return BadRequest("Bundle JSON cannot be empty");
        }

        // Get known SD canonical URLs for this project
        var knownSdUrls = await _dbContext.ProjectArtifacts
            .Where(pa => pa.ProjectId == projectId && 
                         pa.ArtifactType == ArtifactType.StructureDefinition &&
                         pa.CanonicalUrl != null)
            .Select(pa => pa.CanonicalUrl!)
            .ToListAsync(cancellationToken);

        // Auto-tag the bundle
        var result = await _autoTaggingService.AutoTagBundleAsync(
            request.BundleJson,
            knownSdUrls,
            cancellationToken);
        var autoTaggedUrl = result.SdCanonicalUrl;
        var taggingMode = result.TaggingMode;

        // Create new bundle
        var bundle = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = request.Name,
            StructureDefinitionCanonicalUrl = request.StructureDefinitionCanonicalUrl, // Legacy field
            AutoTaggedSdCanonicalUrl = autoTaggedUrl,
            ManuallyTaggedSdCanonicalUrl = null, // No manual tag initially
            TaggingMode = taggingMode,
            Source = BundleSource.Uploaded,
            BundleJson = request.BundleJson,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.ProjectBundles.Add(bundle);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Created sample bundle {BundleId} for project {ProjectId}, auto-tagged: {AutoTagged}, mode: {TaggingMode}",
            bundle.Id,
            projectId,
            autoTaggedUrl ?? "(none)",
            taggingMode);

        var dto = new SampleBundleDetailDto(
            bundle.Id,
            bundle.Name,
            bundle.StructureDefinitionCanonicalUrl,
            bundle.AutoTaggedSdCanonicalUrl,
            bundle.ManuallyTaggedSdCanonicalUrl,
            bundle.TaggingMode.ToString(),
            bundle.Source.ToString(),
            bundle.BundleJson,
            bundle.CreatedAt
        );

        return CreatedAtAction(
            nameof(GetSampleBundle),
            new { projectId, bundleId = bundle.Id },
            dto);
    }

    /// <summary>
    /// Update an existing sample bundle
    /// </summary>
    [HttpPut("{bundleId:guid}")]
    public async Task<IActionResult> UpdateSampleBundle(
        Guid projectId,
        Guid bundleId,
        [FromBody] UpdateSampleBundleRequest request,
        CancellationToken cancellationToken)
    {
        var bundle = await _dbContext.ProjectBundles
            .Where(b => b.ProjectId == projectId && b.Id == bundleId)
            .FirstOrDefaultAsync(cancellationToken);

        if (bundle == null)
        {
            return NotFound();
        }

        // Validate JSON is not empty
        if (string.IsNullOrWhiteSpace(request.BundleJson))
        {
            return BadRequest("Bundle JSON cannot be empty");
        }

        bundle.Name = request.Name;
        bundle.BundleJson = request.BundleJson;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Updated sample bundle {BundleId} for project {ProjectId}",
            bundleId,
            projectId);

        return NoContent();
    }

    /// <summary>
    /// Delete a sample bundle
    /// </summary>
    [HttpDelete("{bundleId:guid}")]
    public async Task<IActionResult> DeleteSampleBundle(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken)
    {
        var bundle = await _dbContext.ProjectBundles
            .Where(b => b.ProjectId == projectId && b.Id == bundleId)
            .FirstOrDefaultAsync(cancellationToken);

        if (bundle == null)
        {
            return NotFound();
        }

        _dbContext.ProjectBundles.Remove(bundle);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Deleted sample bundle {BundleId} from project {ProjectId}",
            bundleId,
            projectId);

        return NoContent();
    }

    /// <summary>
    /// Manually associate a bundle with a StructureDefinition.
    /// This does NOT modify the bundle JSON and is for explanation only.
    /// </summary>
    [HttpPost("{bundleId:guid}/manual-tag")]
    public async Task<IActionResult> ManuallyTagBundle(
        Guid projectId,
        Guid bundleId,
        [FromBody] ManualTagRequest request,
        CancellationToken cancellationToken)
    {
        var bundle = await _dbContext.ProjectBundles
            .Where(b => b.ProjectId == projectId && b.Id == bundleId)
            .FirstOrDefaultAsync(cancellationToken);

        if (bundle == null)
        {
            return NotFound();
        }

        // Verify SD exists in project
        var sdExists = await _dbContext.ProjectArtifacts
            .AnyAsync(pa => pa.ProjectId == projectId && 
                           pa.ArtifactType == ArtifactType.StructureDefinition &&
                           pa.CanonicalUrl == request.SdCanonicalUrl, cancellationToken);

        if (!sdExists)
        {
            return BadRequest("StructureDefinition not found in project");
        }

        // Apply manual tag
        bundle.ManuallyTaggedSdCanonicalUrl = request.SdCanonicalUrl;
        
        // If there's no auto-tag, set mode to Manual; otherwise keep Auto (auto takes precedence)
        if (bundle.TaggingMode == BundleTaggingMode.None)
        {
            bundle.TaggingMode = BundleTaggingMode.Manual;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Manually tagged bundle {BundleId} to SD {SdCanonicalUrl}",
            bundleId,
            request.SdCanonicalUrl);

        return NoContent();
    }

    /// <summary>
    /// Remove manual tag from a bundle
    /// </summary>
    [HttpDelete("{bundleId:guid}/manual-tag")]
    public async Task<IActionResult> RemoveManualTag(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken)
    {
        var bundle = await _dbContext.ProjectBundles
            .Where(b => b.ProjectId == projectId && b.Id == bundleId)
            .FirstOrDefaultAsync(cancellationToken);

        if (bundle == null)
        {
            return NotFound();
        }

        bundle.ManuallyTaggedSdCanonicalUrl = null;
        
        // Recalculate tagging mode
        if (bundle.AutoTaggedSdCanonicalUrl != null)
        {
            bundle.TaggingMode = BundleTaggingMode.Auto;
        }
        else
        {
            bundle.TaggingMode = BundleTaggingMode.None;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Removed manual tag from bundle {BundleId}",
            bundleId);

        return NoContent();
    }

    /// <summary>
    /// Recompute auto-tags for all bundles in a project.
    /// This is useful for migrating existing bundles to the Phase 3.2 tagging system.
    /// </summary>
    [HttpPost("recompute-tags")]
    public async Task<IActionResult> RecomputeAutoTags(
        Guid projectId,
        CancellationToken cancellationToken)
    {
        // Get all bundles in the project
        var bundles = await _dbContext.ProjectBundles
            .Where(b => b.ProjectId == projectId)
            .ToListAsync(cancellationToken);

        // Get known SD canonical URLs for this project
        var knownSdUrls = await _dbContext.ProjectArtifacts
            .Where(pa => pa.ProjectId == projectId && 
                         pa.ArtifactType == ArtifactType.StructureDefinition &&
                         pa.CanonicalUrl != null)
            .Select(pa => pa.CanonicalUrl!)
            .ToListAsync(cancellationToken);

        var recomputedCount = 0;
        var errors = new List<string>();

        foreach (var bundle in bundles)
        {
            try
            {
                // Recompute auto-tag
                var result = await _autoTaggingService.AutoTagBundleAsync(
                    bundle.BundleJson,
                    knownSdUrls,
                    cancellationToken);

                // Update bundle with new auto-tag
                bundle.AutoTaggedSdCanonicalUrl = result.SdCanonicalUrl;
                
                // Recalculate tagging mode
                if (result.SdCanonicalUrl != null)
                {
                    bundle.TaggingMode = BundleTaggingMode.Auto;
                }
                else if (bundle.ManuallyTaggedSdCanonicalUrl != null)
                {
                    bundle.TaggingMode = BundleTaggingMode.Manual;
                }
                else
                {
                    bundle.TaggingMode = BundleTaggingMode.None;
                }

                recomputedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to recompute auto-tag for bundle {BundleId}", bundle.Id);
                errors.Add($"Bundle {bundle.Name} ({bundle.Id}): {ex.Message}");
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Recomputed auto-tags for {RecomputedCount}/{TotalCount} bundles in project {ProjectId}",
            recomputedCount,
            bundles.Count,
            projectId);

        return Ok(new
        {
            TotalBundles = bundles.Count,
            RecomputedCount = recomputedCount,
            Errors = errors
        });
    }
}
