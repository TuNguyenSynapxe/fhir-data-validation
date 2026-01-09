namespace Pss.FhirProcessor.Playground.Api.Dtos.Validation;

/// <summary>
/// Error response DTO for validation execution failures.
/// Phase 8.2: Maps ValidationExecutionException to HTTP responses.
/// </summary>
public sealed record ValidationExecutionErrorDto
{
    /// <summary>
    /// Error code from ValidationExecutionException.
    /// Values: PROJECT_NOT_FOUND, BUNDLE_NOT_FOUND, INVALID_BUNDLE_JSON,
    /// NO_STRUCTURE_DEFINITIONS, VALIDATION_ENGINE_FAILURE, CANCELLED
    /// </summary>
    public required string Code { get; init; }

    /// <summary>
    /// Human-readable error message.
    /// </summary>
    public required string Message { get; init; }
}
