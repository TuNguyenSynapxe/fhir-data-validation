using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Provider for loading FHIR sample JSON files from disk
/// </summary>
public interface IFhirSampleProvider
{
    /// <summary>
    /// Lists available FHIR samples for a given version and resource type
    /// </summary>
    /// <param name="version">FHIR version (e.g., "R4")</param>
    /// <param name="resourceType">FHIR resource type (e.g., "Patient")</param>
    /// <returns>List of sample metadata</returns>
    Task<IReadOnlyList<FhirSampleMetadata>> ListSamplesAsync(
        string version,
        string? resourceType = null);

    /// <summary>
    /// Loads the JSON content of a specific FHIR sample
    /// </summary>
    /// <param name="version">FHIR version (e.g., "R4")</param>
    /// <param name="resourceType">FHIR resource type (e.g., "Patient")</param>
    /// <param name="sampleId">Sample identifier (e.g., "patient-full")</param>
    /// <returns>Raw JSON string</returns>
    Task<string> LoadSampleJsonAsync(
        string version,
        string resourceType,
        string sampleId);
}
