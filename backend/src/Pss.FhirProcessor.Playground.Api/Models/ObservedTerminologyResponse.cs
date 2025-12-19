namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Observed terminology value from sample data
/// </summary>
public class ObservedValue
{
    public required string Value { get; set; }
    public int Count { get; set; }
}

/// <summary>
/// Response model for observed terminology endpoint
/// </summary>
public class ObservedTerminologyResponse
{
    /// <summary>
    /// Map of FHIRPath to observed values
    /// Key: FHIRPath (e.g., "Observation.code.coding.system")
    /// Value: List of observed values with counts
    /// </summary>
    public Dictionary<string, List<ObservedValue>> ObservedValues { get; set; } = new();
}
