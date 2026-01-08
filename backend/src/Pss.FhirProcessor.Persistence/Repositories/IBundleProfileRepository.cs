using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Repositories;

/// <summary>
/// Repository for managing Bundle StructureDefinition profiles.
/// </summary>
public interface IBundleProfileRepository
{
    /// <summary>
    /// Get all bundle profiles for a project.
    /// </summary>
    Task<IReadOnlyList<BundleProfileRecord>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the default bundle profile for a project.
    /// Returns null if no default profile exists.
    /// </summary>
    Task<BundleProfileRecord?> GetDefaultByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a specific bundle profile by ID.
    /// Returns null if not found.
    /// </summary>
    Task<BundleProfileRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a new bundle profile.
    /// </summary>
    Task<BundleProfileRecord> CreateAsync(BundleProfileRecord record, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update an existing bundle profile.
    /// </summary>
    Task<BundleProfileRecord> UpdateAsync(BundleProfileRecord record, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a bundle profile by ID.
    /// </summary>
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
