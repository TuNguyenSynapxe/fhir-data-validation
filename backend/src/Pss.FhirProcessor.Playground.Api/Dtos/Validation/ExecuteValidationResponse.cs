namespace Pss.FhirProcessor.Playground.Api.Dtos.Validation;

/// <summary>
/// Response DTO for validation execution endpoint.
/// Phase 8.2: Wraps Phase 8.1 ValidationResponse with project/bundle context.
/// </summary>
public sealed record ExecuteValidationResponse
{
    /// <summary>
    /// Project ID that was validated.
    /// </summary>
    public required Guid ProjectId { get; init; }

    /// <summary>
    /// Bundle ID that was validated.
    /// </summary>
    public required Guid BundleId { get; init; }

    /// <summary>
    /// Policy mode used for validation.
    /// </summary>
    public required string PolicyMode { get; init; }

    /// <summary>
    /// Validation issues from the engine.
    /// </summary>
    public required List<Engine.Models.ValidationError> Issues { get; init; }

    /// <summary>
    /// Validation summary statistics.
    /// </summary>
    public required Engine.Models.ValidationSummary Summary { get; init; }
}
