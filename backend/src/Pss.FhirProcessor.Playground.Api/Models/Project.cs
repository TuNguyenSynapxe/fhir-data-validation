namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Represents a validation project containing rules, codemaster, and sample data
/// </summary>
public class Project
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string FhirVersion { get; set; } = "R4";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? RulesJson { get; set; }
    public string? CodeMasterJson { get; set; }
    public string? SampleBundleJson { get; set; }
    
    /// <summary>
    /// Runtime validation settings (separate from rule definitions)
    /// </summary>
    public string? ValidationSettingsJson { get; set; }
    
    /// <summary>
    /// Feature flags JSON storage (serialized ProjectFeatures)
    /// Stores per-project feature toggles as JSON
    /// Persisted to file, also exposed in API for debugging
    /// </summary>
    public string? FeaturesJson { get; set; }
    
    /// <summary>
    /// Feature flags for controlling access to experimental features
    /// Mapped from FeaturesJson on load, serialized back on save
    /// Always returned in API responses (never null)
    /// </summary>
    public ProjectFeatures Features { get; set; } = new();
}
