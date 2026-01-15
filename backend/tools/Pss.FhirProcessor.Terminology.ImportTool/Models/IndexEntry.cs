using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Terminology.ImportTool.Models;

/// <summary>
/// Search index entry for fast terminology search.
/// </summary>
public sealed class IndexEntry
{
    [JsonPropertyName("url")]
    public required string Url { get; init; }
    
    [JsonPropertyName("resourceType")]
    public required string ResourceType { get; init; }
    
    [JsonPropertyName("name")]
    public required string Name { get; init; }
    
    [JsonPropertyName("title")]
    public string? Title { get; init; }
    
    [JsonPropertyName("publisher")]
    public string? Publisher { get; init; }
    
    [JsonPropertyName("description")]
    public string? Description { get; init; }
}
