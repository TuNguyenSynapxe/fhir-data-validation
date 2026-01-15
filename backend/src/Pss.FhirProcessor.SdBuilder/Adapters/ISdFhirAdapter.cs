using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Export;

namespace Pss.FhirProcessor.SdBuilder.Adapters;

/// <summary>
/// ValueSet search request parameters.
/// </summary>
public sealed record ValueSetSearchRequest
{
    public string? Query { get; init; }
    public string? ResourceType { get; init; }
    public string? ElementPath { get; init; }
    public int Limit { get; init; } = 20;
}

/// <summary>
/// ValueSet summary for search results.
/// </summary>
public sealed record ValueSetSummaryDto
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public string? Publisher { get; init; }
    public string? Description { get; init; }
}

/// <summary>
/// ValueSet preview with codes.
/// </summary>
public sealed record ValueSetPreviewDto
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public required IReadOnlyList<CodeDisplayDto> Codes { get; init; }
}

/// <summary>
/// Code with display.
/// </summary>
public sealed record CodeDisplayDto
{
    public required string Code { get; init; }
    public string? Display { get; init; }
}

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

    /// <summary>
    /// Search for ValueSets (read-only UX helper).
    /// </summary>
    Task<IReadOnlyList<ValueSetSummaryDto>> SearchValueSetsAsync(
        ValueSetSearchRequest request, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Preview ValueSet codes (read-only UX helper).
    /// </summary>
    Task<ValueSetPreviewDto> PreviewValueSetAsync(
        string valueSetUrl, 
        int maxItems, 
        CancellationToken cancellationToken = default);
}
