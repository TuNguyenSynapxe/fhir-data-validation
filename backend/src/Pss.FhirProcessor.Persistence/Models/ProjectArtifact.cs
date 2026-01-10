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
    /// File path within the imported package.
    /// </summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// Original file name.
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// FHIR resource type (e.g., "StructureDefinition", "ValueSet").
    /// </summary>
    public string? ResourceType { get; set; }

    /// <summary>
    /// Canonical URL of the artifact (e.g., "http://example.com/StructureDefinition/Patient").
    /// Nullable for non-canonical artifacts.
    /// </summary>
    public string? CanonicalUrl { get; set; }

    /// <summary>
    /// Full FHIR resource JSON stored as JSONB.
    /// </summary>
    public string ResourceJson { get; set; } = string.Empty;

    /// <summary>
    /// SHA256 hash of the resource JSON for deduplication.
    /// </summary>
    public string Hash { get; set; } = string.Empty;

    /// <summary>
    /// Phase 10.0: Role classification for StructureDefinitions.
    /// Null for non-SD artifacts.
    /// </summary>
    public StructureDefinitionRole? StructureDefinitionRole { get; set; }

    /// <summary>
    /// Phase 10.0: Indicates if this SD should be promoted as a Project StructureDefinition.
    /// True for Category A (ValidationProfile) and Category B (BundleProfile).
    /// False for Category C (SupportingArtifact).
    /// Null for non-SD artifacts.
    /// </summary>
    public bool? IsPromoted { get; set; }

    /// <summary>
    /// When the artifact was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Navigation property: Parent project.
    /// </summary>
    public Project Project { get; set; } = null!;
}
