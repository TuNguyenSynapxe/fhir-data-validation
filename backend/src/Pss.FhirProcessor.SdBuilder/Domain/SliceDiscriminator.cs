namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Represents a discriminator used to differentiate between slices.
/// </summary>
/// <param name="Type">The type of discriminator.</param>
/// <param name="Path">The FHIRPath expression identifying the element used for discrimination.</param>
public sealed record SliceDiscriminator(
    DiscriminatorType Type,
    string Path
);
