namespace Pss.FhirProcessor.Playground.Api.Dtos.Validation;

/// <summary>
/// Response DTO for validation endpoints.
/// Wraps the engine's ValidationResponse with additional convenience properties.
/// </summary>
public sealed record ValidateResponse
{
    /// <summary>
    /// Overall validation result (true if no errors, false if errors found).
    /// </summary>
    public required bool IsValid { get; init; }

    /// <summary>
    /// Unified validation response from engine (contains all validation errors and metadata).
    /// </summary>
    public required Engine.Models.ValidationResponse EngineResponse { get; init; }
}
