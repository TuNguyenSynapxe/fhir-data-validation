using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Validates resource references within a bundle
/// </summary>
public interface IReferenceResolver
{
    /// <summary>
    /// Ensures:
    /// - Referenced resources exist in bundle
    /// - Reference type matches allowed target types
    /// - Reference format is valid (urn:uuid, resourceType/id)
    /// </summary>
    Task<List<ReferenceValidationError>> ValidateAsync(Bundle bundle, CancellationToken cancellationToken = default);
}
