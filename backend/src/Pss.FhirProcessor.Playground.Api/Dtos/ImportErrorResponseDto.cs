namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Error response DTO for import failures.
/// </summary>
public sealed class ImportErrorResponseDto
{
    /// <summary>
    /// Error code categorizing the failure.
    /// </summary>
    public string Error { get; init; } = string.Empty;

    /// <summary>
    /// Human-readable error message.
    /// </summary>
    public string Message { get; init; } = string.Empty;

    /// <summary>
    /// Optional additional context about the error.
    /// </summary>
    public Dictionary<string, object>? Context { get; init; }
}
