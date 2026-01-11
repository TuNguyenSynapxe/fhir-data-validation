using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;

namespace Pss.FhirProcessor.Engine.Firely;

/// <summary>
/// Phase 11: Firely .NET SDK Validator integration for authoritative StructureDefinition validation.
/// 
/// Purpose: Validates FHIR resources against StructureDefinition profiles using Firely's official validator.
/// Returns ALL validation issues in a single OperationOutcome (non-fail-fast).
/// 
/// This is the NEW validator service introduced in Phase 11.
/// Complements (and eventually replaces) the custom SdConstraintValidationService from Phase 2.2.
/// </summary>
public interface IFirelyProfileValidator
{
    /// <summary>
    /// Validates a FHIR resource against zero or more StructureDefinition profiles.
    /// 
    /// Behavior:
    /// - When profileCanonicalUrls is empty: validates against base FHIR constraints only
    /// - When profileCanonicalUrls contains 1+ URLs: validates against those profiles
    /// - Returns ALL issues found (non-fail-fast)
    /// - Does NOT throw exceptions for validation failures
    /// 
    /// The resolver must include:
    /// - Core FHIR R5 specifications (base resources, data types)
    /// - Project-specific StructureDefinitions (if validating against custom profiles)
    /// </summary>
    /// <param name="resource">Parsed FHIR resource (typically a Bundle)</param>
    /// <param name="fhirVersion">FHIR version (e.g., "5.0.0")</param>
    /// <param name="resolver">Resource resolver containing SDs and ValueSets</param>
    /// <param name="profileCanonicalUrls">Zero or more profile canonical URLs to validate against</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>OperationOutcome with all validation issues (empty if valid)</returns>
    Task<OperationOutcome> ValidateAsync(
        Resource resource,
        string fhirVersion,
        IResourceResolver resolver,
        IReadOnlyCollection<string> profileCanonicalUrls,
        CancellationToken cancellationToken = default);
}
