using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Pre-FHIR structural lint validation service.
/// Performs best-effort checks on raw JSON to surface multiple issues at once.
/// 
/// IMPORTANT: This is NOT authoritative FHIR validation.
/// - Does not replace Firely validation
/// - Does not use FHIR POCOs
/// - Does not enforce semantic rules
/// - Results are advisory for improved developer UX
/// 
/// Firely validation remains the only source of truth for FHIR compliance.
/// </summary>
public interface ILintValidationService
{
    /// <summary>
    /// Performs best-effort structural lint checks on raw FHIR JSON.
    /// Returns multiple issues without fail-fast behavior.
    /// </summary>
    /// <param name="bundleJson">Raw FHIR Bundle JSON string</param>
    /// <param name="fhirVersion">FHIR version (e.g., "R4")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of lint issues (empty if no issues detected)</returns>
    Task<IReadOnlyList<LintIssue>> ValidateAsync(
        string bundleJson,
        string fhirVersion,
        CancellationToken cancellationToken = default);
}
