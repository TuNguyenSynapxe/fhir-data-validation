using System.Text.Json;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Service for exploring and extracting element paths from FHIR bundles
/// Recursively walks JSON structure and tracks array indices
/// </summary>
public class BundlePathExplorer : IBundlePathExplorer
{
    private readonly ILogger<BundlePathExplorer> _logger;
    private static readonly HashSet<string> SkippedProperties = new() { "meta", "text", "contained" };

    public BundlePathExplorer(ILogger<BundlePathExplorer> logger)
    {
        _logger = logger;
    }

    public async Task<BundlePathResult> ExtractPathsAsync(string bundleJson, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Starting bundle path extraction");

            var result = new BundlePathResult();
            var allPaths = new HashSet<string>();
            var pathsByType = new Dictionary<string, HashSet<string>>();
            var resourceTypes = new HashSet<string>();
            var resourceCount = 0;

            using var document = JsonDocument.Parse(bundleJson);
            var root = document.RootElement;

            // Check if it's a Bundle
            if (root.TryGetProperty("resourceType", out var resourceTypeElement))
            {
                var resourceType = resourceTypeElement.GetString();
                
                if (resourceType == "Bundle")
                {
                    _logger.LogDebug("Processing Bundle resource");
                    
                    // Process bundle entries
                    if (root.TryGetProperty("entry", out var entries) && entries.ValueKind == JsonValueKind.Array)
                    {
                        var entryIndex = 0;
                        foreach (var entry in entries.EnumerateArray())
                        {
                            if (entry.TryGetProperty("resource", out var resource))
                            {
                                if (resource.TryGetProperty("resourceType", out var entryResourceType))
                                {
                                    var entryType = entryResourceType.GetString();
                                    if (!string.IsNullOrEmpty(entryType))
                                    {
                                        resourceTypes.Add(entryType);
                                        resourceCount++;

                                        // Extract paths for this resource
                                        var resourcePaths = new HashSet<string>();
                                        ExtractPathsFromElement(resource, entryType, resourcePaths);

                                        // Add to all paths
                                        foreach (var path in resourcePaths)
                                        {
                                            allPaths.Add(path);
                                        }

                                        // Group by resource type
                                        if (!pathsByType.ContainsKey(entryType))
                                        {
                                            pathsByType[entryType] = new HashSet<string>();
                                        }
                                        
                                        foreach (var path in resourcePaths)
                                        {
                                            pathsByType[entryType].Add(path);
                                        }

                                        _logger.LogDebug("Processed {ResourceType} resource at entry[{Index}] - found {PathCount} paths",
                                            entryType, entryIndex, resourcePaths.Count);
                                    }
                                }
                            }
                            entryIndex++;
                        }
                    }
                }
                else
                {
                    // Single resource (not a bundle)
                    _logger.LogDebug("Processing single {ResourceType} resource", resourceType);
                    resourceTypes.Add(resourceType!);
                    resourceCount = 1;

                    var resourcePaths = new HashSet<string>();
                    ExtractPathsFromElement(root, resourceType!, resourcePaths);

                    foreach (var path in resourcePaths)
                    {
                        allPaths.Add(path);
                    }

                    pathsByType[resourceType!] = resourcePaths;
                }
            }

            // Build result
            result.Paths = allPaths.OrderBy(p => p).ToList();
            result.TotalPaths = result.Paths.Count;
            result.PathsByResourceType = pathsByType.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.OrderBy(p => p).ToList()
            );
            result.ResourceTypes = resourceTypes.OrderBy(r => r).ToList();
            result.TotalResources = resourceCount;

            _logger.LogInformation("Bundle path extraction complete: {PathCount} unique paths, {ResourceCount} resources, {TypeCount} resource types",
                result.TotalPaths, result.TotalResources, result.ResourceTypes.Count);

            return await Task.FromResult(result);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Invalid JSON format in bundle");
            throw new ArgumentException("Invalid JSON format", nameof(bundleJson), ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting paths from bundle");
            throw;
        }
    }

    /// <summary>
    /// Recursively extracts paths from a JSON element
    /// </summary>
    private void ExtractPathsFromElement(
        JsonElement element,
        string currentPath,
        HashSet<string> paths)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    // Skip metadata properties
                    if (SkippedProperties.Contains(property.Name))
                    {
                        continue;
                    }

                    var propertyPath = string.IsNullOrEmpty(currentPath)
                        ? property.Name
                        : $"{currentPath}.{property.Name}";

                    // Add the property path
                    paths.Add(propertyPath);

                    // Recursively process the property value
                    ExtractPathsFromElement(property.Value, propertyPath, paths);
                }
                break;

            case JsonValueKind.Array:
                var arrayIndex = 0;
                foreach (var item in element.EnumerateArray())
                {
                    var indexedPath = $"{currentPath}[{arrayIndex}]";
                    
                    // Add the indexed path
                    paths.Add(indexedPath);

                    // Recursively process array item
                    ExtractPathsFromElement(item, indexedPath, paths);
                    
                    arrayIndex++;
                }
                break;

            case JsonValueKind.String:
            case JsonValueKind.Number:
            case JsonValueKind.True:
            case JsonValueKind.False:
            case JsonValueKind.Null:
                // Primitive values - path already added by parent
                break;
        }
    }
}
