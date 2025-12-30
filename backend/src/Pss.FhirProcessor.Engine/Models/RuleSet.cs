using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Rule set definition from rules.json
/// </summary>
public class RuleSet
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0";
    
    [JsonPropertyName("project")]
    public string? Project { get; set; }
    
    [JsonPropertyName("fhirVersion")]
    public string FhirVersion { get; set; } = "R4";
    
    [JsonPropertyName("rules")]
    public List<RuleDefinition> Rules { get; set; } = new();
}

/// <summary>
/// Individual rule definition as per docs/03_rule_dsl_spec.md
/// </summary>
public class RuleDefinition
{
    /// <summary>
    /// Unique rule identifier
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }
    
    /// <summary>
    /// Rule type: Required, FixedValue, AllowedValues, Regex, Reference, ArrayLength, CodeSystem, CustomFHIRPath
    /// </summary>
    [JsonPropertyName("type")]
    public required string Type { get; set; }
    
    /// <summary>
    /// Resource type this rule applies to
    /// </summary>
    [JsonPropertyName("resourceType")]
    public required string ResourceType { get; set; }
    
    /// <summary>
    /// STRUCTURED: Defines which instances of the resource type to validate.
    /// Replaces legacy string-based [*], [0], .where() notation.
    /// </summary>
    [JsonPropertyName("instanceScope")]
    public InstanceScope? InstanceScope { get; set; }
    
    /// <summary>
    /// STRUCTURED: FHIRPath expression relative to a single resource instance.
    /// Must NOT contain resource type prefix, [*], [0], or resource-level .where()
    /// Examples: "gender", "name.family", "identifier.value"
    /// </summary>
    [JsonPropertyName("fieldPath")]
    public string? FieldPath { get; set; }
    
    /// <summary>
    /// Severity: error, warning, info
    /// </summary>
    [JsonPropertyName("severity")]
    public string Severity { get; set; } = "error";
    
    /// <summary>
    /// Validation classification to control severity downgrade behavior.
    /// Defaults to Advisory to preserve existing behavior for rules that don't specify this field.
    /// - Contract: Never downgrade (e.g., QuestionAnswer system/code mapping)
    /// - Structural: Never downgrade (e.g., FHIR required fields)
    /// - Advisory: May downgrade for low-confidence or heuristic validations
    /// </summary>
    [JsonPropertyName("validationClass")]
    public ValidationClass ValidationClass { get; set; } = ValidationClass.Advisory;
    
    /// <summary>
    /// OPTIONAL: Error code for backend-determined error classification.
    /// This field is backend-owned and determined at runtime based on rule type.
    /// Frontend does NOT need to supply this during rule authoring.
    /// 
    /// BACKWARD COMPATIBILITY: Existing rules.json files with errorCode will continue to work.
    /// The value is ignored by execution - backend assigns appropriate errorCode based on rule type.
    /// 
    /// NOTE: This field will be removed in a future version after frontend migration.
    /// </summary>
    [JsonPropertyName("errorCode")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ErrorCode { get; set; }
    
    /// <summary>
    /// OPTIONAL: Short contextual hint (max 60 chars, NOT a sentence)
    /// Examples: "Vitals observation", "Medication code"
    /// Displayed as subtitle in UI, not used for prose generation
    /// </summary>
    [JsonPropertyName("userHint")]
    public string? UserHint { get; set; }
    
    /// <summary>
    /// Rule-specific parameters
    /// </summary>
    [JsonPropertyName("params")]
    public Dictionary<string, object>? Params { get; set; }
}
