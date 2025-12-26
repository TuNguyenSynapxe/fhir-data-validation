using System.Text.Json;

namespace Pss.FhirProcessor.Engine.Navigation;

/// <summary>
/// DLL-SAFE: Pure JSON pointer resolution without POCO dependencies.
/// 
/// Core runtime service for resolving FHIRPath expressions to JSON pointers
/// using only System.Text.Json. No Firely SDK POCO objects required.
/// 
/// For DLL distribution: Runtime consumers should use explicit entryIndex
/// instead of relying on resource-type based inference.
/// </summary>
public interface IJsonPointerResolver
{
    /// <summary>
    /// Resolves a FHIRPath-style path to a JSON pointer.
    /// 
    /// DLL-SAFE: Operates entirely on System.Text.Json, no POCO dependencies.
    /// </summary>
    /// <param name="bundleJson">Raw Bundle JSON element</param>
    /// <param name="path">FHIRPath expression (e.g., "entry[0].resource.code.coding[0].code")</param>
    /// <param name="entryIndex">Explicit entry index for resource-level paths (RECOMMENDED for runtime)</param>
    /// <param name="resourceType">Resource type hint for entry resolution (FALLBACK if entryIndex not provided)</param>
    /// <returns>JSON pointer if path exists, null if missing</returns>
    string? Resolve(
        JsonElement bundleJson,
        string path,
        int? entryIndex = null,
        string? resourceType = null
    );
}
