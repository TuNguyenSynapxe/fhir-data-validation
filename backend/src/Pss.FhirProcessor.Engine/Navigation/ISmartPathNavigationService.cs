using System.Text.Json;
using Hl7.Fhir.Model;

namespace Pss.FhirProcessor.Engine.Navigation;

/// <summary>
/// Converts FHIRPath and Firely paths to JSON pointers as defined in docs/07_smart_path_navigation.md
/// </summary>
public interface ISmartPathNavigationService
{
    /// <summary>
    /// Resolves a FHIRPath expression to a JSON pointer for navigation.
    /// Navigation operates on raw JSON to ensure deterministic behavior.
    /// Returns null if path cannot be resolved.
    /// </summary>
    /// <param name="rawBundleJson">Raw JSON for navigation - preserves original structure</param>
    /// <param name="bundle">Optional Bundle POCO for resource-level where() filtering</param>
    Task<string?> ResolvePathAsync(JsonElement rawBundleJson, Bundle? bundle, string path, string? resourceType = null, int? entryIndex = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Legacy overload - Navigation must use raw JSON to avoid POCO normalization issues.
    /// </summary>
    [Obsolete("Use ResolvePathAsync(JsonElement rawBundleJson, ...) to ensure consistent navigation behavior regardless of POCO parsing success")]
    Task<string?> ResolvePathAsync(Bundle bundle, string path, string? resourceType = null, int? entryIndex = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Finds the entry index for a resource by reference (urn:uuid or resourceType/id)
    /// </summary>
    int? FindEntryIndexByReference(Bundle bundle, string reference);
    
    /// <summary>
    /// Finds the entry index for a resource by type and id
    /// </summary>
    int? FindEntryIndexByResourceId(Bundle bundle, string resourceType, string resourceId);
}
