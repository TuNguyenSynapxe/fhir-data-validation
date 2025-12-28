namespace Pss.FhirProcessor.Engine.Governance;

/// <summary>
/// Rule review status for governance and quality enforcement.
/// Phase 7: Rule quality control (NOT runtime validation)
/// </summary>
public enum RuleReviewStatus
{
    /// <summary>
    /// Safe, clear, exportable - no issues detected
    /// </summary>
    OK,
    
    /// <summary>
    /// Allowed but risky or ambiguous - requires attention
    /// </summary>
    WARNING,
    
    /// <summary>
    /// Cannot be saved or exported - must be fixed
    /// </summary>
    BLOCKED
}

/// <summary>
/// Single governance issue detected in a rule.
/// Phase 7: Deterministic, metadata-only checks (no prose generation)
/// </summary>
public sealed record RuleReviewIssue(
    /// <summary>
    /// Issue code (e.g., "GENERIC_PATH", "MISSING_ERROR_CODE")
    /// </summary>
    string Code,
    
    /// <summary>
    /// Severity level
    /// </summary>
    RuleReviewStatus Severity,
    
    /// <summary>
    /// Rule ID that has the issue
    /// </summary>
    string RuleId,
    
    /// <summary>
    /// Structured facts about the issue (no prose)
    /// Examples: { "expectedType": "array", "actualType": "string" }
    /// </summary>
    Dictionary<string, object>? Facts = null
);

/// <summary>
/// Complete review result for a single rule.
/// Phase 7: Governance only - does NOT affect runtime validation
/// </summary>
public sealed record RuleReviewResult(
    /// <summary>
    /// Rule ID that was reviewed
    /// </summary>
    string RuleId,
    
    /// <summary>
    /// Overall status: worst issue severity
    /// </summary>
    RuleReviewStatus Status,
    
    /// <summary>
    /// List of all issues found (empty if OK)
    /// </summary>
    IReadOnlyList<RuleReviewIssue> Issues
);
