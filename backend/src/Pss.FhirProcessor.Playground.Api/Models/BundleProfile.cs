namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Represents a Bundle StructureDefinition profile for validation.
/// Multiple profiles can exist per project to support different Bundle scenarios.
/// </summary>
public sealed class BundleProfile
{
    /// <summary>
    /// Unique identifier for this bundle profile.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The project this bundle profile belongs to.
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// Human-readable name of the bundle profile (e.g., "Patient Bundle", "Encounter Bundle").
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Optional description explaining when to use this profile.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Canonical URL of the Bundle StructureDefinition (e.g., "http://hl7.sg/fhir/StructureDefinition/sg-patient-bundle").
    /// </summary>
    public required string CanonicalUrl { get; set; }

    /// <summary>
    /// JSON representation of the Bundle StructureDefinition.
    /// This is passed to the validation engine for profile validation.
    /// </summary>
    public required string StructureDefinitionJson { get; set; }

    /// <summary>
    /// Whether this is the default profile for the project.
    /// Used when no explicit profile is selected.
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// Timestamp when this profile was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Timestamp when this profile was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
