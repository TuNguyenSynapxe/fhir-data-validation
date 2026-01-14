using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Pss.FhirProcessor.SdBuilder.Export;

namespace Pss.FhirProcessor.SdBuilder.Adapters.R5;

/// <summary>
/// FHIR R5 adapter for SD Builder.
/// Delegates to existing Phase 3 components without modification.
/// </summary>
public sealed class SdFhirR5Adapter : ISdFhirAdapter
{
    public FhirVersion Version => FhirVersion.R5;

    private readonly IStructureDefinitionRepository _repository;
    private readonly SdImportEngine _importer;

    public SdFhirR5Adapter(IStructureDefinitionRepository repository)
    {
        _repository = repository;
        _importer = new SdImportEngine();
    }

    /// <summary>
    /// Load base StructureDefinition from repository.
    /// </summary>
    public async Task<StructureDefinition> LoadBaseAsync(string canonicalUrl)
    {
        var result = await _repository.FindByUrlAsync(canonicalUrl, CancellationToken.None);
        return result as StructureDefinition
            ?? throw new InvalidOperationException(
                $"Base StructureDefinition not found: {canonicalUrl}"
            );
    }

    /// <summary>
    /// Import using Phase 3 SdImportEngine (requires base + profile).
    /// </summary>
    public ResourceDesignState Import(StructureDefinition sd)
    {
        // For import, we need the base SD too
        // The calling code must provide the profile SD, and we'll load the base
        var baseSd = LoadBaseAsync(sd.BaseDefinition).GetAwaiter().GetResult();
        return _importer.Import(baseSd, sd);
    }

    /// <summary>
    /// Export using Phase 3 SdExporter (requires base SD).
    /// </summary>
    public StructureDefinition Export(ResourceDesignState design, SdMetadata metadata)
    {
        // For export, we need the base SD
        var baseUrl = $"http://hl7.org/fhir/StructureDefinition/{design.ResourceType}";
        var baseSd = LoadBaseAsync(baseUrl).GetAwaiter().GetResult();
        return SdExporter.Export(design, baseSd, metadata);
    }
}
