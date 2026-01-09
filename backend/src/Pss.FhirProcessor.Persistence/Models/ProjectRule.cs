namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Represents a validation rule in a project.
/// </summary>
public sealed class ProjectRule
{
    /// <summary>
    /// Unique identifier for the rule.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Foreign key to the project.
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// Scope of the rule (Project or Bundle).
    /// </summary>
    public RuleScope Scope { get; set; }

    /// <summary>
    /// Type of rule (ProfileDerived, FhirPathCustom, Other).
    /// </summary>
    public RuleType RuleType { get; set; }

    /// <summary>
    /// Provenance of the rule (ImportedGenerated, ManualCustom).
    /// </summary>
    public RuleProvenance Provenance { get; set; }

    /// <summary>
    /// Human-readable name of the rule.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the rule.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// FHIRPath expression for the rule (if applicable).
    /// </summary>
    public string? Expression { get; set; }

    /// <summary>
    /// Severity level: 'error', 'warning', 'info'.
    /// </summary>
    public string Severity { get; set; } = "error";

    /// <summary>
    /// Error code for the rule (used in validation output).
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// Full rule definition stored as JSONB.
    /// </summary>
    public string RuleDefinitionJson { get; set; } = string.Empty;

    /// <summary>
    /// When the rule was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// When the rule was last updated.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>
    /// Navigation property: Parent project.
    /// </summary>
    public Project Project { get; set; } = null!;
}
