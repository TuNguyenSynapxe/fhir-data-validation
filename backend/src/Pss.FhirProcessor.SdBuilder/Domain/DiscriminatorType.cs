namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Defines the type of discriminator used to differentiate slices.
/// </summary>
public enum DiscriminatorType
{
    /// <summary>
    /// Discriminates based on the value of an element.
    /// </summary>
    Value,

    /// <summary>
    /// Discriminates based on pattern matching of an element.
    /// </summary>
    Pattern,

    /// <summary>
    /// Discriminates based on the type of an element.
    /// </summary>
    Type,

    /// <summary>
    /// Discriminates based on the StructureDefinition profile URL.
    /// </summary>
    Profile
}
