namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Defines metadata for a single lint validation rule.
/// This is pure metadata - no validation logic.
/// </summary>
public class LintRuleDefinition
{
    /// <summary>
    /// Stable rule identifier (e.g., "LINT_INVALID_JSON")
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Rule category for grouping and filtering
    /// </summary>
    public LintRuleCategory Category { get; set; }

    /// <summary>
    /// Short human-readable title
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Plain English description of what this rule checks
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Default severity level
    /// </summary>
    public string Severity { get; set; } = "error";

    /// <summary>
    /// Confidence level of the lint check
    /// </summary>
    public string Confidence { get; set; } = "high";

    /// <summary>
    /// FHIR versions this rule applies to (e.g., ["R4"], ["R5"], ["R4","R5"])
    /// </summary>
    public List<string> ApplicableFhirVersions { get; set; } = new();

    /// <summary>
    /// Required disclaimer text for this rule
    /// </summary>
    public string Disclaimer { get; set; } = string.Empty;
}

/// <summary>
/// Categories for lint rules
/// </summary>
public enum LintRuleCategory
{
    /// <summary>
    /// JSON syntax and parsing issues
    /// </summary>
    Json,

    /// <summary>
    /// FHIR structural issues (Bundle, entry, resource structure)
    /// </summary>
    Structure,

    /// <summary>
    /// Schema-based shape validation (array vs object)
    /// </summary>
    SchemaShape,

    /// <summary>
    /// Primitive data type validation (date, dateTime, boolean)
    /// </summary>
    Primitive,

    /// <summary>
    /// Version compatibility and interoperability
    /// </summary>
    Compatibility
}
