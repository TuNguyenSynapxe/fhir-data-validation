using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.Terminology.Abstractions;

/// <summary>
/// ValueSet source contract.
/// Represents a single layer of terminology (HL7, PSS, or Project-specific).
/// </summary>
public interface IValueSetSource
{
    /// <summary>
    /// Layer priority of this source.
    /// </summary>
    TerminologyLayer Layer { get; }
    
    /// <summary>
    /// Search for ValueSets in this source.
    /// </summary>
    Task<IReadOnlyList<ValueSetSummary>> SearchAsync(
        ValueSetSearchRequest request,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Preview codes from a ValueSet in this source.
    /// Returns null if ValueSet not found in this source.
    /// </summary>
    Task<ValueSetPreview?> PreviewAsync(
        string url,
        int maxItems = 50,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Check if a ValueSet exists in this source.
    /// </summary>
    Task<bool> ExistsAsync(
        string url,
        CancellationToken cancellationToken = default);
}
