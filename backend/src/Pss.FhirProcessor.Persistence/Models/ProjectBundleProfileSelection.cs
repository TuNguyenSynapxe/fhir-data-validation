namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Phase 8.3: Association between ProjectBundle and Bundle StructureDefinition.
/// 
/// Determines validation scope:
/// - StructureDefinitionId != null → RESOLVED (apply project rules)
/// - StructureDefinitionId == null AND record exists → UNPROFILED (base FHIR only)
/// - No record → UNRESOLVED (base FHIR only)
/// 
/// NO validation logic here - pure data association.
/// </summary>
public sealed class ProjectBundleProfileSelection
{
    /// <summary>
    /// Unique identifier for this association.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Foreign key to ProjectBundle.
    /// </summary>
    public Guid ProjectBundleId { get; set; }

    /// <summary>
    /// Foreign key to StructureDefinition artifact (Bundle profile).
    /// NULL = explicitly unprofiled (admin chose "no profile").
    /// </summary>
    public Guid? StructureDefinitionId { get; set; }

    /// <summary>
    /// How this association was determined.
    /// </summary>
    public BundleProfileSelectionSource Source { get; set; }

    /// <summary>
    /// When this association was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    // Navigation properties
    public ProjectBundle? Bundle { get; set; }
    public ProjectArtifact? StructureDefinition { get; set; }
}
