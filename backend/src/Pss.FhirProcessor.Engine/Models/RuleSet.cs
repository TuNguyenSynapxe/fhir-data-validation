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
    /// FHIRPath expression
    /// </summary>
    [JsonPropertyName("path")]
    public required string Path { get; set; }
    
    /// <summary>
    /// Severity: error, warning, info
    /// </summary>
    [JsonPropertyName("severity")]
    public string Severity { get; set; } = "error";
    
    /// <summary>
    /// Error code for this rule
    /// </summary>
    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }
    
    /// <summary>
    /// Human-readable error message
    /// </summary>
    [JsonPropertyName("message")]
    public required string Message { get; set; }
    
    /// <summary>
    /// Rule-specific parameters
    /// </summary>
    [JsonPropertyName("params")]
    public Dictionary<string, object>? Params { get; set; }
}
