using Pss.FhirProcessor.Application.Public.Dtos;

namespace Pss.FhirProcessor.Application.Public;

/// <summary>
/// Service for public anonymous validation playground.
/// Phase 9.5a: Read-only access to resolve public links and validate bundles.
/// </summary>
public interface IPublicValidationService
{
    /// <summary>
    /// Resolves a public link to project metadata and bundles list.
    /// </summary>
    /// <param name="publicId">Public link identifier (slug).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Public link resolution response.</returns>
    /// <exception cref="PublicApiException">
    /// Thrown with codes:
    /// - PUBLIC_LINK_NOT_FOUND: Link does not exist
    /// - PUBLIC_LINK_DISABLED: Link or project is disabled
    /// </exception>
    Task<PublicLinkResolveResponseDto> ResolveAsync(
        string publicId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates a bundle via public link.
    /// Delegates to Phase 8.1 validation execution service.
    /// </summary>
    /// <param name="publicId">Public link identifier (slug).</param>
    /// <param name="bundleId">Bundle ID to validate.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Public validation execution response.</returns>
    /// <exception cref="PublicApiException">
    /// Thrown with codes:
    /// - PUBLIC_LINK_NOT_FOUND: Link does not exist
    /// - PUBLIC_LINK_DISABLED: Link or project is disabled
    /// - BUNDLE_NOT_FOUND: Bundle does not exist or not in project
    /// - INVALID_BUNDLE_JSON: Bundle JSON is malformed
    /// - VALIDATION_ENGINE_FAILURE: Validation engine error
    /// </exception>
    Task<PublicExecuteValidationResponseDto> ValidateAsync(
        string publicId,
        Guid bundleId,
        CancellationToken cancellationToken = default);
}
