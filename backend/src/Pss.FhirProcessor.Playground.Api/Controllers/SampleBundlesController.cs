using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using Pss.FhirProcessor.Playground.Api.Dtos;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

[ApiController]
[Route("api/v2/projects/{projectId:guid}/sample-bundles")]
public class SampleBundlesController : ControllerBase
{
    private readonly FhirProcessorDbContext _dbContext;
    private readonly ILogger<SampleBundlesController> _logger;

    public SampleBundlesController(
        FhirProcessorDbContext dbContext,
        ILogger<SampleBundlesController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// List all sample bundles for a project, optionally filtered by SD canonical URL
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSampleBundles(
        Guid projectId,
        [FromQuery] string? sdCanonicalUrl,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.ProjectBundles
            .AsNoTracking()
            .Where(b => b.ProjectId == projectId);

        if (!string.IsNullOrEmpty(sdCanonicalUrl))
        {
            query = query.Where(b => b.StructureDefinitionCanonicalUrl == sdCanonicalUrl);
        }

        var bundles = await query
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new SampleBundleDto(
                b.Id,
                b.Name,
                b.StructureDefinitionCanonicalUrl,
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
    /// Create a new sample bundle
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

        // Create new bundle
        var bundle = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = request.Name,
            StructureDefinitionCanonicalUrl = request.StructureDefinitionCanonicalUrl,
            Source = BundleSource.Uploaded, // SD-scoped bundles are user-uploaded
            BundleJson = request.BundleJson,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.ProjectBundles.Add(bundle);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Created sample bundle {BundleId} for project {ProjectId}, SD: {SdUrl}",
            bundle.Id,
            projectId,
            request.StructureDefinitionCanonicalUrl ?? "(none)");

        var dto = new SampleBundleDetailDto(
            bundle.Id,
            bundle.Name,
            bundle.StructureDefinitionCanonicalUrl,
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
}
