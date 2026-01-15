namespace Pss.FhirProcessor.Terminology.ImportTool;

/// <summary>
/// Result of importing HL7 R5 terminology package.
/// </summary>
public sealed class ImportResult
{
    public int CodeSystemCount { get; init; }
    public int ValueSetCount { get; init; }
    public int IndexEntryCount { get; init; }
    public List<string> Warnings { get; init; } = new();
}
