namespace Pss.FhirProcessor.Terminology.Sources.Hl7.Domain;

/// <summary>
/// Lightweight CodeSystem representation for terminology lookup.
/// No Firely SDK dependencies - pure domain model.
/// </summary>
internal sealed class CodeSystemDefinition
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public string? Version { get; init; }
    public string? Title { get; init; }
    public string? Publisher { get; init; }
    public string? Description { get; init; }
    public required IReadOnlyList<ConceptDefinition> Concepts { get; init; }
    
    /// <summary>
    /// Finds a concept by code (case-sensitive).
    /// </summary>
    public ConceptDefinition? FindConcept(string code)
    {
        return Concepts.FirstOrDefault(c => c.Code == code);
    }
}

/// <summary>
/// Represents a single concept in a CodeSystem.
/// </summary>
internal sealed class ConceptDefinition
{
    public required string Code { get; init; }
    public required string Display { get; init; }
    public string? Definition { get; init; }
}
