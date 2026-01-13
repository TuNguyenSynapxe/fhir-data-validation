namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Configuration for an extension applied to an element.
/// </summary>
public sealed class ExtensionConfig
{
    /// <summary>
    /// Canonical URL of the extension StructureDefinition.
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Optional cardinality override for this extension.
    /// </summary>
    public Cardinality? Cardinality { get; set; }
}
