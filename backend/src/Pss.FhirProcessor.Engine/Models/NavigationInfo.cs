using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Navigation metadata for smart path resolution as per docs/07_smart_path_navigation.md
/// 
/// DEPRECATION NOTE (Phase 1 Audit - Dec 2025):
/// - navigation.jsonPointer: Redundant with top-level ValidationError.JsonPointer. Use top-level instead.
/// - navigation.breadcrumbs: Frontend derives breadcrumbs from ValidationError.Path. No longer populated.
/// 
/// Removal target: Q1 2026
/// </summary>
public class NavigationInfo
{
    /// <summary>
    /// JSON pointer path (e.g., /entry/2/resource/component/0/valueString)
    /// 
    /// DEPRECATED: Use ValidationError.JsonPointer instead.
    /// This field is kept for backward compatibility during migration.
    /// </summary>
    [JsonPropertyName("jsonPointer")]
    [Obsolete("Use ValidationError.JsonPointer top-level field instead. This will be removed in Q1 2026.")]
    public string? JsonPointer { get; set; }
    
    /// <summary>
    /// Breadcrumb trail for UI navigation
    /// 
    /// DEPRECATED: Frontend derives breadcrumbs from ValidationError.Path using formatSmartPath().
    /// This field is no longer populated and will be removed.
    /// </summary>
    [JsonPropertyName("breadcrumbs")]
    [Obsolete("Frontend derives breadcrumbs from path field. This will be removed in Q1 2026.")]
    public List<string> Breadcrumbs { get; set; } = new();
    
    // REMOVED (Phase 1 Audit - Dec 2025): navigation.exists - No frontend usage found
    // REMOVED (Phase 1 Audit - Dec 2025): navigation.missingParents - No frontend usage found
}
