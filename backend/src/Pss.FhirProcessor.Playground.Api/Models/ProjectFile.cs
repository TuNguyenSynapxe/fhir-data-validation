namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Represents a file stored within a project
/// </summary>
public class ProjectFile
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public required string FileType { get; set; } // "rules", "codemaster", "bundle"
    public required string Content { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
