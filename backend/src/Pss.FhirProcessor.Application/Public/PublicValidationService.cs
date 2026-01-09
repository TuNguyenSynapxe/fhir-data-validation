using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Application.ValidationExecution.Interfaces;
using Pss.FhirProcessor.Application.ValidationExecution;
using Pss.FhirProcessor.Application.Public.Dtos;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Public;

/// <summary>
/// Implementation of public validation service.
/// Phase 9.5a: Read-only access, delegates to Phase 8.1 validation execution service.
/// </summary>
public sealed class PublicValidationService : IPublicValidationService
{
    private readonly FhirProcessorDbContext _dbContext;
    private readonly IProjectValidationExecutionService _validationService;

    public PublicValidationService(
        FhirProcessorDbContext dbContext,
        IProjectValidationExecutionService validationService)
    {
        _dbContext = dbContext;
        _validationService = validationService;
    }

    public async Task<PublicLinkResolveResponseDto> ResolveAsync(
        string publicId,
        CancellationToken cancellationToken = default)
    {
        // CRITICAL: Query ProjectPublicLink + Project in one go for efficiency
        var publicLink = await _dbContext.ProjectPublicLinks
            .AsNoTracking()
            .Include(pl => pl.Project)
            .FirstOrDefaultAsync(pl => pl.PublicId == publicId, cancellationToken);

        if (publicLink == null)
        {
            throw new PublicApiException(
                PublicApiException.PublicLinkNotFound,
                $"Public link '{publicId}' not found.");
        }

        // CRITICAL: Check link enabled AND project IsPublicEnabled
        if (!publicLink.Enabled || !publicLink.Project.IsPublicEnabled)
        {
            throw new PublicApiException(
                PublicApiException.PublicLinkDisabled,
                $"Public link '{publicId}' is disabled or project public access is disabled.");
        }

        var projectId = publicLink.ProjectId;

        // Query bundles for this project (efficient, no JSON loading)
        var bundles = await _dbContext.ProjectBundles
            .AsNoTracking()
            .Where(b => b.ProjectId == projectId)
            .Select(b => new PublicBundleListItemDto
            {
                BundleId = b.Id,
                Title = b.Name,
                Source = b.Source.ToString() // BundleSource enum to string
            })
            .ToListAsync(cancellationToken);

        return new PublicLinkResolveResponseDto
        {
            PublicId = publicId,
            ProjectId = projectId,
            ProjectName = publicLink.Project.Name,
            PolicyMode = publicLink.Project.PolicyMode == PolicyMode.Strict ? "strict" : "permissive",
            Bundles = bundles
        };
    }

    public async Task<PublicExecuteValidationResponseDto> ValidateAsync(
        string publicId,
        Guid bundleId,
        CancellationToken cancellationToken = default)
    {
        // CRITICAL: Verify access (same checks as Resolve)
        var publicLink = await _dbContext.ProjectPublicLinks
            .AsNoTracking()
            .Include(pl => pl.Project)
            .FirstOrDefaultAsync(pl => pl.PublicId == publicId, cancellationToken);

        if (publicLink == null)
        {
            throw new PublicApiException(
                PublicApiException.PublicLinkNotFound,
                $"Public link '{publicId}' not found.");
        }

        if (!publicLink.Enabled || !publicLink.Project.IsPublicEnabled)
        {
            throw new PublicApiException(
                PublicApiException.PublicLinkDisabled,
                $"Public link '{publicId}' is disabled or project public access is disabled.");
        }

        var projectId = publicLink.ProjectId;

        // CRITICAL: Verify bundle belongs to this project
        var bundleExists = await _dbContext.ProjectBundles
            .AsNoTracking()
            .AnyAsync(b => b.Id == bundleId && b.ProjectId == projectId, cancellationToken);

        if (!bundleExists)
        {
            throw new PublicApiException(
                PublicApiException.BundleNotFound,
                $"Bundle '{bundleId}' not found in project '{projectId}' or does not exist.");
        }

        // CRITICAL: Delegate to Phase 8.1 validation execution service
        // NO policy override for public endpoint (must be policy-stable)
        Engine.Models.ValidationResponse validationResponse;
        try
        {
            validationResponse = await _validationService.ExecuteAsync(
                projectId,
                bundleId,
                cancellationToken);
        }
        catch (ValidationExecutionException ex)
        {
            // Map validation execution exceptions to public API exceptions
            throw ex.Code switch
            {
                ValidationExecutionException.ErrorCodes.PROJECT_NOT_FOUND => new PublicApiException(
                    PublicApiException.PublicLinkDisabled,
                    $"Project for public link '{publicId}' not found.",
                    ex),
                ValidationExecutionException.ErrorCodes.BUNDLE_NOT_FOUND => new PublicApiException(
                    PublicApiException.BundleNotFound,
                    $"Bundle '{bundleId}' not found.",
                    ex),
                ValidationExecutionException.ErrorCodes.INVALID_BUNDLE_JSON => new PublicApiException(
                    PublicApiException.InvalidBundleJson,
                    "Bundle JSON is malformed or invalid.",
                    ex),
                ValidationExecutionException.ErrorCodes.VALIDATION_ENGINE_FAILURE => new PublicApiException(
                    PublicApiException.ValidationEngineFailed,
                    "Validation engine encountered an error.",
                    ex),
                _ => new PublicApiException(
                    PublicApiException.ValidationEngineFailed,
                    "Validation failed due to unexpected error.",
                    ex)
            };
        }

        // Transform ValidationResponse to PublicValidationPayload (Phase 8.2-compatible format)
        var validationPayload = new PublicValidationPayload
        {
            ProjectId = projectId,
            BundleId = bundleId,
            PolicyMode = publicLink.Project.PolicyMode == PolicyMode.Strict ? "strict" : "permissive",
            Issues = validationResponse.Errors,
            Summary = validationResponse.Summary
        };

        return new PublicExecuteValidationResponseDto
        {
            PublicId = publicId,
            ProjectId = projectId,
            BundleId = bundleId,
            Validation = validationPayload
        };
    }
}
