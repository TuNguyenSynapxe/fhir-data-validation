namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Validation error from business rule evaluation
/// STRUCTURED DATA ONLY - Frontend renders all messages
/// </summary>
public class RuleValidationError
{
    public required string RuleId { get; set; }
    public required string RuleType { get; set; }
    public required string Severity { get; set; }
    public required string ResourceType { get; set; }
    
    /// <summary>
    /// Field path relative to resource (no resource type prefix)
    /// </summary>
    public required string FieldPath { get; set; }
    
    /// <summary>
    /// REQUIRED: Error code for frontend message mapping
    /// </summary>
    public required string ErrorCode { get; set; }
    
    /// <summary>
    /// OPTIONAL: Short contextual hint (max 60 chars, NOT a sentence)
    /// Passthrough from rule definition
    /// </summary>
    public string? UserHint { get; set; }
    
    private Dictionary<string, object>? _details;
    
    /// <summary>
    /// CANONICAL SCHEMA ENFORCEMENT:
    /// Details must match schema for ErrorCode per /docs/validation-error-details-schema.md
    /// Validator runs automatically on set.
    /// </summary>
    public Dictionary<string, object>? Details
    {
        get => _details;
        set
        {
            _details = value;
            // Validate schema if both ErrorCode and Details are present
            if (!string.IsNullOrEmpty(ErrorCode) && _details != null)
            {
                ValidationErrorDetailsValidator.Validate(ErrorCode, _details);
            }
        }
    }
    
    public int? EntryIndex { get; set; }
    public string? ResourceId { get; set; }
    
    /// <summary>
    /// Which engine was used to evaluate this rule: "firely" or "custom"
    /// Added for Firely-preferred with safe fallback strategy
    /// </summary>
    public string? EngineUsed { get; set; }
    
    /// <summary>
    /// Confidence level of the evaluation: "strict" or "best-effort"
    /// "strict" = Firely FHIRPath (high confidence)
    /// "best-effort" = Custom JSON evaluator (works with partial data)
    /// </summary>
    public string? Confidence { get; set; }
    
    /// <summary>
    /// Additional notes about the evaluation (e.g., fallback reasons)
    /// </summary>
    public List<string>? EvaluationNotes { get; set; }
}
