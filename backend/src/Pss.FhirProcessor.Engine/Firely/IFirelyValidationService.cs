using Hl7.Fhir.Model;

namespace Pss.FhirProcessor.Engine.Firely;

/// <summary>
/// Performs FHIR structural validation using Firely SDK
/// Uses node-based validation to collect ALL structural issues without fail-fast behavior
/// </summary>
public interface IFirelyValidationService
{
    /// <summary>
    /// Validates raw FHIR bundle JSON against the FHIR R4 specification
    /// Returns OperationOutcome with ALL structural validation issues collected in one pass
    /// 
    /// When bundleProfileStructureDefinitionJson is provided, validates against the profile.
    /// When null, validates against base FHIR R4 (backward compatible).
    /// </summary>
    /// <param name="bundleJson">Raw JSON string of the FHIR bundle</param>
    /// <param name="fhirVersion">FHIR version (only R4 is supported)</param>
    /// <param name="bundleProfileStructureDefinitionJson">Optional Bundle profile StructureDefinition JSON</param>
    /// <param name="bundleProfileCanonicalUrl">Optional canonical URL of the profile</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>OperationOutcome containing all validation issues</returns>
    Task<OperationOutcome> ValidateAsync(
        string bundleJson, 
        string fhirVersion, 
        string? bundleProfileStructureDefinitionJson = null,
        string? bundleProfileCanonicalUrl = null,
        CancellationToken cancellationToken = default);
}
