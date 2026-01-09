namespace Pss.FhirProcessor.Application.Public.Dtos;

/// <summary>
/// Standard error response for public API endpoints.
/// Phase 9.5a: Public Anonymous Validation Playground.
/// </summary>
public sealed class PublicApiErrorDto
{
    public string Code { get; init; } = default!;
    public string Message { get; init; } = default!;
}
