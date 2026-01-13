namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Indicates how a bundle is associated to a StructureDefinition.
/// </summary>
public enum BundleTaggingMode
{
    /// <summary>
    /// No association to any StructureDefinition.
    /// </summary>
    None,

    /// <summary>
    /// Automatically tagged via bundle meta.profile canonical URL matching.
    /// </summary>
    Auto,

    /// <summary>
    /// Manually associated by user (does not modify bundle JSON).
    /// </summary>
    Manual
}
