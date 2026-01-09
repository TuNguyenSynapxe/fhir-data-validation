using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Import.ImportModels;

/// <summary>
/// Represents a parsed FHIR artifact from the import package.
/// </summary>
public sealed class ParsedArtifact
{
    /// <summary>
    /// Relative file path within the package (e.g., "StructureDefinition/Patient.json").
    /// </summary>
    public string FilePath { get; init; } = string.Empty;

    /// <summary>
    /// File name only (e.g., "Patient.json").
    /// </summary>
    public string FileName { get; init; } = string.Empty;

    /// <summary>
    /// FHIR resource type (e.g., "StructureDefinition", "ValueSet").
    /// </summary>
    public string ResourceType { get; init; } = string.Empty;

    /// <summary>
    /// Classified artifact type.
    /// </summary>
    public ArtifactType ArtifactType { get; init; }

    /// <summary>
    /// Canonical URL extracted from the resource (if present).
    /// </summary>
    public string? CanonicalUrl { get; init; }

    /// <summary>
    /// Full FHIR resource JSON.
    /// </summary>
    public string ResourceJson { get; init; } = string.Empty;

    /// <summary>
    /// SHA256 hash of the resource JSON (for deduplication).
    /// </summary>
    public string Hash { get; init; } = string.Empty;
}
