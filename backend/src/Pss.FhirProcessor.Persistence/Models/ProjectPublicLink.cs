namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Represents a public access link for a project.
/// Allows read-only access to a project without authentication.
/// </summary>
public sealed class ProjectPublicLink
{
    /// <summary>
    /// Unique identifier for the public link.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Foreign key to the project.
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// Public identifier used in the URL (e.g., a short UUID or slug).
    /// Must be globally unique.
    /// </summary>
    public string PublicId { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the link's purpose.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// When the link was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// When the link expires (null if never expires).
    /// </summary>
    public DateTimeOffset? ExpiresAt { get; set; }

    /// <summary>
    /// Whether the link is currently active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Navigation property: Parent project.
    /// </summary>
    public Project Project { get; set; } = null!;
}
