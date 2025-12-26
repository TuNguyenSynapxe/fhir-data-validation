using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Pss.FhirProcessor.Engine.Navigation;

/// <summary>
/// DLL-SAFE: Pure JSON pointer resolution implementation.
/// 
/// Extracts core JSON navigation logic from SmartPathNavigationService.
/// No POCO dependencies - operates entirely on System.Text.Json.
/// 
/// Runtime consumers should pass explicit entryIndex for deterministic behavior.
/// Resource-type inference is a FALLBACK mechanism with limitations.
/// </summary>
public class JsonPointerResolver : IJsonPointerResolver
{
    /// <summary>
    /// DLL-SAFE: Resolves FHIRPath to JSON pointer using pure JSON navigation.
    /// </summary>
    public string? Resolve(
        JsonElement bundleJson,
        string path,
        int? entryIndex = null,
        string? resourceType = null)
    {
        try
        {
            // Normalize and parse path
            var normalizedPath = NormalizePath(path);
            var segments = ParsePathSegments(normalizedPath);
            
            var pointer = new StringBuilder();
            var currentNode = bundleJson;
            
            // Determine starting point
            int segmentStartIndex = 0;
            
            // Check if path starts with entry[] or resource type
            if (segments.Count > 0 && segments[0].PropertyName != "entry")
            {
                // RESOURCE-LEVEL PATH DETECTION
                // If first segment is not "entry", assume it's a resource-level path
                // Example: "code.coding[0].code" → navigate to entry[entryIndex].resource.code...
                
                int? targetEntryIndex = entryIndex;
                string? targetResourceType = null;
                
                // Check if first segment looks like a resource type (capitalized)
                var firstSegment = segments[0].PropertyName;
                if (char.IsUpper(firstSegment[0]) && segments[0].Type == SegmentType.Property)
                {
                    // First segment is likely a resource type (e.g., "Observation", "Patient")
                    targetResourceType = firstSegment;
                    segmentStartIndex = 1; // Skip first segment
                }
                else
                {
                    // Use provided resourceType parameter
                    targetResourceType = resourceType;
                    segmentStartIndex = 0; // Process all segments
                }
                
                // Find entry index by resource type (FALLBACK - requires JSON inspection)
                if (!targetEntryIndex.HasValue && !string.IsNullOrEmpty(targetResourceType))
                {
                    targetEntryIndex = FindEntryIndexByResourceType(bundleJson, targetResourceType);
                }
                
                // Default to first entry if nothing else works
                targetEntryIndex ??= 0;
                
                // Navigate to entry[index].resource
                if (currentNode.TryGetProperty("entry", out var entryArray) &&
                    targetEntryIndex.Value < entryArray.GetArrayLength())
                {
                    pointer.Append($"/entry/{targetEntryIndex.Value}");
                    currentNode = entryArray[targetEntryIndex.Value];
                    
                    if (currentNode.TryGetProperty("resource", out var resource))
                    {
                        pointer.Append("/resource");
                        currentNode = resource;
                    }
                    else
                    {
                        return null; // No resource in entry
                    }
                }
                else
                {
                    return null; // Entry index out of bounds
                }
            }
            
            // Process remaining segments
            for (int i = segmentStartIndex; i < segments.Count; i++)
            {
                var segment = segments[i];
                
                if (segment.Type == SegmentType.ArrayIndex)
                {
                    // DLL-SAFE: Direct array index navigation
                    pointer.Append($"/{segment.PropertyName}/{segment.Index}");
                    
                    if (currentNode.TryGetProperty(segment.PropertyName, out var arrayProp) &&
                        arrayProp.ValueKind == JsonValueKind.Array &&
                        segment.Index < arrayProp.GetArrayLength())
                    {
                        currentNode = arrayProp[segment.Index];
                    }
                    else
                    {
                        return null; // Array index out of bounds
                    }
                }
                else if (segment.Type == SegmentType.Property)
                {
                    // DLL-SAFE: Property navigation
                    if (currentNode.TryGetProperty(segment.PropertyName, out var prop))
                    {
                        bool isLastSegment = (i == segments.Count - 1);
                        
                        if (prop.ValueKind == JsonValueKind.Array)
                        {
                            if (isLastSegment)
                            {
                                // Last segment: return the array itself
                                pointer.Append($"/{segment.PropertyName}");
                                currentNode = prop;
                            }
                            else
                            {
                                // Not last segment: navigate into array[0]
                                pointer.Append($"/{segment.PropertyName}/0");
                                
                                if (prop.GetArrayLength() > 0)
                                {
                                    currentNode = prop[0];
                                }
                                else
                                {
                                    return null; // Empty array, can't navigate deeper
                                }
                            }
                        }
                        else if (prop.ValueKind == JsonValueKind.Object)
                        {
                            // HEURISTIC: Treat known repeatable fields as implicit array[0]
                            bool isKnownRepeatableField = !isLastSegment &&
                                (segment.PropertyName == "performer" ||
                                 segment.PropertyName == "address" ||
                                 segment.PropertyName == "identifier" ||
                                 segment.PropertyName == "telecom" ||
                                 segment.PropertyName == "contact");
                            
                            bool hasReferenceStructure = prop.TryGetProperty("reference", out _) ||
                                                          prop.TryGetProperty("display", out _);
                            bool hasAddressStructure = prop.TryGetProperty("line", out _) ||
                                                        prop.TryGetProperty("city", out _);
                            
                            if (isKnownRepeatableField && (hasReferenceStructure || hasAddressStructure))
                            {
                                // Treat as array[0] for traversal
                                pointer.Append($"/{segment.PropertyName}/0");
                                currentNode = prop;
                            }
                            else
                            {
                                // Normal object navigation
                                pointer.Append($"/{segment.PropertyName}");
                                currentNode = prop;
                            }
                        }
                        else
                        {
                            // Scalar property
                            pointer.Append($"/{segment.PropertyName}");
                            currentNode = prop;
                        }
                    }
                    else
                    {
                        return null; // Property does not exist
                    }
                }
                else if (segment.Type == SegmentType.WhereClause)
                {
                    // DLL-SAFE: Simple JSON-based where() evaluation
                    // LIMITATION: Only supports basic equality checks (e.g., code='value')
                    // Complex FHIRPath expressions require POCO-based evaluation
                    
                    if (currentNode.TryGetProperty(segment.PropertyName, out var arrayProp) &&
                        arrayProp.ValueKind == JsonValueKind.Array)
                    {
                        pointer.Append($"/{segment.PropertyName}");
                        
                        var matchIndex = EvaluateSimpleWhereClause(arrayProp, segment.WhereExpression);
                        if (matchIndex >= 0)
                        {
                            pointer.Append($"/{matchIndex}");
                            currentNode = arrayProp[matchIndex];
                        }
                        else
                        {
                            return null; // No match found
                        }
                    }
                    else
                    {
                        return null; // where() target is not an array
                    }
                }
                else if (segment.Type == SegmentType.EntryReference)
                {
                    // DLL-SAFE: Entry reference resolution via JSON inspection
                    // ALWAYS resolve from bundle root, not from currentNode
                    var resolvedIndex = FindEntryIndexByReference(bundleJson, segment.Value);
                    
                    if (resolvedIndex.HasValue)
                    {
                        pointer.Append($"/entry/{resolvedIndex.Value}");
                        
                        if (bundleJson.TryGetProperty("entry", out var entryArray) &&
                            resolvedIndex.Value < entryArray.GetArrayLength())
                        {
                            currentNode = entryArray[resolvedIndex.Value];
                            
                            if (currentNode.TryGetProperty("resource", out var resource))
                            {
                                pointer.Append("/resource");
                                currentNode = resource;
                            }
                        }
                        else
                        {
                            return null; // Entry not found
                        }
                    }
                    else
                    {
                        return null; // Reference could not be resolved
                    }
                }
            }
            
            return pointer.ToString();
        }
        catch
        {
            return null; // Any error returns null
        }
    }
    
