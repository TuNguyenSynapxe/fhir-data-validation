namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Represents the design-time state of a single element within a FHIR resource.
/// </summary>
public sealed class ElementDesignState
{
    /// <summary>
    /// FHIRPath-style element path (e.g., "Patient.name").
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Base cardinality from the base StructureDefinition.
    /// </summary>
    public Cardinality BaseCardinality { get; set; } = new(0, "*");

    /// <summary>
    /// Base type code (e.g., "string", "code", "Coding").
    /// </summary>
    public string BaseTypeCode { get; set; } = string.Empty;

    /// <summary>
    /// Whether this element is included in the design.
    /// </summary>
    public bool IsIncluded { get; set; }

    /// <summary>
    /// Optional cardinality override (null if no override).
    /// </summary>
    public Cardinality? OverrideCardinality { get; set; }

    /// <summary>
    /// Optional terminology binding (null if no binding).
    /// </summary>
    public BindingConfig? Binding { get; set; }

    /// <summary>
    /// Collection of extensions applied to this element.
    /// </summary>
    public List<ExtensionConfig> Extensions { get; set; } = new();
}
