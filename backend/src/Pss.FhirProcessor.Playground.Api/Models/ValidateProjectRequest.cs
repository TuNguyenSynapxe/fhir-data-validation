using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Request to validate a project's bundle
/// </summary>
public class ValidateProjectRequest
{
    [JsonPropertyName("bundleJson")]
    public string? BundleJson { get; set; }

    /// <summary>
    /// Validation mode: "fast" (skip lint, production) or "debug" (include lint, development)
    /// </summary>
    [JsonPropertyName("validationMode")]
    public string? ValidationMode { get; set; }
}
