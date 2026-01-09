namespace Pss.FhirProcessor.Application.Projects.Import.ImportModels;

/// <summary>
/// Represents parsed package manifest from package.json and optional ig.json.
/// </summary>
public sealed class ParsedPackageManifest
{
    /// <summary>
    /// Package name (from package.json "name").
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Package version (from package.json "version").
    /// </summary>
    public string Version { get; init; } = string.Empty;

    /// <summary>
    /// Package description (from package.json "description").
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// FHIR version declared in package (MUST be R5 / 5.0.0).
    /// </summary>
    public string FhirVersion { get; init; } = string.Empty;

    /// <summary>
    /// Canonical base URL (from package.json "canonical" or ig.json "url").
    /// </summary>
    public string? CanonicalBase { get; init; }

    /// <summary>
    /// Additional metadata as JSON string (for future extensibility).
    /// </summary>
    public string? AdditionalMetadata { get; init; }
}
