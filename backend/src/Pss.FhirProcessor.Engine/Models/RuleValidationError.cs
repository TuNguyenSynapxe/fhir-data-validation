namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Validation error from business rule evaluation
/// </summary>
public class RuleValidationError
{
    public required string RuleId { get; set; }
    public required string RuleType { get; set; }
    public required string Severity { get; set; }
    public required string ResourceType { get; set; }
    public required string Path { get; set; }
    public string? ErrorCode { get; set; }
    public required string Message { get; set; }
    public Dictionary<string, object>? Details { get; set; }
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
