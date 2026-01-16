using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Terminology.ImportTool.Models;

/// <summary>
/// Serializable ValueSet registry entry (deterministic output).
/// </summary>
public sealed class ValueSetRegistryEntry
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
    
    [JsonPropertyName("expansionStrategy")]
    public required ExpansionStrategyType ExpansionStrategy { get; init; }
    
    [JsonPropertyName("capability")]
    public required ValueSetCapabilityType Capability { get; init; }
    
    [JsonPropertyName("explicitCodes")]
    public List<ExplicitCodeEntry>? ExplicitCodes { get; init; }
    
    [JsonPropertyName("composeIncludes")]
    public List<ComposeIncludeEntry>? ComposeIncludes { get; init; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ExpansionStrategyType
{
    ExplicitCodes,
    ComposeIncludes,
    Unsupported
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ValueSetCapabilityType
{
    Previewable,
    ExternalSystem,
    Computed
}

public sealed class ExplicitCodeEntry
{
    [JsonPropertyName("system")]
    public string? System { get; init; }
    
    [JsonPropertyName("code")]
    public required string Code { get; init; }
    
    [JsonPropertyName("display")]
    public string? Display { get; init; }
}

public sealed class ComposeIncludeEntry
{
    [JsonPropertyName("system")]
    public required string System { get; init; }
    
    [JsonPropertyName("includeAll")]
    public bool IncludeAll { get; init; }
    
    [JsonPropertyName("concepts")]
    public List<string>? Concepts { get; init; }
}
