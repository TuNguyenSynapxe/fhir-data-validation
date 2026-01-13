namespace Pss.FhirProcessor.SdBuilder.Abstractions;

/// <summary>
/// Registry for terminology resources (ValueSets, CodeSystems).
/// </summary>
public interface ITerminologyRegistry
{
    /// <summary>
    /// Checks if a ValueSet exists by canonical URL.
    /// </summary>
    /// <param name="url">Canonical URL of the ValueSet.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>True if the ValueSet exists, false otherwise.</returns>
    Task<bool> ValueSetExistsAsync(string url, CancellationToken ct);
}
