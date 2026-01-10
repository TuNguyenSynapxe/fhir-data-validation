using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Phase 10.1: Represents a promoted StructureDefinition in a project.
/// Read-only DTO exposing Phase 10.0 classification results.
/// </summary>
public sealed record ProjectStructureDefinitionDto
{
    /// <summary>
    /// Unique identifier of the artifact.
    /// </summary>
    public Guid ArtifactId { get; init; }

    /// <summary>
    /// Display name of the StructureDefinition.
    /// Extracted from title, name, or filename.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Canonical URL of the StructureDefinition.
    /// </summary>
    public string CanonicalUrl { get; init; } = string.Empty;

    /// <summary>
    /// FHIR resource type this SD profiles (e.g., "Patient", "Observation", "Bundle").
    /// </summary>
    public string ResourceType { get; init; } = string.Empty;

    /// <summary>
    /// Phase 10.0 classification role.
    /// Only promoted SDs (ValidationProfile or BundleProfile) are exposed.
    /// </summary>
    public StructureDefinitionRole Role { get; init; }
}
