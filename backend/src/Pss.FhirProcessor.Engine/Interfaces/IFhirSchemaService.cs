using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Service for retrieving FHIR R5 schema information
/// Provides flattened structure definition trees for resource types
/// </summary>
public interface IFhirSchemaService
{
    /// <summary>
    /// Gets the schema tree for a FHIR R5 resource type
    /// </summary>
    /// <param name="resourceType">FHIR resource type (e.g., "Patient", "Observation")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Root schema node with all child elements</returns>
    Task<FhirSchemaNode?> GetResourceSchemaAsync(string resourceType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all available FHIR R5 resource types
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of resource type names</returns>
    Task<List<string>> GetAvailableResourceTypesAsync(CancellationToken cancellationToken = default);
}
