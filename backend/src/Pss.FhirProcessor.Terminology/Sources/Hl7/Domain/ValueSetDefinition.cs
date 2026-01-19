namespace Pss.FhirProcessor.Terminology.Sources.Hl7.Domain;

/// <summary>
/// Lightweight ValueSet representation for terminology lookup.
/// No Firely SDK dependencies - pure domain model.
/// Supports both explicit code lists and compose-based definitions.
/// </summary>
internal sealed class ValueSetDefinition
{
    public required string Url { get; init; }
    public required string Name { get; init; }
    public string? Version { get; init; }
    public string? Title { get; init; }
    public string? Publisher { get; init; }
    public string? Description { get; init; }
    
    /// <summary>
    /// Expansion strategy for this ValueSet.
    /// </summary>
    public required ExpansionStrategy Strategy { get; init; }
    
    /// <summary>
    /// Explicit codes (when strategy is ExplicitCodes).
    /// </summary>
    public IReadOnlyList<CodeDefinition>? ExplicitCodes { get; init; }
    
    /// <summary>
    /// Compose includes (when strategy is ComposeIncludes).
    /// </summary>
    public IReadOnlyList<ComposeInclude>? ComposeIncludes { get; init; }
}

/// <summary>
/// Strategy for expanding a ValueSet into codes.
/// </summary>
internal enum ExpansionStrategy
{
    /// <summary>
    /// ValueSet contains explicit list of codes (expansion.contains).
    /// </summary>
    ExplicitCodes,
    
    /// <summary>
    /// ValueSet uses compose.include to reference CodeSystems.
    /// </summary>
    ComposeIncludes,
    
    /// <summary>
    /// ValueSet cannot be expanded offline (uses filters, complex logic).
    /// </summary>
    Unsupported
}

/// <summary>
/// A single code in a ValueSet expansion.
/// </summary>
internal sealed class CodeDefinition
{
    public required string Code { get; init; }
    public required string Display { get; init; }
    public string? System { get; init; }
}

/// <summary>
/// A compose.include element referencing a CodeSystem.
/// </summary>
internal sealed class ComposeInclude
{
    public required string System { get; init; }
    public IReadOnlyList<string>? Concepts { get; init; } // Specific codes to include
    public bool IncludeAll => Concepts == null || Concepts.Count == 0;
}
