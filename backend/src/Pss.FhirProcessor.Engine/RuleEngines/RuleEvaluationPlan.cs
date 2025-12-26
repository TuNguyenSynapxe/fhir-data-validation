using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.RuleEngines;

/// <summary>
/// Evaluation plan for a Project Rule, determining whether to prefer Firely or fallback to custom evaluator.
/// Created BEFORE rule execution to make engine choice explicit and traceable.
/// </summary>
public class RuleEvaluationPlan
{
    /// <summary>
    /// Whether to prefer Firely FHIRPath evaluation.
    /// True only if ALL safety conditions are met.
    /// </summary>
    public bool PreferFirely { get; set; }
    
    /// <summary>
    /// Reasons why Firely was not preferred (empty if PreferFirely is true).
    /// Makes fallback decisions explicit and traceable.
    /// </summary>
    public List<string> FallbackReasons { get; set; } = new();
    
    /// <summary>
    /// The rule this plan applies to
    /// </summary>
    public required string RuleId { get; set; }
}

/// <summary>
/// Result of evaluating a rule with explicit engine tracking
/// </summary>
public class RuleEvaluationResult
{
    /// <summary>
    /// The validation errors found (empty if rule passed)
    /// </summary>
    public List<RuleValidationError> Errors { get; set; } = new();
    
    /// <summary>
    /// Which engine was actually used: "firely" or "custom"
    /// </summary>
    public required string EngineUsed { get; set; }
    
    /// <summary>
    /// Confidence level: "strict" (Firely) or "best-effort" (custom)
    /// </summary>
    public required string Confidence { get; set; }
    
    /// <summary>
    /// Notes about the evaluation (e.g., fallback occurred)
    /// </summary>
    public List<string> EvaluationNotes { get; set; } = new();
}
