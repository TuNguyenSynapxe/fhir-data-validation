namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Lightweight metadata for project listing
/// </summary>
public class ProjectMetadata
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string FhirVersion { get; set; } = "R4";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool HasRules { get; set; }
    public bool HasCodeMaster { get; set; }
    public bool HasSampleBundle { get; set; }
}
