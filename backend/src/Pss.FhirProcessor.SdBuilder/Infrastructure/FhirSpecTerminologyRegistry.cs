using Hl7.Fhir.Specification.Source;
using Pss.FhirProcessor.SdBuilder.Abstractions;

namespace Pss.FhirProcessor.SdBuilder.Infrastructure;

/// <summary>
/// Terminology registry that checks ValueSets from Firely SDK ZipSource.
/// Used for SD Builder validation.
/// </summary>
public sealed class FhirSpecTerminologyRegistry : ITerminologyRegistry
{
    private readonly IResourceResolver _resolver;

    public FhirSpecTerminologyRegistry()
    {
        // Use ZipSource to load from embedded FHIR spec
        _resolver = ZipSource.CreateValidationSource();
    }

    /// <summary>
    /// Checks if a ValueSet exists in FHIR spec.
    /// </summary>
    public Task<bool> ValueSetExistsAsync(string url, CancellationToken ct)
    {
        var result = _resolver.ResolveByCanonicalUri(url);
        return Task.FromResult(result != null);
    }
}
