using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Request to create a new project
/// </summary>
public class CreateProjectRequest
{
    [JsonPropertyName("name")]
    public required string Name { get; set; }
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("fhirVersion")]
    public string FhirVersion { get; set; } = "R4";
}
