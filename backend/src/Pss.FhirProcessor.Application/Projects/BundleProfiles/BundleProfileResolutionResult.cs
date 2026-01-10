using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.BundleProfiles;

/// <summary>
/// Phase 8.3: Result of bundle profile resolution.
/// </summary>
public sealed class BundleProfileResolutionResult
{
    /// <summary>
    /// State of the resolution.
    /// </summary>
    public BundleProfileState State { get; }

    /// <summary>
    /// Resolved StructureDefinition ID (only for RESOLVED state).
    /// </summary>
    public Guid? StructureDefinitionId { get; }

    /// <summary>
    /// How the association was determined.
    /// </summary>
    public BundleProfileSelectionSource? Source { get; }

    private BundleProfileResolutionResult(
        BundleProfileState state,
        Guid? structureDefinitionId,
        BundleProfileSelectionSource? source)
    {
        State = state;
        StructureDefinitionId = structureDefinitionId;
        Source = source;
    }

    public static BundleProfileResolutionResult Resolved(
        Guid structureDefinitionId,
        BundleProfileSelectionSource source) =>
        new(BundleProfileState.Resolved, structureDefinitionId, source);

    public static BundleProfileResolutionResult Unresolved() =>
        new(BundleProfileState.Unresolved, null, null);

    public static BundleProfileResolutionResult Unprofiled(BundleProfileSelectionSource source) =>
        new(BundleProfileState.Unprofiled, null, source);
}

/// <summary>
/// Phase 8.3: Bundle profile resolution state.
/// </summary>
public enum BundleProfileState
{
    /// <summary>
    /// Linked to a Bundle StructureDefinition.
    /// Validation applies: Base FHIR + Project Rules.
    /// </summary>
    Resolved,

    /// <summary>
    /// No confident match found.
    /// Validation applies: Base FHIR only.
    /// </summary>
    Unresolved,

    /// <summary>
    /// Explicitly chosen "no profile".
    /// Validation applies: Base FHIR only.
    /// </summary>
    Unprofiled
}
