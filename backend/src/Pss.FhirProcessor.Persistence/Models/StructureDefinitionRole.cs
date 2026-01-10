namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Phase 10.0: Defines the role of a StructureDefinition during import.
/// Used to determine promotion logic and rule generation behavior.
/// </summary>
public enum StructureDefinitionRole
{
    /// <summary>
    /// Category A: StructureDefinition used for resource validation.
    /// Criteria: kind=="resource", type!=null && type!="Bundle"
    /// Behavior: Promoted as Project SD, auto-rules generated.
    /// </summary>
    ValidationProfile,

    /// <summary>
    /// Category B: StructureDefinition defining Bundle profiles.
    /// Criteria: type=="Bundle", referenced by Bundle.meta.profile
    /// Behavior: Promoted as Project SD, NO auto-rules generated.
    /// </summary>
    BundleProfile,

    /// <summary>
    /// Category C: Supporting artifacts (base definitions, extensions, etc.)
    /// Criteria: Abstract definitions, unused profiles, or no explicit match
    /// Behavior: NOT promoted, stored as artifact only, NO rules.
    /// </summary>
    SupportingArtifact
}
