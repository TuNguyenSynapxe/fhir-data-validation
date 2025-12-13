using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Builds unified error model from various validation sources as defined in docs/08_unified_error_model.md
/// </summary>
public interface IUnifiedErrorModelBuilder
{
    /// <summary>
    /// Enhances a Firely parsing error (from deserialization) with navigation context
    /// </summary>
    Task<ValidationError> EnhanceFirelyParsingErrorAsync(ValidationError error, string? rawBundleJson, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts Firely OperationOutcome issues to unified error format
    /// </summary>
    Task<List<ValidationError>> FromFirelyIssuesAsync(OperationOutcome outcome, Bundle bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts business rule errors to unified error format
    /// </summary>
    Task<List<ValidationError>> FromRuleErrorsAsync(List<RuleValidationError> errors, Bundle bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts CodeMaster errors to unified error format
    /// </summary>
    Task<List<ValidationError>> FromCodeMasterErrorsAsync(List<CodeMasterValidationError> errors, Bundle bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts reference errors to unified error format
    /// </summary>
    Task<List<ValidationError>> FromReferenceErrorsAsync(List<ReferenceValidationError> errors, Bundle bundle, CancellationToken cancellationToken = default);
}
