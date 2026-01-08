namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Database record for bundle_profiles table.
/// Represents a Bundle StructureDefinition profile for validation scenarios.
/// </summary>
public sealed record BundleProfileRecord
{
    public Guid Id { get; init; }
    public Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required string CanonicalUrl { get; init; }
    public required string StructureDefinitionJson { get; init; }
    public bool IsDefault { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
