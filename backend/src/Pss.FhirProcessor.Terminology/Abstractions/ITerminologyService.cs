using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.Terminology.Abstractions;

/// <summary>
/// Core terminology service contract.
/// Orchestrates multiple ValueSet sources with layer-based precedence.
/// Read-only, no validation, no Firely leakage.
/// </summary>
public interface ITerminologyService
{
    /// <summary>
    /// Search for ValueSets across all sources.
    /// Results are merged and deduplicated by URL, with layer precedence.
    /// </summary>
    Task<IReadOnlyList<ValueSetSummary>> SearchAsync(
        ValueSetSearchRequest request,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Preview codes from a ValueSet.
    /// Returns first non-null preview from highest-priority source.
    /// </summary>
    Task<ValueSetPreview?> PreviewAsync(
        string url,
        int maxItems = 50,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Check if a ValueSet exists in any source.
    /// </summary>
    Task<bool> ExistsAsync(
        string url,
        CancellationToken cancellationToken = default);
}
