using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Terminology.ImportTool.Models;

/// <summary>
/// Serializable CodeSystem registry entry (deterministic output).
/// </summary>
public sealed class CodeSystemRegistryEntry
{
    [JsonPropertyName("url")]
    public required string Url { get; init; }
    
    [JsonPropertyName("version")]
    public string? Version { get; init; }
    
    [JsonPropertyName("name")]
    public required string Name { get; init; }
    
    [JsonPropertyName("title")]
    public string? Title { get; init; }
    
    [JsonPropertyName("description")]
    public string? Description { get; init; }
    
    [JsonPropertyName("publisher")]
    public string? Publisher { get; init; }
    
    [JsonPropertyName("concepts")]
    public required List<ConceptEntry> Concepts { get; init; }
}

/// <summary>
/// Minimal concept entry (code + display only).
/// </summary>
public sealed class ConceptEntry
{
    [JsonPropertyName("code")]
    public required string Code { get; init; }
    
    [JsonPropertyName("display")]
    public string? Display { get; init; }
}
