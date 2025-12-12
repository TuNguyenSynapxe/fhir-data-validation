using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Service that provides FHIR model resolution.
/// Currently supports FHIR R4 only.
/// FHIR R5 support will be added in a future release by introducing FhirR5ModelResolverService and a factory.
/// </summary>
public interface IFhirModelResolverService
{
    /// <summary>
    /// Gets the FHIR version supported by this resolver
    /// </summary>
    FhirVersion Version { get; }

    /// <summary>
    /// Gets the resource resolver for loading StructureDefinitions
    /// </summary>
    IResourceResolver GetResolver();

    /// <summary>
    /// Gets a specific StructureDefinition by resource type
    /// </summary>
    /// <param name="resourceType">The FHIR resource type (e.g., "Patient", "Observation")</param>
    /// <returns>The StructureDefinition or null if not found</returns>
    StructureDefinition? GetStructureDefinition(string resourceType);
}
