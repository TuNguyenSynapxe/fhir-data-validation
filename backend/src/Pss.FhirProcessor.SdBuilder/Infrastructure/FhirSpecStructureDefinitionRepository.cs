using Hl7.Fhir.Specification.Source;
using Pss.FhirProcessor.SdBuilder.Abstractions;

namespace Pss.FhirProcessor.SdBuilder.Infrastructure;

/// <summary>
/// Repository that loads base FHIR StructureDefinitions from Firely SDK ZipSource.
/// Used for SD Builder to access core FHIR specs.
/// </summary>
public sealed class FhirSpecStructureDefinitionRepository : IStructureDefinitionRepository
{
    private readonly IResourceResolver _resolver;

    public FhirSpecStructureDefinitionRepository()
    {
        // Use ZipSource to load from embedded FHIR R5 spec
        // The specification.zip is provided by Hl7.Fhir.Specification.R5 package
        _resolver = ZipSource.CreateValidationSource();
    }

    /// <summary>
    /// Finds a StructureDefinition by canonical URL from FHIR spec.
    /// </summary>
    public Task<object?> FindByUrlAsync(string url, CancellationToken ct)
    {
        var result = _resolver.ResolveByCanonicalUri(url);
        return Task.FromResult<object?>(result);
    }
}
