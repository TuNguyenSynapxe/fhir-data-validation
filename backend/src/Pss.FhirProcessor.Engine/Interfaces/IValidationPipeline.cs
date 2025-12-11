using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Orchestrates the complete validation pipeline as defined in docs/05_validation_pipeline.md
/// </summary>
public interface IValidationPipeline
{
    /// <summary>
    /// Executes the full validation workflow:
    /// 1. Input parsing
    /// 2. Firely structural validation
    /// 3. FHIRPath business rule validation
    /// 4. CodeMaster validation
    /// 5. Reference validation
    /// 6. Error aggregation
    /// 7. Smart path navigation mapping
    /// 8. Unified error model assembly
    /// 9. Final API response
    /// </summary>
    Task<ValidationResponse> ValidateAsync(ValidationRequest request, CancellationToken cancellationToken = default);
}
