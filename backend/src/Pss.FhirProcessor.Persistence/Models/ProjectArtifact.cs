namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Represents a FHIR artifact (StructureDefinition, ValueSet, CodeSystem, etc.) in a project.
/// </summary>
public sealed class ProjectArtifact
{
    /// <summary>
    /// Unique identifier for the artifact.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Foreign key to the project.
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// Type of artifact (StructureDefinition, ValueSet, CodeSystem, etc.).
    /// </summary>
    public ArtifactType ArtifactType { get; set; }

    /// <summary>
    /// Canonical URL of the artifact (e.g., "http://example.com/StructureDefinition/Patient").
    /// Nullable for non-canonical artifacts.
    /// </summary>
    public string? CanonicalUrl { get; set; }

    /// <summary>
    /// Human-readable name of the artifact.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the artifact.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Version of the artifact (optional).
    /// </summary>
    public string? Version { get; set; }

    /// <summary>
    /// Full FHIR resource JSON stored as JSONB.
    /// </summary>
    public string ContentJson { get; set; } = string.Empty;

    /// <summary>
    /// When the artifact was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// When the artifact was last updated.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>
    /// Navigation property: Parent project.
    /// </summary>
    public Project Project { get; set; } = null!;
}
