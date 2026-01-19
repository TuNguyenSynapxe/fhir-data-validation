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
    /// FHIR type codes for this element (e.g., ["code"], ["Coding"], ["Quantity", "CodeableConcept"]).
    /// Populated from ElementDefinition.Type[].Code.
    /// Multiple types for value[x] polymorphic elements.
    /// </summary>
    public string[] TypeCodes { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Whether this element is included in the design.
    /// </summary>
    public bool IsIncluded { get; set; }

    /// <summary>
    /// Optional cardinality override (null if no override).
    /// </summary>
    public Cardinality? OverrideCardinality { get; set; }

    /// <summary>
    /// Base terminology binding from FHIR snapshot (read-only reference).
    /// Null if no base binding exists.
    /// </summary>
    public BindingConfig? BaseBinding { get; set; }

    /// <summary>
    /// User-defined binding override (null if inheriting from base).
    /// Only populated when user explicitly changes binding.
    /// </summary>
    public BindingConfig? OverrideBinding { get; set; }

    private readonly List<ExtensionConfig> _extensions = new();

    /// <summary>
    /// FHIR extensions applied to this element.
    /// Extensions are implemented as slicing on the 'extension' path.
    /// </summary>
    /// <remarks>
    /// Extensions are NOT normal child elements.
    /// They are managed through AddExtension/RemoveExtension methods.
    /// Reading this property returns the current extension list.
    /// </remarks>
    public IReadOnlyList<ExtensionConfig> Extensions => _extensions;

    /// <summary>
    /// Internal accessor for extension list (used by engine).
    /// </summary>
    internal List<ExtensionConfig> ExtensionsList => _extensions;

    /// <summary>
    /// Optional slicing configuration (null if element is not sliced).
    /// </summary>
    public SlicingConfig? Slicing { get; set; }

    /// <summary>
    /// Named slices defined on this element.
    /// Key is the slice name, value is the slice design state.
    /// </summary>
    public Dictionary<string, SliceDesignState> Slices { get; set; } = new(StringComparer.Ordinal);
}
