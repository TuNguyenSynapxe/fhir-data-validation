namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Represents slicing configuration for an element that serves as a slice root.
/// </summary>
public sealed class SlicingConfig
{
    /// <summary>
    /// Indicates whether slices must appear in the order defined.
    /// </summary>
    public bool Ordered { get; set; } = false;

    /// <summary>
    /// Defines whether additional slices beyond those explicitly defined are permitted.
    /// </summary>
    public SlicingRules Rules { get; set; } = SlicingRules.Open;

    /// <summary>
    /// The discriminators used to differentiate between slices.
    /// </summary>
    public List<SliceDiscriminator> Discriminators { get; set; } = new();
}
