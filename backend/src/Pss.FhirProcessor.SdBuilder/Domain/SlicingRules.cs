namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Defines how additional slices beyond those explicitly defined should be handled.
/// </summary>
public enum SlicingRules
{
    /// <summary>
    /// Additional slices are permitted beyond those explicitly defined.
    /// </summary>
    Open,

    /// <summary>
    /// No additional slices are permitted beyond those explicitly defined.
    /// </summary>
    Closed,

    /// <summary>
    /// No additional slices are permitted after the last explicitly defined slice.
    /// </summary>
    OpenAtEnd
}
