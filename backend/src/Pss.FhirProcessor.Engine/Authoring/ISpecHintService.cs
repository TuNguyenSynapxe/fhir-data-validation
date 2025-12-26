using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Authoring;

/// <summary>
/// Service that provides advisory hints about HL7 FHIR required fields.
/// This does NOT enforce validation - it only surfaces guidance.
/// Only runs in full analysis mode.
/// </summary>
public interface ISpecHintService
{
    /// <summary>
    /// Checks a bundle for missing HL7 required fields using JSON-based analysis.
    /// This is the primary method that ALWAYS runs, even when Firely parsing fails.
    /// POCO bundle is optional and used only for advanced hints when available.
    /// </summary>
    /// <param name="bundleJson">Raw JSON string of the bundle (REQUIRED)</param>
    /// <param name="fhirVersion">FHIR version (e.g., "R4")</param>
    /// <param name="bundlePoco">Parsed POCO bundle (OPTIONAL - may be null if Firely parse failed)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of spec hint issues (empty if none found)</returns>
    Task<List<SpecHintIssue>> CheckAsync(string bundleJson, string fhirVersion, Bundle? bundlePoco = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Legacy POCO-only method for backward compatibility.
    /// Internally calls the JSON-based method with serialized bundle.
    /// </summary>
    [Obsolete("Use CheckAsync(string bundleJson, string fhirVersion, Bundle? bundlePoco) instead")]
    Task<List<SpecHintIssue>> CheckAsync(Bundle bundle, string fhirVersion, CancellationToken cancellationToken = default);
}
