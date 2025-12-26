using Pss.FhirProcessor.Engine.DTOs;

namespace Pss.FhirProcessor.Engine.RuleEngines;

/// <summary>
/// Service for validating FHIRPath expressions without evaluating them.
/// </summary>
public interface IFhirPathValidationService
{
    /// <summary>
    /// Validates a FHIRPath expression for syntax correctness.
    /// </summary>
    /// <param name="request">The validation request containing resource type, bundle JSON, and FHIRPath expression.</param>
    /// <returns>A validation response indicating whether the expression is valid.</returns>
    Task<FhirPathValidationResponse> ValidateFhirPathAsync(FhirPathValidationRequest request);
}
