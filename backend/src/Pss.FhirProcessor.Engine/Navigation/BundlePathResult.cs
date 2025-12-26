namespace Pss.FhirProcessor.Engine.Navigation;

/// <summary>
/// Result containing all discovered paths in a FHIR bundle
/// </summary>
public class BundlePathResult
{
    /// <summary>
    /// List of all unique element paths found in the bundle
    /// Includes array indices (e.g., "Patient.name[0].family")
    /// </summary>
    public List<string> Paths { get; set; } = new();

    /// <summary>
    /// Total number of unique paths discovered
    /// </summary>
    public int TotalPaths { get; set; }

    /// <summary>
    /// Dictionary of paths grouped by resource type
    /// Key: Resource type (e.g., "Patient", "Observation")
    /// Value: List of paths for that resource type
    /// </summary>
    public Dictionary<string, List<string>> PathsByResourceType { get; set; } = new();

    /// <summary>
    /// List of resource types found in the bundle
    /// </summary>
    public List<string> ResourceTypes { get; set; } = new();

    /// <summary>
    /// Total number of resources processed
    /// </summary>
    public int TotalResources { get; set; }
}
