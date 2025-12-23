using Hl7.Fhir.Model;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Converts FHIRPath and Firely paths to JSON pointers as defined in docs/07_smart_path_navigation.md
/// </summary>
public interface ISmartPathNavigationService
{
    /// <summary>
    /// Resolves a FHIRPath expression to a JSON pointer for navigation.
    /// Returns null if path cannot be resolved.
    /// </summary>
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
