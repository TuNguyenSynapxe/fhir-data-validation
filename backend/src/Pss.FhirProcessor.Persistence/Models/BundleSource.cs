namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Source of a bundle in the system.
/// </summary>
public enum BundleSource
{
    ImportedExample,
    Uploaded,
    AdHoc
}
