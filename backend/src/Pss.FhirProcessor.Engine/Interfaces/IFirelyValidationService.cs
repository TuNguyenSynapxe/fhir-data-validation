using Hl7.Fhir.Model;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Performs FHIR structural validation using Firely SDK
/// </summary>
public interface IFirelyValidationService
{
    /// <summary>
    /// Validates a FHIR bundle against the base FHIR specification
    /// Returns OperationOutcome with structural validation issues
    /// </summary>
    Task<OperationOutcome> ValidateAsync(Bundle bundle, string fhirVersion, CancellationToken cancellationToken = default);
}
