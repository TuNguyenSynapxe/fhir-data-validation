namespace Pss.FhirProcessor.Terminology.Domain;

/// <summary>
/// Individual code from a ValueSet.
/// No Firely references - pure domain model.
/// </summary>
public sealed class ValueSetCode
{
    public required string Code { get; init; }
    public string? Display { get; init; }
}
