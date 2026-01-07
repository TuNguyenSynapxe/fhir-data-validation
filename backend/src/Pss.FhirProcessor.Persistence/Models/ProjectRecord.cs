namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Represents a validation project record from the database.
/// This is a simple data transfer object with no behavior.
/// RulesetJson is kept as an opaque string to avoid engine coupling.
/// </summary>
public sealed record ProjectRecord
{
    /// <summary>
    /// Unique identifier for the project.
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// URL-friendly unique identifier (e.g., "sg-core-patient").
    /// </summary>
    public string Slug { get; init; } = string.Empty;

    /// <summary>
    /// Human-readable project name.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Optional project description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Raw JSON string containing the validation ruleset.
    /// MUST remain as string - never deserialized in this layer.
    /// </summary>
    public string RulesetJson { get; init; } = string.Empty;

    /// <summary>
    /// Project status: 'draft' or 'published'.
    /// </summary>
    public string Status { get; init; } = string.Empty;

    /// <summary>
    /// When the project was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; init; }

    /// <summary>
    /// When the project was published (null if never published).
    /// </summary>
    public DateTimeOffset? PublishedAt { get; init; }

    /// <summary>
    /// When the project was last updated.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; init; }

    /// <summary>
    /// FHIR version for validation (e.g., "R4", "R5").
    /// </summary>
    public string FhirVersion { get; init; } = "R4";

    /// <summary>
    /// CodeMaster definitions as raw JSON string.
    /// MUST remain as string - never deserialized in this layer.
    /// </summary>
    public string? CodeMasterJson { get; init; }

    /// <summary>
    /// Sample FHIR bundle for testing as raw JSON string.
    /// MUST remain as string - never deserialized in this layer.
    /// </summary>
    public string? SampleBundleJson { get; init; }

    /// <summary>
    /// Runtime validation settings as raw JSON string.
    /// MUST remain as string - never deserialized in this layer.
    /// </summary>
    public string? ValidationSettingsJson { get; init; }

    /// <summary>
    /// Project features and settings as raw JSON string.
    /// MUST remain as string - never deserialized in this layer.
    /// </summary>
    public string? FeaturesJson { get; init; }
}
