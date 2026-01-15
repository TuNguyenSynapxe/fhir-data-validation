using Pss.FhirProcessor.Terminology.Abstractions;
using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.Terminology.Sources.Hl7;

/// <summary>
/// HL7 FHIR ValueSet source (seed-based MVP).
/// No Firely usage - works with in-memory registry.
/// </summary>
public sealed class Hl7ValueSetSource : IValueSetSource
{
    private readonly Hl7R5Registry _registry;
    
    public TerminologyLayer Layer => TerminologyLayer.Hl7;
    
    public Hl7ValueSetSource()
    {
        _registry = new Hl7R5Registry();
    }
    
    public Task<IReadOnlyList<ValueSetSummary>> SearchAsync(
        ValueSetSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var results = _registry.Search(request.Query);
        return Task.FromResult(results);
    }
    
    public Task<ValueSetPreview?> PreviewAsync(
        string url,
        int maxItems = 50,
        CancellationToken cancellationToken = default)
    {
        // Cap maxItems to safe default
        var cappedMaxItems = Math.Max(1, Math.Min(maxItems, 200));
        var preview = _registry.Preview(url, cappedMaxItems);
        return Task.FromResult(preview);
    }
    
    public Task<bool> ExistsAsync(
        string url,
        CancellationToken cancellationToken = default)
    {
        var exists = _registry.Contains(url);
        return Task.FromResult(exists);
    }
}
