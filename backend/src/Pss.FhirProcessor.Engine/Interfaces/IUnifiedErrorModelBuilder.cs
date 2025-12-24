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
    /// <param name="outcome">Firely validation outcome</param>
    /// <param name="rawBundleJson">Original raw JSON - used for navigation to ensure deterministic jsonPointer resolution</param>
    /// <param name="bundle">Parsed Bundle POCO - used for reference lookup only</param>
    Task<List<ValidationError>> FromFirelyIssuesAsync(OperationOutcome outcome, string rawBundleJson, Bundle bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts business rule errors to unified error format
    /// </summary>
    /// <param name="errors">Business rule validation errors</param>
    /// <param name="rawBundleJson">Original raw JSON - used for navigation to ensure deterministic jsonPointer resolution</param>
    /// <param name="bundle">Parsed Bundle POCO - used for reference lookup only</param>
    Task<List<ValidationError>> FromRuleErrorsAsync(List<RuleValidationError> errors, string rawBundleJson, Bundle bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts CodeMaster errors to unified error format
    /// </summary>
    /// <param name="errors">CodeMaster validation errors</param>
    /// <param name="rawBundleJson">Original raw JSON - used for navigation to ensure deterministic jsonPointer resolution</param>
    /// <param name="bundle">Parsed Bundle POCO - used for reference lookup only</param>
    Task<List<ValidationError>> FromCodeMasterErrorsAsync(List<CodeMasterValidationError> errors, string rawBundleJson, Bundle bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts reference errors to unified error format
    /// </summary>
    /// <param name="errors">Reference validation errors</param>
    /// <param name="rawBundleJson">Original raw JSON - used for navigation to ensure deterministic jsonPointer resolution</param>
    /// <param name="bundle">Parsed Bundle POCO - used for reference lookup only</param>
    Task<List<ValidationError>> FromReferenceErrorsAsync(List<ReferenceValidationError> errors, string rawBundleJson, Bundle bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts quality findings to unified error format.
    /// Quality findings are advisory checks marked with source="LINT".
    /// These are NON-BLOCKING and informational only - they guide, not fail.
    /// </summary>
    /// <param name="findings">Quality findings from linting checks</param>
    /// <param name="rawBundleJson">Original raw JSON - used for navigation to ensure deterministic jsonPointer resolution (optional for quality findings)</param>
    /// <param name="bundle">Parsed Bundle POCO - used for reference lookup only</param>
    Task<List<ValidationError>> FromQualityFindingsAsync(IReadOnlyList<QualityFinding> findings, string? rawBundleJson, Bundle? bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Legacy method for backward compatibility.
    /// Use FromQualityFindingsAsync instead.
    /// </summary>
    [Obsolete("Use FromQualityFindingsAsync - clarifies non-blocking, advisory nature")]
    Task<List<ValidationError>> FromLintIssuesAsync(IReadOnlyList<LintIssue> lintIssues, string? rawBundleJson, Bundle? bundle, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Converts spec hint issues to unified error format.
    /// Spec hints are advisory HL7 required field guidance marked with source="SPEC_HINT".
    /// These are NON-BLOCKING and informational only.
    /// </summary>
    /// <param name="issues">Spec hint issues</param>
    /// <param name="rawBundleJson">Original raw JSON - used for navigation to ensure deterministic jsonPointer resolution</param>
    /// <param name="bundle">Parsed Bundle POCO - used for reference lookup only (nullable)</param>
    Task<List<ValidationError>> FromSpecHintIssuesAsync(List<SpecHintIssue> issues, string rawBundleJson, Bundle? bundle, CancellationToken cancellationToken = default);
}
