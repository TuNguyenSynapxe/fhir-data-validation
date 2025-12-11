using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// CodeSystem definition for terminology validation
/// </summary>
public class CodeSystemDefinition
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0";
    
    [JsonPropertyName("systems")]
    public List<CodeSystem> Systems { get; set; } = new();
}

public class CodeSystem
{
    [JsonPropertyName("system")]
    public required string System { get; set; }
    
    [JsonPropertyName("version")]
    public string? Version { get; set; }
    
    [JsonPropertyName("concepts")]
    public List<Concept> Concepts { get; set; } = new();
}

public class Concept
{
    [JsonPropertyName("code")]
    public required string Code { get; set; }
    
    [JsonPropertyName("display")]
    public string? Display { get; set; }
}
