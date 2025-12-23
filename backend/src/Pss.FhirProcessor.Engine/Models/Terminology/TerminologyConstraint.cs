using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models.Terminology;

/// <summary>
/// Project-specific terminology constraint model.
/// Defines validation rules that reference CodeSystem concepts.
/// 
/// Key principles:
/// - References FHIR codes directly via system + code
/// - No internal IDs
/// - If referenced code changes in CodeSystem, report via Rule Advisory
/// - Fully editable
/// </summary>
public class TerminologyConstraint
{
    /// <summary>
    /// Unique identifier for this constraint (e.g., "TERM-001")
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// Human-readable name for this constraint
    /// </summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Description of what this constraint validates
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// FHIR resource type this constraint applies to (e.g., "Observation", "Condition")
    /// </summary>
    [JsonPropertyName("resourceType")]
    public required string ResourceType { get; set; }

    /// <summary>
    /// FHIRPath expression to the element being constrained
    /// (e.g., "Observation.code", "Condition.code.coding")
    /// </summary>
    [JsonPropertyName("path")]
    public required string Path { get; set; }

    /// <summary>
    /// Type of constraint: "required" | "allowedValues" | "binding"
    /// </summary>
    [JsonPropertyName("constraintType")]
    public required string ConstraintType { get; set; }

    /// <summary>
    /// Binding strength if constraintType is "binding": "required" | "extensible" | "preferred" | "example"
    /// </summary>
    [JsonPropertyName("bindingStrength")]
    public string? BindingStrength { get; set; }

    /// <summary>
    /// Reference to the CodeSystem URL this constraint uses
    /// (e.g., "http://terminology.hl7.org/CodeSystem/observation-category")
    /// </summary>
    [JsonPropertyName("valueSetUrl")]
    public string? ValueSetUrl { get; set; }

    /// <summary>
    /// Specific allowed codes from the referenced CodeSystem
    /// Each item references a concept by system + code (no internal IDs)
    /// </summary>
    [JsonPropertyName("allowedAnswers")]
    public List<AllowedAnswer> AllowedAnswers { get; set; } = new();

    /// <summary>
    /// Severity of violation: "error" | "warning" | "information"
    /// </summary>
    [JsonPropertyName("severity")]
    public string Severity { get; set; } = "error";

    /// <summary>
    /// Error message to display when constraint is violated
    /// </summary>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    /// <summary>
    /// Whether this constraint is currently active
    /// </summary>
    [JsonPropertyName("active")]
    public bool Active { get; set; } = true;

    /// <summary>
    /// Additional metadata or configuration
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, object>? Metadata { get; set; }
}
