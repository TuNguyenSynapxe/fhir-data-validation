using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Repositories;

/// <summary>
/// Repository contract for validation project persistence.
/// Supports both public (read-only published) and admin (full CRUD) operations.
/// </summary>
public interface IProjectRepository
{
    // ========================================================================
    // PUBLIC READ-ONLY OPERATIONS (for anonymous validation)
    // ========================================================================

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

    // ========================================================================
    // ADMIN CRUD OPERATIONS (for project authoring)
    // ========================================================================

    /// <summary>
    /// Creates a new project in draft status.
    /// </summary>
    /// <param name="project">The project to create. Id will be generated if not set.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created project with generated Id and timestamps.</returns>
    Task<ProjectRecord> CreateAsync(ProjectRecord project, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a project by its unique identifier (any status).
    /// </summary>
    /// <param name="id">The project identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The project record if found, otherwise null.</returns>
    Task<ProjectRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists all projects regardless of status, ordered by updated date (newest first).
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A read-only list of all projects. Empty list if none found.</returns>
    Task<IReadOnlyList<ProjectRecord>> ListAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing project.
    /// </summary>
    /// <param name="project">The project with updated values. Id must match existing project.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated project record.</returns>
    /// <exception cref="InvalidOperationException">If project with Id not found.</exception>
    Task<ProjectRecord> UpdateAsync(ProjectRecord project, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a project permanently.
    /// </summary>
    /// <param name="id">The project identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if deleted, false if not found.</returns>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a project exists.
    /// </summary>
    /// <param name="id">The project identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if exists, false otherwise.</returns>
    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);

    // ========================================================================
    // SLUG MANAGEMENT
    // ========================================================================

    /// <summary>
    /// Checks if a slug is already taken by another project.
    /// </summary>
    /// <param name="slug">The slug to check.</param>
    /// <param name="excludeId">Optional project Id to exclude from check (for updates).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if slug exists, false otherwise.</returns>
    Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates a unique slug from a project name.
    /// If slug exists, appends a number suffix (e.g., "project-name-2").
    /// </summary>
    /// <param name="name">The project name.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A unique slug that doesn't exist in the database.</returns>
    Task<string> GenerateUniqueSlugAsync(string name, CancellationToken cancellationToken = default);

    // ========================================================================
    // STATUS MANAGEMENT
    // ========================================================================

    /// <summary>
    /// Publishes a project (sets status to 'published' and published_at to now).
    /// </summary>
    /// <param name="id">The project identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated project record.</returns>
    /// <exception cref="InvalidOperationException">If project not found.</exception>
    Task<ProjectRecord> PublishAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Unpublishes a project (sets status to 'draft' and clears published_at).
    /// </summary>
    /// <param name="id">The project identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated project record.</returns>
    /// <exception cref="InvalidOperationException">If project not found.</exception>
    Task<ProjectRecord> UnpublishAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Archives a project (sets status to 'archived').
    /// </summary>
    /// <param name="id">The project identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated project record.</returns>
    /// <exception cref="InvalidOperationException">If project not found.</exception>
    Task<ProjectRecord> ArchiveAsync(Guid id, CancellationToken cancellationToken = default);
}
