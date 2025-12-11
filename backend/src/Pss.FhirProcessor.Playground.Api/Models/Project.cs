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
}
