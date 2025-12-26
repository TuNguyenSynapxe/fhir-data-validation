namespace Pss.FhirProcessor.Engine.Navigation.Structure;

/// <summary>
/// DLL-SAFE: Provides structural hints for FHIR JSON navigation.
/// No POCO usage. No Firely dependency.
/// 
/// Purpose: Inform JsonPointerResolver about FHIR structure semantics
/// without hard-coding heuristics or loading schemas at runtime.
/// </summary>
public interface IFhirStructureHintProvider
{
    /// <summary>
    /// Indicates whether a property is repeating (array) at this path.
    /// Example: Observation.performer, Patient.identifier
    /// </summary>
    /// <param name="resourceType">FHIR resource type (e.g., "Observation", "Patient")</param>
    /// <param name="propertyPath">Dot-separated property path (e.g., "code.coding", "performer")</param>
    /// <returns>True if the property is defined as repeating in FHIR spec</returns>
    bool IsRepeating(string resourceType, string propertyPath);

    /// <summary>
    /// Indicates whether a property represents a FHIR Reference structure.
    /// </summary>
    /// <param name="resourceType">FHIR resource type</param>
    /// <param name="propertyPath">Dot-separated property path</param>
    /// <returns>True if the property is a Reference type</returns>
    bool IsReference(string resourceType, string propertyPath);
}
