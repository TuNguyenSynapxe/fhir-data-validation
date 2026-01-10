namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Source of bundle profile selection.
/// Phase 8.3: Tracks how Bundle ↔ StructureDefinition association was determined.
/// </summary>
public enum BundleProfileSelectionSource
{
    /// <summary>
    /// Automatically resolved via meta.profile or filename matching.
    /// </summary>
    Auto,

    /// <summary>
    /// Manually selected by admin user.
    /// </summary>
    Manual
}
