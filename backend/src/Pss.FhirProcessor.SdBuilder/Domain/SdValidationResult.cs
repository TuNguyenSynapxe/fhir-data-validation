namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Result of SD authoring validation.
/// </summary>
public sealed class SdValidationResult
{
    private readonly List<SdValidationIssue> _issues = new();

    /// <summary>
    /// All validation issues (errors and warnings).
    /// </summary>
    public IReadOnlyList<SdValidationIssue> Issues => _issues;

    /// <summary>
    /// Whether any errors exist (blocks export).
    /// </summary>
    public bool HasErrors => _issues.Any(i => i.Severity == SdValidationSeverity.Error);

    /// <summary>
    /// Adds an error to the validation result.
    /// </summary>
    public void AddError(string code, string message, string? path = null)
    {
        _issues.Add(new SdValidationIssue
        {
            Path = path,
            Code = code,
            Message = message,
            Severity = SdValidationSeverity.Error
        });
    }

    /// <summary>
    /// Adds a warning to the validation result.
    /// </summary>
    public void AddWarning(string code, string message, string? path = null)
    {
        _issues.Add(new SdValidationIssue
        {
            Path = path,
            Code = code,
            Message = message,
            Severity = SdValidationSeverity.Warning
        });
    }
}
