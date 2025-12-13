using Hl7.Fhir.Model;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Performs FHIR structural validation using Firely SDK
/// Uses node-based validation to collect ALL structural issues without fail-fast behavior
/// </summary>
public interface IFirelyValidationService
{
    /// <summary>
    /// Validates raw FHIR bundle JSON against the FHIR R4 specification
    /// Returns OperationOutcome with ALL structural validation issues collected in one pass
    /// </summary>
    /// <param name="bundleJson">Raw JSON string of the FHIR bundle</param>
    /// <param name="fhirVersion">FHIR version (only R4 is supported)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>OperationOutcome containing all validation issues</returns>
    Task<OperationOutcome> ValidateAsync(string bundleJson, string fhirVersion, CancellationToken cancellationToken = default);
}
