using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Request to save sample bundle for a project
/// </summary>
public class SaveBundleRequest
{
    [JsonPropertyName("bundleJson")]
    public required string BundleJson { get; set; }
}
