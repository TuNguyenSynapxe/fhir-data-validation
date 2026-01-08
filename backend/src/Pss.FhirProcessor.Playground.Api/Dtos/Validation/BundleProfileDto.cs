namespace Pss.FhirProcessor.Playground.Api.Dtos.Validation;

/// <summary>
/// DTO for bundle profile information returned to clients.
/// </summary>
public sealed class BundleProfileDto
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string CanonicalUrl { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
}
