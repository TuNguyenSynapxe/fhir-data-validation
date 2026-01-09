namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Represents a validation project.
/// A project contains artifacts, bundles, and rules for FHIR validation.
/// </summary>
public sealed class Project
{
    /// <summary>
    /// Unique identifier for the project.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable project name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional project description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Project policy mode (Strict or Permissive).
    /// </summary>
    public PolicyMode PolicyMode { get; set; } = PolicyMode.Strict;

    /// <summary>
    /// Whether public access is enabled for this project.
    /// </summary>
    public bool IsPublicEnabled { get; set; }

    /// <summary>
    /// Public identifier for accessing this project (if IsPublicEnabled is true).
    /// </summary>
    public string? PublicId { get; set; }

    /// <summary>
    /// When the project was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// When the project was last updated.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>
    /// Navigation property: Artifacts in this project.
    /// </summary>
    public ICollection<ProjectArtifact> Artifacts { get; set; } = new List<ProjectArtifact>();

    /// <summary>
    /// Navigation property: Bundles in this project.
    /// </summary>
    public ICollection<ProjectBundle> Bundles { get; set; } = new List<ProjectBundle>();

    /// <summary>
    /// Navigation property: Rules in this project.
    /// </summary>
    public ICollection<ProjectRule> Rules { get; set; } = new List<ProjectRule>();

    /// <summary>
    /// Navigation property: Public links for this project.
    /// </summary>
    public ICollection<ProjectPublicLink> PublicLinks { get; set; } = new List<ProjectPublicLink>();
}
