namespace Pss.FhirProcessor.Terminology.Domain;

/// <summary>
/// ValueSet summary for search results.
/// No Firely references - pure domain model.
/// </summary>
public sealed class ValueSetSummary
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public required string Publisher { get; init; }
    public string? Description { get; init; }
}
