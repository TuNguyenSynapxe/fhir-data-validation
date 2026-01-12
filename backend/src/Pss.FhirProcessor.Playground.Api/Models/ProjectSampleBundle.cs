namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Sample Bundle scoped to a StructureDefinition for validation and rule authoring
/// </summary>
public class ProjectSampleBundle
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string StructureDefinitionCanonicalUrl { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string BundleJson { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Project? Project { get; set; }
}
