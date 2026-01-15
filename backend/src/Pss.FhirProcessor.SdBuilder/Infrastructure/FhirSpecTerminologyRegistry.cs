using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.Terminology.Abstractions;

namespace Pss.FhirProcessor.SdBuilder.Infrastructure;

/// <summary>
/// Terminology registry adapter that delegates to ITerminologyService.
/// Bridges SD Builder with the new Terminology DLL.
/// </summary>
public sealed class FhirSpecTerminologyRegistry : ITerminologyRegistry
{
    private readonly ITerminologyService _terminologyService;

    public FhirSpecTerminologyRegistry(ITerminologyService terminologyService)
    {
        _terminologyService = terminologyService;
    }

    /// <summary>
    /// Checks if a ValueSet exists by delegating to TerminologyService.
    /// </summary>
    public async Task<bool> ValueSetExistsAsync(string url, CancellationToken ct)
    {
        return await _terminologyService.ExistsAsync(url, ct);
    }
}
