using System.Text.Json.Serialization;
using Pss.FhirProcessor.Engine.Authoring;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Response from validation pipeline following docs/08_unified_error_model.md
/// </summary>
public class ValidationResponse
{
    /// <summary>
    /// List of validation errors
    /// </summary>
    [JsonPropertyName("errors")]
    public List<ValidationError> Errors { get; set; } = new();
    
    /// <summary>
    /// Summary statistics
    /// </summary>
    [JsonPropertyName("summary")]
    public ValidationSummary Summary { get; set; } = new();
    
    /// <summary>
    /// Processing metadata
    /// </summary>
    [JsonPropertyName("metadata")]
    public ValidationMetadata Metadata { get; set; } = new();
    
    /// <summary>
    /// System-generated rule suggestions (full analysis mode only)
    /// </summary>
    [JsonPropertyName("suggestions")]
    public List<SystemRuleSuggestion>? Suggestions { get; set; }
}

/// <summary>
/// Summary of validation results
/// </summary>
public class ValidationSummary
{
    [JsonPropertyName("totalErrors")]
    public int TotalErrors { get; set; }
    
    [JsonPropertyName("errorCount")]
    public int ErrorCount { get; set; }
    
    [JsonPropertyName("warningCount")]
    public int WarningCount { get; set; }
    
    [JsonPropertyName("infoCount")]
    public int InfoCount { get; set; }
    
    [JsonPropertyName("lintErrorCount")]
    public int LintErrorCount { get; set; }
    
    [JsonPropertyName("fhirErrorCount")]
    public int FhirErrorCount { get; set; }
    
    [JsonPropertyName("businessErrorCount")]
    public int BusinessErrorCount { get; set; }
    
    [JsonPropertyName("codeMasterErrorCount")]
    public int CodeMasterErrorCount { get; set; }
    
    [JsonPropertyName("referenceErrorCount")]
    public int ReferenceErrorCount { get; set; }
}

/// <summary>
/// Validation processing metadata
/// </summary>
public class ValidationMetadata
{
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    [JsonPropertyName("fhirVersion")]
    public string? FhirVersion { get; set; }
    
    [JsonPropertyName("rulesVersion")]
    public string? RulesVersion { get; set; }
    
    [JsonPropertyName("processingTimeMs")]
    public long ProcessingTimeMs { get; set; }
    
    /// <summary>
    /// Phase 8.4: Validation scope information (Bundle profile state)
    /// </summary>
    [JsonPropertyName("validationScope")]
    public ValidationScope? ValidationScope { get; set; }
}

/// <summary>
/// Phase 8.4: Validation scope information
/// Indicates which rules were applied based on Bundle profile resolution.
/// </summary>
public class ValidationScope
{
    [JsonPropertyName("bundleProfileState")]
    public string BundleProfileState { get; set; } = string.Empty;
    
    [JsonPropertyName("appliedProjectRules")]
    public bool AppliedProjectRules { get; set; }
    
    [JsonPropertyName("structureDefinitionId")]
    public Guid? StructureDefinitionId { get; set; }
    
    [JsonPropertyName("source")]
    public string? Source { get; set; }
    
    /// <summary>
    /// Phase 11: Indicates whether Firely SDK Validator was used for full SD validation.
    /// When true: Full Firely Validator with all SD constraints.
    /// When false: Legacy behavior (basic checks + custom SD validator).
    /// </summary>
    [JsonPropertyName("firelyValidatorUsed")]
    public bool FirelyValidatorUsed { get; set; }
}
