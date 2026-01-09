namespace Pss.FhirProcessor.Application.Public.Dtos;

/// <summary>
/// Response for resolving a public link to project metadata and bundles list.
/// Phase 9.5a: Public Anonymous Validation Playground.
/// </summary>
public sealed class PublicLinkResolveResponseDto
{
    public string PublicId { get; init; } = default!;
    public Guid ProjectId { get; init; }
    public string ProjectName { get; init; } = default!;
    public string PolicyMode { get; init; } = default!; // "strict" | "permissive"
    public IReadOnlyList<PublicBundleListItemDto> Bundles { get; init; } = Array.Empty<PublicBundleListItemDto>();
}

/// <summary>
/// Minimal bundle metadata for public link resolution.
/// </summary>
public sealed class PublicBundleListItemDto
{
    public Guid BundleId { get; init; }
    public string Title { get; init; } = default!;
    public string Source { get; init; } = default!; // matches BundleSource enum string
}
