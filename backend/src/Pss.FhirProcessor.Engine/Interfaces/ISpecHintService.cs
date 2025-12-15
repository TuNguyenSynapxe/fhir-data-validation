using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Service that provides advisory hints about HL7 FHIR required fields.
/// This does NOT enforce validation - it only surfaces guidance.
/// Only runs in debug mode.
/// </summary>
public interface ISpecHintService
{
    /// <summary>
    /// Checks a bundle for missing HL7 required fields and returns advisory hints.
    /// This is non-blocking and does not affect validation outcome.
    /// </summary>
    /// <param name="bundle">FHIR Bundle to check</param>
    /// <param name="fhirVersion">FHIR version (e.g., "R4")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of spec hint issues (empty if none found)</returns>
    Task<List<SpecHintIssue>> CheckAsync(Bundle bundle, string fhirVersion, CancellationToken cancellationToken = default);
}
