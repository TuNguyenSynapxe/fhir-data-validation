using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Runtime validation settings for a project
/// Controls validation behavior without modifying rule definitions
/// </summary>
public class ValidationSettings
{
    /// <summary>
    /// Reference resolution policy
    /// - InBundleOnly: All references must exist in bundle (strict, default)
    /// - AllowExternal: External references are permitted and downgraded to warnings (recommended)
    /// - RequireResolution: All references must be resolvable (blocks on any unresolved reference)
    /// </summary>
    [JsonPropertyName("referenceResolutionPolicy")]
    public string ReferenceResolutionPolicy { get; set; } = "InBundleOnly";
}
