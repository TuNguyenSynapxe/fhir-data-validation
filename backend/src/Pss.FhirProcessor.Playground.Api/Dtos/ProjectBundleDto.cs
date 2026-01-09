using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Phase 7.4: Bundle metadata for validation playground (read-only).
/// </summary>
public class ProjectBundleDto
{
    public Guid BundleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public BundleSource Source { get; set; }
    public DateTime CreatedAt { get; set; }
}
