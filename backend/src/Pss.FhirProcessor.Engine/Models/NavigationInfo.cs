using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Navigation metadata for smart path resolution as per docs/07_smart_path_navigation.md
/// </summary>
public class NavigationInfo
{
    /// <summary>
    /// JSON pointer path (e.g., /entry/2/resource/component/0/valueString)
    /// </summary>
    [JsonPropertyName("jsonPointer")]
    public string? JsonPointer { get; set; }
    
    /// <summary>
    /// Breadcrumb trail for UI navigation
    /// </summary>
    [JsonPropertyName("breadcrumbs")]
    public List<string> Breadcrumbs { get; set; } = new();
    
    /// <summary>
    /// Whether the path exists in the bundle
    /// </summary>
    [JsonPropertyName("exists")]
    public bool Exists { get; set; }
    
    /// <summary>
    /// List of missing parent nodes if path does not exist
    /// </summary>
    [JsonPropertyName("missingParents")]
    public List<string> MissingParents { get; set; } = new();
}
