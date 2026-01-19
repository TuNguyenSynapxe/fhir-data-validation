namespace Pss.FhirProcessor.Playground.Api.Models;

// ============================================================================
// Request DTOs
// ============================================================================

/// <summary>
/// Request to search for ValueSets.
/// </summary>
public sealed record ValueSetSearchRequest
{
    public string? Query { get; init; }
    public string? ResourceType { get; init; }
    public string? ElementPath { get; init; }
    public int Limit { get; init; } = 20;
}

/// <summary>
/// Request to preview a ValueSet's codes.
/// </summary>
public sealed record ValueSetPreviewRequest
{
    public required string Url { get; init; }
    public int MaxItems { get; init; } = 50;
}

// ============================================================================
// Response DTOs
// ============================================================================

/// <summary>
/// Summary of a ValueSet for search results.
/// </summary>
public sealed record ValueSetSummaryDto
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public string? Publisher { get; init; }
    public string? Description { get; init; }
}

/// <summary>
/// Preview of a ValueSet's codes.
/// </summary>
public sealed record ValueSetPreviewDto
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public required IReadOnlyList<CodeDisplayDto> Codes { get; init; }
}

/// <summary>
/// A single code with display.
/// </summary>
public sealed record CodeDisplayDto
{
    public required string Code { get; init; }
    public string? Display { get; init; }
}
