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
    /// AUTHORING MODE ONLY: Project ID for loading project-specific master data (Questions, QuestionSets, etc.).
    /// 
    /// Runtime DLL consumers should leave this null and pass all configuration as JSON strings
    /// (RulesJson, CodesJson, CodeMasterJson, ProjectJson).
    /// 
    /// When provided, the engine will attempt to load Questions/QuestionSets from a database,
    /// which is only available in the Playground authoring environment.
    /// </summary>
    [JsonPropertyName("projectId")]
    public string? ProjectId { get; set; }
    
    /// <summary>
    /// Validation mode: controls which validation checks are executed.
    /// 
    /// Modes:
    /// - "standard" (default): Runtime-friendly mode with blocking checks only
    ///   * FHIR structural validation (Firely)
    ///   * Business rules (FHIRPath)
    ///   * CodeMaster validation
    ///   * Reference validation
    ///   
    /// - "full": Authoring mode with all checks including advisory/UX features
    ///   * All "standard" checks
    ///   * Lint quality hints (best-effort, non-blocking)
    ///   * SpecHint guidance (HL7 required fields advisory)
    ///   * System rule suggestions (pattern analysis)
    ///   * Full explanations (what/how/confidence)
    ///   
    /// Runtime DLL consumers should use "standard" or leave null.
    /// Both modes produce identical blocking validation decisions - only advisory metadata differs.
    /// </summary>
    [JsonPropertyName("validationMode")]
    public string? ValidationMode { get; set; } = "standard";
    
    /// <summary>
    /// Runtime validation settings (optional)
    /// Controls validation behavior without modifying rule definitions
    /// </summary>
    [JsonPropertyName("validationSettings")]
    public ValidationSettings? ValidationSettings { get; set; }
}
