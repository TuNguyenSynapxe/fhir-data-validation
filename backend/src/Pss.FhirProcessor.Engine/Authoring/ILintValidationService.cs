using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Authoring;

/// <summary>
/// Pre-FHIR structural quality validation service.
/// Performs best-effort checks on raw JSON to surface multiple advisory findings at once.
/// 
/// IMPORTANT: This produces ADVISORY findings, not blocking errors.
/// - Does not replace Firely validation
/// - Does not use FHIR POCOs
/// - Does not enforce semantic rules
/// - Results are informational for improved developer UX
/// 
/// Firely validation remains the only source of truth for FHIR compliance.
/// 
/// Renamed from "Lint" to "Quality" to emphasize advisory, non-blocking nature.
/// Mental model: "Quality findings inform validation, not fail validation."
/// </summary>
public interface ILintValidationService
{
    /// <summary>
    /// Performs best-effort structural quality checks on raw FHIR JSON.
    /// Returns multiple advisory findings without fail-fast behavior.
    /// </summary>
    /// <param name="bundleJson">Raw FHIR Bundle JSON string</param>
    /// <param name="fhirVersion">FHIR version (e.g., "R4")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of quality findings (empty if no issues detected)</returns>
    Task<IReadOnlyList<QualityFinding>> ValidateAsync(
        string bundleJson,
        string fhirVersion,
        CancellationToken cancellationToken = default);
}
