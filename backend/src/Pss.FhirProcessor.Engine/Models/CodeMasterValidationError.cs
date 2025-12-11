namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Validation error from CodeMaster validation
/// </summary>
public class CodeMasterValidationError
{
    public required string Severity { get; set; }
    public required string ResourceType { get; set; }
    public required string Path { get; set; }
    public string? ErrorCode { get; set; }
    public required string Message { get; set; }
    public Dictionary<string, object>? Details { get; set; }
    public int? EntryIndex { get; set; }
    public string? ResourceId { get; set; }
}
