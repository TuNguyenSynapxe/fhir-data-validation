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

    /// <summary>
    /// EPIC 3: Slice conditions - constraints that define which items match this slice.
    /// Each condition corresponds to a discriminator defined at the element level.
    /// </summary>
    public List<SliceCondition> Conditions { get; set; } = new();

    /// <summary>
    /// EPIC 3: Optional metadata for this slice.
    /// </summary>
    public SliceMetadata? Metadata { get; set; }
}

/// <summary>
/// EPIC 3: Represents a condition that defines when an item matches a slice.
/// </summary>
public sealed class SliceCondition
{
    /// <summary>
    /// Discriminator type (value, pattern, exists, type, profile).
    /// Must match a discriminator defined in the element's slicing configuration.
    /// </summary>
    public required string DiscriminatorType { get; set; }

    /// <summary>
    /// Discriminator path (e.g., "code", "use").
    /// Must match a discriminator defined in the element's slicing configuration.
    /// </summary>
    public required string DiscriminatorPath { get; set; }

    /// <summary>
    /// Operator for this condition (none, equals, in, regex, exists).
    /// </summary>
    public required string Operator { get; set; }

    /// <summary>
    /// Value to match (string representation, parsed as needed).
    /// Null if operator is "none" or "exists".
    /// </summary>
    public string? Value { get; set; }

    /// <summary>
    /// System URL for Coding/CodeableConcept cases.
    /// </summary>
    public string? System { get; set; }
}

/// <summary>
/// EPIC 3: Optional metadata for a slice.
/// </summary>
public sealed class SliceMetadata
{
    /// <summary>
    /// Short human-readable label for this slice.
    /// </summary>
    public string? ShortLabel { get; set; }

    /// <summary>
    /// Detailed description of this slice's purpose.
    /// </summary>
    public string? Description { get; set; }
}
