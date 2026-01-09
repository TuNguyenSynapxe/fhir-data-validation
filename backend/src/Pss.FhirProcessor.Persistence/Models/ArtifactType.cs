namespace Pss.FhirProcessor.Persistence.Models;

/// <summary>
/// Type of artifact in the FHIR ecosystem.
/// </summary>
public enum ArtifactType
{
    StructureDefinition,
    ValueSet,
    CodeSystem,
    Bundle,
    Example,
    Guide,
    Other
}
