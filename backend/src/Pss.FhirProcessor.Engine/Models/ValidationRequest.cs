using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Request for validation pipeline
/// </summary>
public class ValidationRequest
{
    /// <summary>
    /// FHIR Bundle as JSON string
    /// </summary>
    [JsonPropertyName("bundle")]
    public required string BundleJson { get; set; }
    
    /// <summary>
    /// Rules definition as JSON string
    /// </summary>
    [JsonPropertyName("rules")]
    public string? RulesJson { get; set; }
    
    /// <summary>
    /// CodeSystems definition as JSON string
    /// </summary>
    [JsonPropertyName("codes")]
    public string? CodesJson { get; set; }
    
    /// <summary>
    /// CodeMaster definition as JSON string
    /// </summary>
    [JsonPropertyName("codemaster")]
    public string? CodeMasterJson { get; set; }
    
    /// <summary>
    /// Project configuration as JSON string
    /// </summary>
    [JsonPropertyName("project")]
    public string? ProjectJson { get; set; }
    
    /// <summary>
    /// FHIR version (R4, R4B, R5)
    /// </summary>
    [JsonPropertyName("fhirVersion")]
    public string FhirVersion { get; set; } = "R4";
    
    /// <summary>
    /// Validation mode: "fast" (skip lint and SPEC_HINT, production) or "debug" (include lint and SPEC_HINT, development)
    /// Default: "fast" - lint validation and SPEC_HINT are skipped for performance
    /// "debug" - includes best-effort lint pre-validation checks and advisory HL7 required field hints
    /// </summary>
    [JsonPropertyName("validationMode")]
    public string? ValidationMode { get; set; } = "fast";
    
    /// <summary>
    /// Runtime validation settings (optional)
    /// Controls validation behavior without modifying rule definitions
    /// </summary>
    [JsonPropertyName("validationSettings")]
    public ValidationSettings? ValidationSettings { get; set; }
}
