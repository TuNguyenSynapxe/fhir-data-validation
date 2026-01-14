namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Represents the design-time state of a single slice within a sliced element.
/// </summary>
public sealed class SliceDesignState
{
    /// <summary>
    /// The unique name identifying this slice.
    /// </summary>
    public required string SliceName { get; set; }

    /// <summary>
    /// Optional cardinality override for this slice.
    /// </summary>
    public Cardinality? OverrideCardinality { get; set; }

    /// <summary>
    /// Optional binding configuration for this slice.
    /// </summary>
    public BindingConfig? Binding { get; set; }

    /// <summary>
    /// Fixed values for elements within this slice.
    /// Key is the element path, value is the fixed value.
    /// </summary>
    public Dictionary<string, object> FixedValues { get; set; } = new();

    /// <summary>
    /// Pattern values for elements within this slice.
    /// Key is the element path, value is the pattern value.
    /// </summary>
    public Dictionary<string, object> PatternValues { get; set; } = new();

    /// <summary>
    /// Phase 2.2: Child element constraints within this slice.
    /// Stores constraints on elements beneath the slice root.
    /// </summary>
    public List<SliceElementConstraint> ChildConstraints { get; set; } = new();
}
