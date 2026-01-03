using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Repositories;

/// <summary>
/// Repository contract for READ-ONLY access to published validation projects.
/// This interface enforces the boundary: only published projects can be accessed.
/// </summary>
public interface IProjectRepository
{
    /// <summary>
    /// Lists all published validation projects, ordered by publication date (newest first).
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// A read-only list of published projects. Empty list if none found.
    /// Never returns null.
    /// </returns>
    Task<IReadOnlyList<ProjectRecord>> ListPublishedAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a single published project by its unique slug.
    /// </summary>
    /// <param name="slug">The URL-friendly project identifier (e.g., "sg-core-patient").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// The project record if found and published, otherwise null.
    /// Never throws for missing data.
    /// </returns>
    Task<ProjectRecord?> GetPublishedBySlugAsync(string slug, CancellationToken cancellationToken = default);
}
