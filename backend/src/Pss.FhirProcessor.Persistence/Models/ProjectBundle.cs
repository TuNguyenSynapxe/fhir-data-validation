namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Represents a FHIR Bundle in a project for validation testing.
/// </summary>
public sealed class ProjectBundle
{
    /// <summary>
    /// Unique identifier for the bundle.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Foreign key to the project.
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// Source of the bundle (ImportedExample, Uploaded, AdHoc).
    /// </summary>
    public BundleSource Source { get; set; }

    /// <summary>
    /// Human-readable name of the bundle.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional: Canonical URL of the StructureDefinition this bundle is scoped to.
    /// Used for SD-centric workflow where bundles are sample instances for a specific SD.
    /// </summary>
    public string? StructureDefinitionCanonicalUrl { get; set; }

    /// <summary>
    /// Auto-tagged SD canonical URL (derived from bundle meta.profile).
    /// Populated automatically when bundle explicitly declares conformance.
    /// </summary>
    public string? AutoTaggedSdCanonicalUrl { get; set; }

    /// <summary>
    /// Manually-tagged SD canonical URL (user-defined association).
    /// Does NOT modify bundle JSON. For explanation only.
    /// </summary>
    public string? ManuallyTaggedSdCanonicalUrl { get; set; }

    /// <summary>
    /// Tagging mode indicating how bundle is associated to SD.
    /// Auto = derived from meta.profile
    /// Manual = user-defined
    /// None = no association
    /// </summary>
    public BundleTaggingMode TaggingMode { get; set; } = BundleTaggingMode.None;

    /// <summary>
    /// Full FHIR Bundle JSON stored as JSONB.
    /// </summary>
    public string BundleJson { get; set; } = string.Empty;

    /// <summary>
    /// When the bundle was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Navigation property: Parent project.
    /// </summary>
    public Project Project { get; set; } = null!;
}
