namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// A single validation issue from SD authoring validation.
/// </summary>
public sealed class SdValidationIssue
{
    /// <summary>
    /// Element path where the issue occurred (if applicable).
    /// </summary>
    public string? Path { get; set; }

    /// <summary>
    /// Error code (e.g., "required-excluded", "invalid-binding").
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Severity (Error or Warning).
    /// </summary>
    public SdValidationSeverity Severity { get; set; }
}
