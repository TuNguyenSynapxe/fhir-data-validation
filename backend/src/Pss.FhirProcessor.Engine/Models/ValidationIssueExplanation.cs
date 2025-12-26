using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Structured explanation for a validation issue.
/// 
/// AUTHORING/UX METADATA: This field provides human-readable guidance for developers
/// in the Playground authoring environment. It does not affect validation decisions.
/// 
/// Runtime DLL consumers can safely ignore this field or set ValidationMode="standard"
/// to avoid generating explanations entirely.
/// 
/// Content:
/// - "what": Explains the validation rule or constraint
/// - "how": Actionable fix guidance (only when high confidence)
/// - "confidence": Reliability indicator (high/medium/low)
/// 
/// Provides context and actionable guidance without blocking validation.
/// </summary>
public class ValidationIssueExplanation
{
    /// <summary>
    /// What this validation check means.
    /// Always present - explains the rule or constraint.
    /// </summary>
    [JsonPropertyName("what")]
    public string What { get; set; } = string.Empty;
    
    /// <summary>
    /// How to fix this issue (optional).
    /// Only provided when we have high confidence in the fix.
    /// Null when the fix is context-dependent or unclear.
    /// </summary>
    [JsonPropertyName("how")]
    public string? How { get; set; }
    
    /// <summary>
    /// Confidence level in the explanation accuracy.
    /// "high" - Project rules with explicit definitions
    /// "medium" - FHIR structural, SpecHint with known patterns
    /// "low" - Lint heuristics, inferred checks
    /// </summary>
    [JsonPropertyName("confidence")]
    public string Confidence { get; set; } = "medium";
}

/// <summary>
/// Rule explanation metadata for rule authoring.
/// Generated when rules are created, editable by users.
/// NOT exported to IG - only message is exported.
/// </summary>
public class RuleExplanation
{
    /// <summary>
    /// What this rule enforces.
    /// Auto-generated from rule type and metadata.
    /// </summary>
    [JsonPropertyName("what")]
    public string What { get; set; } = string.Empty;
    
    /// <summary>
    /// How to satisfy this rule.
    /// Auto-generated with token replacement.
    /// </summary>
    [JsonPropertyName("how")]
    public string How { get; set; } = string.Empty;
    
    /// <summary>
    /// Confidence is always "high" for project rules.
    /// </summary>
    [JsonPropertyName("confidence")]
    public string Confidence { get; set; } = "high";
}
