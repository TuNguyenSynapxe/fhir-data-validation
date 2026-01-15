namespace Pss.FhirProcessor.Terminology.Domain;

/// <summary>
/// ValueSet search request parameters.
/// No Firely references - pure domain model.
/// </summary>
public sealed class ValueSetSearchRequest
{
    public string? Query { get; init; }
    public string? ElementPath { get; init; }
    public string? ResourceType { get; init; }
}
