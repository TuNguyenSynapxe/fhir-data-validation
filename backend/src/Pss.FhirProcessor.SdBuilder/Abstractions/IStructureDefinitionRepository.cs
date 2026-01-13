namespace Pss.FhirProcessor.SdBuilder.Abstractions;

/// <summary>
/// Repository for loading FHIR StructureDefinitions.
/// </summary>
public interface IStructureDefinitionRepository
{
    /// <summary>
    /// Finds a StructureDefinition by canonical URL.
    /// </summary>
    /// <param name="url">Canonical URL of the StructureDefinition.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The StructureDefinition if found, null otherwise.</returns>
    Task<object?> FindByUrlAsync(string url, CancellationToken ct);
}
