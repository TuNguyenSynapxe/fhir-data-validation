namespace Pss.FhirProcessor.Application.Projects.Import.ImportModels;

/// <summary>
/// Represents a parsed FHIR Bundle from the import package.
/// </summary>
public sealed class ParsedBundle
{
    /// <summary>
    /// Relative file path within the package.
    /// </summary>
    public string FilePath { get; init; } = string.Empty;

    /// <summary>
    /// File name only.
    /// </summary>
    public string FileName { get; init; } = string.Empty;

    /// <summary>
    /// Display name extracted from Bundle.id or filename.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Full FHIR Bundle JSON.
    /// </summary>
    public string BundleJson { get; init; } = string.Empty;
}
