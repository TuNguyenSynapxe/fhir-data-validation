using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Application.Public.Dtos;

/// <summary>
/// Response for public bundle validation.
/// Phase 9.5a: Wraps validation results in public-friendly format.
/// </summary>
public sealed class PublicExecuteValidationResponseDto
{
    public string PublicId { get; init; } = default!;
    public Guid ProjectId { get; init; }
    public Guid BundleId { get; init; }
    public PublicValidationPayload Validation { get; init; } = default!;
}

/// <summary>
/// Public validation payload (same structure as Phase 8.2 ExecuteValidationResponse).
/// Phase 9.5a: Reuses engine models for consistency.
/// </summary>
public sealed class PublicValidationPayload
{
    public Guid ProjectId { get; init; }
    public Guid BundleId { get; init; }
    public string PolicyMode { get; init; } = default!;
    public List<ValidationError> Issues { get; init; } = new();
    public ValidationSummary Summary { get; init; } = default!;
}
