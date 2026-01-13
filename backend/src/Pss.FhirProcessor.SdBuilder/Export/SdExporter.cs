namespace Pss.FhirProcessor.SdBuilder.Export;

using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Exports StructureDefinition with differential only.
/// NO snapshot generation, NO validation.
/// </summary>
public static class SdExporter
{
    /// <summary>
    /// Exports a complete StructureDefinition from design state.
    /// </summary>
    /// <param name="design">The design state.</param>
    /// <param name="baseSd">The base StructureDefinition (must have snapshot).</param>
    /// <param name="meta">Metadata for the exported StructureDefinition.</param>
    /// <returns>A valid StructureDefinition with differential only.</returns>
    public static StructureDefinition Export(
        ResourceDesignState design,
        StructureDefinition baseSd,
        SdMetadata meta)
    {
        if (design == null) throw new ArgumentNullException(nameof(design));
        if (baseSd == null) throw new ArgumentNullException(nameof(baseSd));
        if (meta == null) throw new ArgumentNullException(nameof(meta));

        var sd = new StructureDefinition
        {
            // Metadata
            Url = meta.Url,
            Name = meta.Name,
            Version = meta.Version,
            Status = MapPublicationStatus(meta.Status),
            Description = new Markdown(meta.Description),

            // Structural properties
            Kind = StructureDefinition.StructureDefinitionKind.Resource,
            Abstract = false,
            Type = design.ResourceType,
            BaseDefinition = baseSd.Url,
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,

            // FHIR version
            FhirVersion = FHIRVersion.N4_0_1,

            // Differential only (no snapshot)
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = DifferentialWriter.GenerateDifferential(design, baseSd)
            }
        };

        return sd;
    }

    private static PublicationStatus? MapPublicationStatus(string status)
    {
        return status?.ToLowerInvariant() switch
        {
            "draft" => PublicationStatus.Draft,
            "active" => PublicationStatus.Active,
            "retired" => PublicationStatus.Retired,
            _ => PublicationStatus.Draft
        };
    }
}
