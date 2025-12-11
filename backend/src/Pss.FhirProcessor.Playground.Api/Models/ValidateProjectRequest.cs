using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Request to validate a project's bundle
/// </summary>
public class ValidateProjectRequest
{
    [JsonPropertyName("bundleJson")]
    public string? BundleJson { get; set; }
}
