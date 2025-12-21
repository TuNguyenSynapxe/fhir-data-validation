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
    
    /// <summary>
    /// Converts quality findings to unified error format.
    /// Quality findings are advisory checks marked with source="LINT".
    /// These are NON-BLOCKING and informational only - they guide, not fail.
    /// </summary>
    Task<List<ValidationError>> FromQualityFindingsAsync(IReadOnlyList<QualityFinding> findings, Bundle? bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Legacy method for backward compatibility.
    /// Use FromQualityFindingsAsync instead.
    /// </summary>
    [Obsolete("Use FromQualityFindingsAsync - clarifies non-blocking, advisory nature")]
    Task<List<ValidationError>> FromLintIssuesAsync(IReadOnlyList<LintIssue> lintIssues, Bundle? bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts spec hint issues to unified error format.
    /// Spec hints are advisory HL7 required field guidance marked with source="SPEC_HINT".
    /// These are NON-BLOCKING and informational only.
    /// </summary>
    Task<List<ValidationError>> FromSpecHintIssuesAsync(List<SpecHintIssue> issues, Bundle bundle, CancellationToken cancellationToken = default);
}
