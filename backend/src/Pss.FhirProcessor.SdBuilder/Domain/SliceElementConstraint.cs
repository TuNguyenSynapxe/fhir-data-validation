namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Represents a constraint on a child element within a slice.
/// Phase 2.2: Slice child constraints.
/// </summary>
/// <remarks>
/// ElementPath is relative to the slice root (e.g., "valueQuantity.value").
/// Fixed and Pattern values are mutually exclusive (enforced by Session).
/// </remarks>
public sealed class SliceElementConstraint
{
    /// <summary>
    /// The name of the slice this constraint belongs to.
    /// </summary>
    public required string SliceName { get; init; }

    /// <summary>
    /// The relative path of the element under the slice root.
    /// Example: "valueQuantity.value" for Observation.component:systolic.valueQuantity.value
    /// </summary>
    public required string ElementPath { get; init; }

    /// <summary>
    /// Optional cardinality override for this element.
    /// </summary>
    public Cardinality? CardinalityOverride { get; set; }

    /// <summary>
    /// Optional binding configuration for this element.
    /// </summary>
    public BindingConfig? Binding { get; set; }

    /// <summary>
    /// Optional fixed value for this element.
    /// Mutually exclusive with PatternValue.
    /// </summary>
    public object? FixedValue { get; set; }

    /// <summary>
    /// Optional pattern value for this element.
    /// Mutually exclusive with FixedValue.
    /// </summary>
    public object? PatternValue { get; set; }
}
