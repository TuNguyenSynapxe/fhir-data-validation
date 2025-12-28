using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Phase 8: Standardized response for rule save operations with governance enforcement.
/// NO PROSE - structured findings only.
/// </summary>
public class RuleReviewResponse
{
    /// <summary>
    /// Overall governance status: OK, WARNING, or BLOCKED
    /// </summary>
    [JsonPropertyName("status")]
    public required string Status { get; set; }
    
    /// <summary>
    /// Governance findings (structured, no prose)
    /// </summary>
    [JsonPropertyName("findings")]
    public List<RuleReviewFinding> Findings { get; set; } = new();
    
    /// <summary>
    /// Optional: The saved project (returned only if save succeeded)
    /// </summary>
    [JsonPropertyName("project")]
    public Project? Project { get; set; }
}

/// <summary>
/// Individual governance finding (structured, no prose)
/// </summary>
public class RuleReviewFinding
{
    /// <summary>
    /// Governance issue code (e.g., "GOV_MISSING_ERROR_CODE")
    /// </summary>
    [JsonPropertyName("code")]
    public required string Code { get; set; }
    
    /// <summary>
    /// Severity: OK, WARNING, or BLOCKED
    /// </summary>
    [JsonPropertyName("severity")]
    public required string Severity { get; set; }
    
    /// <summary>
    /// Rule ID that has the issue
    /// </summary>
    [JsonPropertyName("ruleId")]
    public required string RuleId { get; set; }
    
    /// <summary>
    /// Structured facts about the issue (no prose)
    /// </summary>
    [JsonPropertyName("details")]
    public Dictionary<string, object>? Details { get; set; }
}
