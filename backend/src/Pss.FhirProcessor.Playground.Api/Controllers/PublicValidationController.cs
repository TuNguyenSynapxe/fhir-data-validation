using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Application.Public;
using Pss.FhirProcessor.Application.Public.Dtos;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// Public anonymous validation playground endpoints.
/// Phase 9.5a: Read-only access to resolve public links and validate bundles.
/// </summary>
[ApiController]
[Route("api/public/links")]
public sealed class PublicValidationController : ControllerBase
{
    private readonly IPublicValidationService _publicValidationService;
    private readonly ILogger<PublicValidationController> _logger;

    public PublicValidationController(
        IPublicValidationService publicValidationService,
        ILogger<PublicValidationController> logger)
    {
        _publicValidationService = publicValidationService;
        _logger = logger;
    }

    /// <summary>
    /// Resolves a public link to project metadata and bundles list.
    /// GET /api/public/links/{publicId}
    /// </summary>
    /// <param name="publicId">Public link identifier (slug).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Public link resolution response.</returns>
    [HttpGet("{publicId}")]
    [ProducesResponseType(typeof(PublicLinkResolveResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(PublicApiErrorDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(PublicApiErrorDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(PublicApiErrorDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ResolvePublicLink(
        [FromRoute] string publicId,
        CancellationToken cancellationToken)
    {
        // CRITICAL: Basic validation
        if (string.IsNullOrWhiteSpace(publicId))
        {
            return BadRequest(new PublicApiErrorDto
            {
                Code = "INVALID_PUBLIC_ID",
                Message = "Public ID cannot be empty."
            });
        }

        try
        {
            var response = await _publicValidationService.ResolveAsync(publicId, cancellationToken);
            return Ok(response);
        }
        catch (PublicApiException ex)
        {
            _logger.LogWarning(ex, "Public link resolution failed: {Code} - {Message}", ex.Code, ex.Message);

            return ex.Code switch
            {
                PublicApiException.PublicLinkNotFound => NotFound(new PublicApiErrorDto
                {
                    Code = ex.Code,
                    Message = ex.Message
                }),
                PublicApiException.PublicLinkDisabled => StatusCode(
                    StatusCodes.Status403Forbidden,
                    new PublicApiErrorDto
                    {
                        Code = ex.Code,
                        Message = ex.Message
                    }),
                _ => StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new PublicApiErrorDto
                    {
                        Code = "UNEXPECTED_ERROR",
                        Message = "An unexpected error occurred."
                    })
            };
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Public link resolution cancelled for publicId: {PublicId}", publicId);
            return StatusCode(499, new PublicApiErrorDto
            {
                Code = "CANCELLED",
                Message = "Request was cancelled."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during public link resolution for publicId: {PublicId}", publicId);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new PublicApiErrorDto
                {
                    Code = "UNEXPECTED_ERROR",
                    Message = "An unexpected error occurred."
                });
        }
    }

    /// <summary>
    /// Validates a bundle via public link.
    /// POST /api/public/links/{publicId}/bundles/{bundleId}/validate
    /// </summary>
    /// <param name="publicId">Public link identifier (slug).</param>
    /// <param name="bundleId">Bundle ID to validate.</param>
    /// <param name="request">Optional validation request (currently empty).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Public validation execution response.</returns>
    [HttpPost("{publicId}/bundles/{bundleId}/validate")]
    [ProducesResponseType(typeof(PublicExecuteValidationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(PublicApiErrorDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(PublicApiErrorDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(PublicApiErrorDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(PublicApiErrorDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ValidateBundle(
        [FromRoute] string publicId,
        [FromRoute] Guid bundleId,
        [FromBody] PublicExecuteValidationRequestDto? request,
        CancellationToken cancellationToken)
    {
        // CRITICAL: Basic validation
        if (string.IsNullOrWhiteSpace(publicId))
        {
            return BadRequest(new PublicApiErrorDto
            {
                Code = "INVALID_PUBLIC_ID",
                Message = "Public ID cannot be empty."
            });
        }

        if (bundleId == Guid.Empty)
        {
            return BadRequest(new PublicApiErrorDto
            {
                Code = "INVALID_BUNDLE_ID",
                Message = "Bundle ID cannot be empty."
            });
        }

        try
        {
            var response = await _publicValidationService.ValidateAsync(
                publicId,
                bundleId,
                cancellationToken);
            return Ok(response);
        }
        catch (PublicApiException ex)
        {
            _logger.LogWarning(
                ex,
                "Public validation failed: {Code} - {Message} (publicId: {PublicId}, bundleId: {BundleId})",
                ex.Code,
                ex.Message,
                publicId,
                bundleId);

            return ex.Code switch
            {
                PublicApiException.PublicLinkNotFound => NotFound(new PublicApiErrorDto
                {
                    Code = ex.Code,
                    Message = ex.Message
                }),
                PublicApiException.PublicLinkDisabled => StatusCode(
                    StatusCodes.Status403Forbidden,
                    new PublicApiErrorDto
                    {
                        Code = ex.Code,
                        Message = ex.Message
                    }),
                PublicApiException.BundleNotFound => NotFound(new PublicApiErrorDto
                {
                    Code = ex.Code,
                    Message = ex.Message
                }),
                PublicApiException.InvalidBundleJson => BadRequest(new PublicApiErrorDto
                {
                    Code = ex.Code,
                    Message = ex.Message
                }),
                PublicApiException.ValidationEngineFailed => StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new PublicApiErrorDto
                    {
                        Code = ex.Code,
                        Message = ex.Message
                    }),
                _ => StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new PublicApiErrorDto
                    {
                        Code = "UNEXPECTED_ERROR",
                        Message = "An unexpected error occurred."
                    })
            };
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation(
                "Public validation cancelled (publicId: {PublicId}, bundleId: {BundleId})",
                publicId,
                bundleId);
            return StatusCode(499, new PublicApiErrorDto
            {
                Code = "CANCELLED",
                Message = "Request was cancelled."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unexpected error during public validation (publicId: {PublicId}, bundleId: {BundleId})",
                publicId,
                bundleId);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new PublicApiErrorDto
                {
                    Code = "UNEXPECTED_ERROR",
                    Message = "An unexpected error occurred."
                });
        }
    }
}
