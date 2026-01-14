using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Export;

namespace Pss.FhirProcessor.SdBuilder.Adapters;

/// <summary>
/// FHIR version adapter boundary.
/// This is the ONLY place where Firely SDK types cross into SD Builder.
/// </summary>
public interface ISdFhirAdapter
{
    /// <summary>
    /// FHIR version this adapter supports.
    /// </summary>
    FhirVersion Version { get; }

    /// <summary>
    /// Load base StructureDefinition by canonical URL.
    /// </summary>
    Task<StructureDefinition> LoadBaseAsync(string canonicalUrl);

    /// <summary>
    /// Import existing StructureDefinition into design state.
    /// </summary>
    ResourceDesignState Import(StructureDefinition sd);

    /// <summary>
    /// Export design state to StructureDefinition.
    /// </summary>
    StructureDefinition Export(ResourceDesignState design, SdMetadata metadata);
}
