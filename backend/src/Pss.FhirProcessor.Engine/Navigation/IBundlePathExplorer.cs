using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Navigation;

/// <summary>
/// Service for exploring and extracting element paths from FHIR bundles
/// </summary>
public interface IBundlePathExplorer
{
    /// <summary>
    /// Extracts all element paths from a FHIR bundle JSON
    /// </summary>
    /// <param name="bundleJson">JSON-encoded FHIR bundle</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result containing all discovered paths</returns>
    Task<BundlePathResult> ExtractPathsAsync(string bundleJson, CancellationToken cancellationToken = default);
}
