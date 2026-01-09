namespace Pss.FhirProcessor.Playground.Api.Dtos.Validation;

/// <summary>
/// Request DTO for executing validation on an imported project bundle.
/// Phase 8.2: Thin HTTP boundary for Phase 8.1 validation execution service.
/// </summary>
public sealed record ExecuteValidationRequest
{
    /// <summary>
    /// Optional policy mode override.
    /// If null, uses the project's configured PolicyMode.
    /// Valid values: "strict", "permissive"
    /// </summary>
    public string? PolicyMode { get; init; }
}