    // ============================================================================
    // PRIVATE HELPER METHODS (DLL-SAFE - Pure JSON operations)
    // ============================================================================
    
    private string NormalizePath(string path)
    {
        return path.Trim()
            .Replace("Bundle.", "")
            .Replace(".first()", "")
            .Replace(".ofType(Bundle)", "");
    }
    
    private List<PathSegment> ParsePathSegments(string path)
    {
        var segments = new List<PathSegment>();
        var parts = path.Split('.');
        
        foreach (var part in parts)
        {
            // Array index: property[index]
            var arrayMatch = Regex.Match(part, @"^([^\[]+)\[(\d+)\]$");
            if (arrayMatch.Success)
            {
                segments.Add(new PathSegment
                {
                    Type = SegmentType.ArrayIndex,
                    PropertyName = arrayMatch.Groups[1].Value,
                    Index = int.Parse(arrayMatch.Groups[2].Value)
                });
                continue;
            }
            
            // where() clause: property.where(condition)
            var whereMatch = Regex.Match(part, @"^([^\(]+)\.where\(([^\)]+)\)$");
            if (whereMatch.Success)
            {
                segments.Add(new PathSegment
                {
                    Type = SegmentType.WhereClause,
                    PropertyName = whereMatch.Groups[1].Value,
                    WhereExpression = whereMatch.Groups[2].Value
                });
                continue;
            }
            
            // Entry reference: Patient/123
            if (part.Contains("/") && part.Split('/').Length == 2)
            {
                var refParts = part.Split('/');
                segments.Add(new PathSegment
                {
                    Type = SegmentType.EntryReference,
                    Value = part,
                    ResourceType = refParts[0],
                    ResourceId = refParts[1]
                });
                continue;
            }
            
            // Simple property
            segments.Add(new PathSegment
            {
                Type = SegmentType.Property,
                PropertyName = part
            });
        }
        
        return segments;
    }
    
