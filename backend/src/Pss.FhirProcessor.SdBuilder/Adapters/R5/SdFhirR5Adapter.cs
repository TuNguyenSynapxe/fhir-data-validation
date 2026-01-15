using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Pss.FhirProcessor.SdBuilder.Export;
using Pss.FhirProcessor.Terminology.Abstractions;
using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.SdBuilder.Adapters.R5;

/// <summary>
/// FHIR R5 adapter for SD Builder.
/// Delegates to Terminology DLL for all ValueSet operations.
/// </summary>
public sealed class SdFhirR5Adapter : ISdFhirAdapter
{
    public FhirVersion Version => FhirVersion.R5;

    private readonly IStructureDefinitionRepository _repository;
    private readonly ITerminologyService _terminologyService;
    private readonly SdImportEngine _importer;

    public SdFhirR5Adapter(
        IStructureDefinitionRepository repository,
        ITerminologyService terminologyService)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _terminologyService = terminologyService ?? throw new ArgumentNullException(nameof(terminologyService));
        _importer = new SdImportEngine();
    }

    /// <summary>
    /// Load base StructureDefinition from offline repository.
    /// Adapter does NOT know about file paths or package structure.
    /// </summary>
    public async Task<StructureDefinition> LoadBaseAsync(string canonicalUrl)
    {
        var result = await _repository.FindByUrlAsync(canonicalUrl, CancellationToken.None);
        
        if (result is StructureDefinition sd)
        {
            return sd;
        }
        
        // Repository returned null - offline cache missing this SD
        throw new InvalidOperationException(
            $"Base StructureDefinition not found in offline cache: {canonicalUrl}. " +
            "Ensure spec-cache/hl7.fhir.r5.core/ contains required StructureDefinition JSON files. " +
            "Download from: https://hl7.org/fhir/R5/downloads.html");
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

    /// <summary>
    /// Search for ValueSets (delegates to Terminology DLL).
    /// </summary>
    public async Task<IReadOnlyList<ValueSetSummaryDto>> SearchValueSetsAsync(
        ValueSetSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var terminologyRequest = new Pss.FhirProcessor.Terminology.Domain.ValueSetSearchRequest
        {
            Query = request.Query,
            ElementPath = request.ElementPath,
            ResourceType = request.ResourceType
        };

        var results = await _terminologyService.SearchAsync(terminologyRequest, cancellationToken);
        
        // Map Terminology DTOs to Adapter DTOs
        return results
            .Select(MapToValueSetSummaryDto)
            .ToList();
    }

    /// <summary>
    /// Preview ValueSet codes (delegates to Terminology DLL).
    /// </summary>
    public async Task<ValueSetPreviewDto> PreviewValueSetAsync(
        string valueSetUrl,
        int maxItems,
        CancellationToken cancellationToken = default)
    {
        var clampedMax = Math.Clamp(maxItems, 1, 200);

        var preview = await _terminologyService.PreviewAsync(valueSetUrl, clampedMax, cancellationToken);
        
        if (preview == null)
        {
            // Not found - return empty preview
            return new ValueSetPreviewDto
            {
                Url = valueSetUrl,
                Name = valueSetUrl,
                Codes = Array.Empty<CodeDisplayDto>()
            };
        }

        return MapToValueSetPreviewDto(preview);
    }

    /// <summary>
    /// Check if ValueSet exists (delegates to Terminology DLL).
    /// </summary>
    public async Task<bool> ValueSetExistsAsync(
        string valueSetUrl,
        CancellationToken cancellationToken = default)
    {
        return await _terminologyService.ExistsAsync(valueSetUrl, cancellationToken);
    }

    // ========================================================================
    // Terminology DTO Mapping (Terminology Domain → Adapter DTOs)
    // ========================================================================

    private static ValueSetSummaryDto MapToValueSetSummaryDto(Pss.FhirProcessor.Terminology.Domain.ValueSetSummary summary)
    {
        return new ValueSetSummaryDto
        {
            Url = summary.Url,
            Name = summary.Name,
            Publisher = summary.Publisher,
            Description = summary.Description
        };
    }

    private static ValueSetPreviewDto MapToValueSetPreviewDto(Pss.FhirProcessor.Terminology.Domain.ValueSetPreview preview)
    {
        return new ValueSetPreviewDto
        {
            Url = preview.Url,
            Name = preview.Name,
            Codes = preview.Codes.Select(MapToCodeDisplayDto).ToList()
        };
    }

    private static CodeDisplayDto MapToCodeDisplayDto(Pss.FhirProcessor.Terminology.Domain.ValueSetCode code)
    {
        return new CodeDisplayDto
        {
            Code = code.Code,
            Display = code.Display,
            System = null // System not currently stored in Terminology DLL DTOs (future enhancement)
        };
    }
}
