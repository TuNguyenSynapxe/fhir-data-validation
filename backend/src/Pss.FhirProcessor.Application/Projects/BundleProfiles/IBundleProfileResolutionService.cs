using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.BundleProfiles;

/// <summary>
/// Phase 8.3: Service for resolving Bundle to Bundle StructureDefinition associations.
/// 
/// STRICT SCOPE:
/// - Determines which Bundle SD applies to a Bundle
/// - NO validation logic
/// - NO rule generation
/// - NO heuristics beyond exact matching
/// - DETERMINISTIC outcomes only
/// </summary>
public interface IBundleProfileResolutionService
{
    /// <summary>
    /// Resolves the Bundle profile for a given Bundle.
    /// 
    /// Resolution order:
    /// 1. Check existing manual selection (highest priority)
    /// 2. Check meta.profile exact match
    /// 3. Check filename exact match
    /// 4. Return UNRESOLVED
    /// 
    /// Never throws - always returns a deterministic result.
    /// </summary>
    /// <param name="projectId">Project ID</param>
    /// <param name="bundleId">Bundle ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Resolution result (RESOLVED, UNRESOLVED, or UNPROFILED)</returns>
    Task<BundleProfileResolutionResult> ResolveAsync(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Manually sets the Bundle profile association.
    /// 
    /// Rules:
    /// - structureDefinitionId == null → UNPROFILED
    /// - structureDefinitionId != null → RESOLVED
    /// - Must be Bundle-type StructureDefinition
    /// - Overwrites any existing association
    /// 
    /// Source is always Manual.
    /// </summary>
    /// <param name="projectId">Project ID</param>
    /// <param name="bundleId">Bundle ID</param>
    /// <param name="structureDefinitionId">SD ID or null for unprofiled</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <exception cref="BundleProfileResolutionException">Thrown on validation failure</exception>
    Task SetProfileAsync(
        Guid projectId,
        Guid bundleId,
        Guid? structureDefinitionId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the current profile association for a Bundle.
    /// Returns null if no association exists (UNRESOLVED).
    /// </summary>
    Task<ProjectBundleProfileSelection?> GetProfileSelectionAsync(
        Guid bundleId,
        CancellationToken cancellationToken = default);
}