    private int? FindEntryIndexByResourceType(JsonElement bundleJson, string resourceType)
    {
        if (!bundleJson.TryGetProperty("entry", out var entryArray) ||
            entryArray.ValueKind != JsonValueKind.Array)
        {
            return null;
        }
        
        for (int i = 0; i < entryArray.GetArrayLength(); i++)
        {
            var entry = entryArray[i];
            if (entry.TryGetProperty("resource", out var resource) &&
                resource.TryGetProperty("resourceType", out var rtProp) &&
                rtProp.ValueKind == JsonValueKind.String &&
                rtProp.GetString() == resourceType)
            {
                return i;
            }
        }
        
        return null;
    }
    
    private int? FindEntryIndexByReference(JsonElement bundleJson, string reference)
    {
        if (string.IsNullOrWhiteSpace(reference) ||
            !bundleJson.TryGetProperty("entry", out var entryArray) ||
            entryArray.ValueKind != JsonValueKind.Array)
        {
            return null;
        }
        
        for (int i = 0; i < entryArray.GetArrayLength(); i++)
        {
            var entry = entryArray[i];
            
            // Match fullUrl
            if (entry.TryGetProperty("fullUrl", out var fullUrlProp) &&
                fullUrlProp.ValueKind == JsonValueKind.String &&
                fullUrlProp.GetString() == reference)
            {
                return i;
            }
            
            // Match resource type/id for relative references
            if (reference.Contains("/") && entry.TryGetProperty("resource", out var resource))
            {
                var parts = reference.Split('/');
                if (parts.Length == 2)
                {
                    var hasMatchingType = resource.TryGetProperty("resourceType", out var rtProp) &&
                                          rtProp.ValueKind == JsonValueKind.String &&
                                          rtProp.GetString() == parts[0];
                    
                    var hasMatchingId = resource.TryGetProperty("id", out var idProp) &&
                                        idProp.ValueKind == JsonValueKind.String &&
                                        idProp.GetString() == parts[1];
                    
                    if (hasMatchingType && hasMatchingId)
                    {
                        return i;
                    }
                }
            }
        }
        
        return null;
    }
    
    private int EvaluateSimpleWhereClause(JsonElement arrayElement, string? whereExpression)
    {
        if (arrayElement.ValueKind != JsonValueKind.Array || string.IsNullOrWhiteSpace(whereExpression))
        {
            return -1;
        }
        
        for (int i = 0; i < arrayElement.GetArrayLength(); i++)
        {
            var item = arrayElement[i];
            if (EvaluateSimpleCondition(item, whereExpression))
            {
                return i;
            }
        }
        
        return -1;
    }
    
    private bool EvaluateSimpleCondition(JsonElement element, string condition)
    {
        // Parse simple conditions: property.path='value'
        var eqMatch = Regex.Match(condition, @"([^=]+)='([^']+)'");
        if (eqMatch.Success)
        {
            var path = eqMatch.Groups[1].Value.Trim();
            var expectedValue = eqMatch.Groups[2].Value;
            
            var actualValue = NavigateJsonPath(element, path);
            return actualValue == expectedValue;
        }
        
        return false;
    }
    
    private string? NavigateJsonPath(JsonElement element, string path)
    {
        var parts = path.Split('.');
        var current = element;
        
        foreach (var part in parts)
        {
            if (current.TryGetProperty(part, out var next))
            {
                current = next;
                
                // If array, navigate into first element
                if (current.ValueKind == JsonValueKind.Array && current.GetArrayLength() > 0)
                {
                    current = current[0];
                }
            }
            else
            {
                return null;
            }
        }
        
        return current.ValueKind == JsonValueKind.String ? current.GetString() : current.ToString();
    }
}

// ============================================================================
// INTERNAL TYPES (shared with SmartPathNavigationService)
// ============================================================================

internal class PathSegment
{
    public SegmentType Type { get; set; }
    public string PropertyName { get; set; } = "";
    public int Index { get; set; }
    public string? WhereExpression { get; set; }
    public string Value { get; set; } = "";
    public string? ResourceType { get; set; }
    public string? ResourceId { get; set; }
}

internal enum SegmentType
{
    Property,
    ArrayIndex,
    WhereClause,
    EntryReference
}
