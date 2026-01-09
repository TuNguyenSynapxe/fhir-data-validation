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
    /// Whether the link is currently enabled.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// When the link was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Navigation property: Parent project.
    /// </summary>
    public Project Project { get; set; } = null!;
}
