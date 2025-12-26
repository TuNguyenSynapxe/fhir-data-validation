using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Hl7.FhirPath;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Navigation;

/// <summary>
/// Converts FHIRPath and Firely paths to JSON pointers as per docs/07_smart_path_navigation.md.
/// 
/// DLL-SAFETY: Mixed (core navigation is DLL-safe, but where() clause evaluation requires POCOs)
/// - JSON-based navigation: DLL-safe (operates on System.Text.Json)
/// - where() clause evaluation: Requires Bundle POCO (authoring mode)
/// 
/// WARNING: where() clause resolution has POCO dependency (see ARCHITECTURAL_AUDIT_REPORT.md Section 3).
/// Runtime DLL consumers should pass explicit entryIndex instead of relying on where() resolution.
/// </summary>
public class SmartPathNavigationService : ISmartPathNavigationService
{
    /// <summary>
    /// Resolves a FHIRPath expression to a JSON pointer for navigation.
    /// Navigation operates on raw JSON to ensure deterministic behavior.
    /// Validation may normalize POCOs independently.
    /// </summary>
    /// <param name="rawBundleJson">Raw JSON for navigation - preserves original structure</param>
    /// <param name="bundle">Optional Bundle POCO for resource-level where() filtering</param>
    public async Task<string?> ResolvePathAsync(JsonElement rawBundleJson, Bundle? bundle, string path, string? resourceType = null, int? entryIndex = null, CancellationToken cancellationToken = default)
    {
        // Internal helper class for navigation metadata
        var navInfo = new NavigationInfoInternal();
        
        try
        {
            // Normalize the path
            var normalizedPath = NormalizePath(path);
            
            // Build breadcrumbs and JSON pointer (breadcrumbs used internally, not exposed)
            var segments = ParsePathSegments(normalizedPath);
            var pointer = new StringBuilder();
            var breadcrumbs = new List<string>();
            var missingParents = new List<string>();
            var exists = true;
            
            // Start with Bundle
            breadcrumbs.Add("Bundle");
            
            // Use the raw JSON directly - DO NOT re-serialize POCOs
            // This ensures navigation behavior is independent of POCO parsing success
            var currentNode = rawBundleJson;
            
            // If path doesn't start with "entry", check if first segment is a resource type
            int segmentStartIndex = 0;
            if (segments.Count > 0 && segments[0].PropertyName != "entry")
            {
                // RESOURCE-LEVEL WHERE() DETECTION
                // Resource-level where() filters Bundle.entry, not JSON structure.
                // Detect: first segment is WhereClause AND PropertyName is a resource type
                // Example: Observation.where(code.coding.code='HS') → filter bundle entries, not JSON property
                int? targetEntryIndex = entryIndex;
                string? targetResourceType = null;
                
                if (!targetEntryIndex.HasValue && 
                    segments[0].Type == SegmentType.WhereClause &&
                    bundle != null)  // Resource-level where() requires Bundle POCO
                {
                    // Check if WhereClause PropertyName is a FHIR resource type
                    var wherePropertyName = segments[0].PropertyName;
                    var isResourceType = bundle.Entry.Any(e => e.Resource?.TypeName == wherePropertyName);
                    
                    if (isResourceType)
                    {
                        // This is a resource-level where() - filter Bundle.entry before JSON traversal
                        targetResourceType = wherePropertyName;
                        var whereSegment = segments[0];
                        
                        var fhirSerializer = new Hl7.Fhir.Serialization.FhirJsonSerializer();
                        
                        // Iterate bundle entries to find first match
                        for (int i = 0; i < bundle.Entry.Count; i++)
                        {
                            var entry = bundle.Entry[i];
                            if (entry.Resource?.TypeName == targetResourceType)
                            {
                                // Serialize resource to JsonElement for where() evaluation
                                var resourceJson = fhirSerializer.SerializeToString(entry.Resource);
                                var resourceElement = JsonDocument.Parse(resourceJson).RootElement;
                                
                                // Evaluate where() expression against resource
                                if (EvaluateWhereCondition(resourceElement, whereSegment.WhereExpression ?? ""))
                                {
                                    targetEntryIndex = i;
                                    break;
                                }
                            }
                        }
                        
                        // If no match found, return null immediately
                        if (!targetEntryIndex.HasValue)
                        {
                            return await System.Threading.Tasks.Task.FromResult<string?>(null);
                        }
                        
                        // Match found - advance past the where() segment
                        segmentStartIndex = 1;
                    }
                }
                
                // If not a resource-level where(), check if first segment is a resource type (Property)
                if (targetResourceType == null && bundle != null)
                {
                    var firstSegment = segments[0].PropertyName;
                    var isResourceType = bundle.Entry.Any(e => e.Resource?.TypeName == firstSegment);
                    
                    if (isResourceType)
                    {
                        // First segment is a resource type, use it to find the entry
                        targetResourceType = firstSegment;
                        segmentStartIndex = 1; // Skip first segment, continue from second
                    }
                    else if (!string.IsNullOrEmpty(resourceType))
                    {
                        // Use provided resourceType parameter
                        targetResourceType = resourceType;
                        segmentStartIndex = 0; // Process all segments
                    }
                    else
                    {
                        // Default to first entry
                        targetResourceType = null;
                        segmentStartIndex = 0;
                    }
                }
                
                // Find entry index - use provided entryIndex or found index from where()
                if (!targetEntryIndex.HasValue)
                {
                    if (!string.IsNullOrEmpty(targetResourceType) && bundle != null)
                    {
                        // Find first entry matching resource type
                        for (int i = 0; i < bundle.Entry.Count; i++)
                        {
                            if (bundle.Entry[i].Resource?.TypeName == targetResourceType)
                            {
                                targetEntryIndex = i;
                                break;
                            }
                        }
                    }
                    else
                    {
                        targetEntryIndex = 0; // Default to first entry
                    }
                }
                
                // Validate entry index
                if (targetEntryIndex.HasValue && bundle != null && targetEntryIndex.Value < bundle.Entry.Count)
                {
                    // Navigate to entry[index].resource
                    pointer.Append($"/entry/{targetEntryIndex.Value}");
                    breadcrumbs.Add($"entry[{targetEntryIndex.Value}]");
                    
                    if (currentNode.TryGetProperty("entry", out var entryArray) && targetEntryIndex.Value < entryArray.GetArrayLength())
                    {
                        currentNode = entryArray[targetEntryIndex.Value];
                        
                        if (currentNode.TryGetProperty("resource", out var resource))
                        {
                            pointer.Append("/resource");
                            var actualResourceType = "resource";
                            if (resource.TryGetProperty("resourceType", out var rtProp) && rtProp.ValueKind == JsonValueKind.String)
                            {
                                actualResourceType = rtProp.GetString() ?? "resource";
                            }
                            breadcrumbs.Add(actualResourceType);
                            currentNode = resource;
                        }
                        else
                        {
                            exists = false;
                            missingParents.Add("resource");
                        }
                    }
                    else
                    {
                        exists = false;
                        missingParents.Add($"entry[{targetEntryIndex.Value}]");
                    }
                }
                else
                {
                    exists = false;
                    missingParents.Add(targetResourceType ?? "entry[0]");
                }
            }
            
            // Process remaining segments (skip segments already processed as resource type)
            for (int i = segmentStartIndex; i < segments.Count; i++)
            {
                var segment = segments[i];
            {
                if (segment.Type == SegmentType.EntryReference)
                {
                    // Resolve entry index
                    var resolvedEntryIndex = segment.ResourceType != null 
                        ? FindEntryIndexByResourceId(bundle, segment.ResourceType, segment.ResourceId ?? "")
                        : FindEntryIndexByReference(bundle, segment.Value);
                    
                    if (resolvedEntryIndex.HasValue)
                    {
                        pointer.Append($"/entry/{resolvedEntryIndex.Value}");
                        breadcrumbs.Add($"entry[{resolvedEntryIndex.Value}]");
                        
                        if (currentNode.TryGetProperty("entry", out var entryArray) &&
                            resolvedEntryIndex.Value < entryArray.GetArrayLength())
                        {
                            currentNode = entryArray[resolvedEntryIndex.Value];
                            breadcrumbs.Add(segment.ResourceType ?? "resource");
                            
                            if (currentNode.TryGetProperty("resource", out var resource))
                            {
                                pointer.Append("/resource");
                                currentNode = resource;
                            }
                        }
                        else
                        {
                            exists = false;
                            missingParents.Add(segment.Value);
                        }
                    }
                    else
                    {
                        exists = false;
                        missingParents.Add(segment.Value);
                    }
                }
                else if (segment.Type == SegmentType.ArrayIndex)
                {
                    pointer.Append($"/{segment.PropertyName}/{segment.Index}");
                    breadcrumbs.Add($"{segment.PropertyName}[{segment.Index}]");
                    
                    if (currentNode.TryGetProperty(segment.PropertyName, out var arrayProp) &&
                        segment.Index < arrayProp.GetArrayLength())
                    {
                        currentNode = arrayProp[segment.Index];
                    }
                    else
                    {
                        exists = false;
                        missingParents.Add($"{segment.PropertyName}[{segment.Index}]");
                        break;
                    }
                }
                else if (segment.Type == SegmentType.Property)
                {
                    // Navigation is structural-only. Empty value ≠ missing node.
                    // Check if property KEY exists, not whether VALUE is empty/null.
                    if (currentNode.TryGetProperty(segment.PropertyName, out var prop))
                    {
                        // BUG FIX: Check if this is the last segment in the path
                        bool isLastSegment = (i == segments.Count - 1);
                        
                        // If property is an array and no explicit index
                        if (prop.ValueKind == JsonValueKind.Array)
                        {
                            if (isLastSegment)
                            {
                                // Last segment: return the array itself, even if empty
                                // Navigation is structural-only. Empty value ≠ missing node.
                                pointer.Append($"/{segment.PropertyName}");
                                breadcrumbs.Add($"{segment.PropertyName}");
                                currentNode = prop;
                            }
                            else
                            {
                                // Not last segment: try to navigate into array[0] to continue path traversal
                                pointer.Append($"/{segment.PropertyName}/0");
                                breadcrumbs.Add($"{segment.PropertyName}[0]");
                                
                                if (prop.GetArrayLength() > 0)
                                {
                                    currentNode = prop[0];
                                }
                                else
                                {
                                    // Array is empty AND we need to navigate deeper
                                    // This is genuinely a structural issue - can't navigate through empty array
                                    exists = false;
                                    missingParents.Add($"{segment.PropertyName}[0]");
                                    break;
                                }
                            }
                        }
                        else if (prop.ValueKind == JsonValueKind.Object)
                        {
                            // Navigation is tolerant to object-vs-array mismatches.
                            // Validation remains strict per FHIR R4 cardinality rules.
                            
                            // HEURISTIC: Treat as implicit array[0] ONLY for KNOWN repeatable fields
                            // that are commonly malformed as objects: performer, address, identifier, etc.
                            bool isKnownRepeatableField = !isLastSegment && 
                                                           (segment.PropertyName == "performer" ||
                                                            segment.PropertyName == "address" ||
                                                            segment.PropertyName == "identifier" ||
                                                            segment.PropertyName == "telecom" ||
                                                            segment.PropertyName == "contact");
                            
                            // Additionally check if it looks like a Reference/Address/etc structure
                            bool hasReferenceStructure = prop.TryGetProperty("reference", out _) || 
                                                          prop.TryGetProperty("display", out _);
                            bool hasAddressStructure = prop.TryGetProperty("line", out _) || 
                                                        prop.TryGetProperty("city", out _);
                            
                            if (isKnownRepeatableField && (hasReferenceStructure || hasAddressStructure))
                            {
                                // Treat as array[0] for deeper traversal
                                pointer.Append($"/{segment.PropertyName}/0");
                                breadcrumbs.Add($"{segment.PropertyName}[0]");
                                currentNode = prop;
                            }
                            else
                            {
                                // Normal object navigation
                                pointer.Append($"/{segment.PropertyName}");
                                breadcrumbs.Add(segment.PropertyName);
                                currentNode = prop;
                            }
                        }
                        else
                        {
                            // Scalar property (string, number, boolean, null): always return jsonPointer
                            // Navigation is structural-only. Empty value ≠ missing node.
                            pointer.Append($"/{segment.PropertyName}");
                            breadcrumbs.Add(segment.PropertyName);
                            currentNode = prop;
                        }
                    }
                    else
                    {
                        // Property key does not exist in JSON structure - structurally missing
                        exists = false;
                        missingParents.Add(segment.PropertyName);
                        break;
                    }
                }
                else if (segment.Type == SegmentType.WhereClause)
                {
                    // where() is a SCOPE SELECTOR, not a structural node
                    // It filters array elements, then normal structural rules apply to children
                    // First access the property (should be an array)
                    if (currentNode.TryGetProperty(segment.PropertyName, out var arrayProp))
                    {
                        pointer.Append($"/{segment.PropertyName}");
                        
                        // Then evaluate where() filter - find matching index
                        var matchIndex = EvaluateWhereClause(arrayProp, segment.WhereExpression);
                        if (matchIndex >= 0)
                        {
                            // where() matched an element - navigate to it
                            pointer.Append($"/{matchIndex}");
                            breadcrumbs.Add($"{segment.PropertyName}[{matchIndex}]");
                            
                            if (arrayProp.ValueKind == JsonValueKind.Array && matchIndex < arrayProp.GetArrayLength())
                            {
                                currentNode = arrayProp[matchIndex];
                            }
                        }
                        else
                        {
                            exists = false;
                            missingParents.Add($"{segment.PropertyName}.where({segment.WhereExpression})");
                            break;
                        }
                    }
                    else
                    {
                        exists = false;
                        missingParents.Add(segment.PropertyName);
                        break;
                    }
                }
            }
            } // End of for loop
            
            navInfo.JsonPointer = pointer.ToString();
            navInfo.Breadcrumbs = breadcrumbs;
            navInfo.Exists = exists;
            navInfo.MissingParents = missingParents;
            
            // Return JsonPointer only if path fully exists, otherwise null
            // This matches Phase 1 contract: string? means null for missing/partial paths
            return await System.Threading.Tasks.Task.FromResult(exists ? navInfo.JsonPointer : null);
        }
        catch (Exception)
        {
            // Return null if path cannot be resolved
            return await System.Threading.Tasks.Task.FromResult<string?>(null);
        }
    }
    
    /// <summary>
    /// Legacy overload - serializes Bundle POCO to JSON then navigates.
    /// WARNING: This causes navigation behavior to depend on POCO parsing success.
    /// Use ResolvePathAsync(JsonElement, Bundle) instead.
    /// </summary>
    [Obsolete("Use ResolvePathAsync(JsonElement rawBundleJson, Bundle bundle, ...) to ensure consistent navigation behavior")]
#pragma warning disable CS0618 // Type or member is obsolete
    public async Task<string?> ResolvePathAsync(Bundle bundle, string path, string? resourceType = null, int? entryIndex = null, CancellationToken cancellationToken = default)
#pragma warning restore CS0618 // Type or member is obsolete
    {
        // Serialize Bundle POCO to JSON (this normalizes the JSON)
        var fhirSerializer = new Hl7.Fhir.Serialization.FhirJsonSerializer();
        var json = fhirSerializer.SerializeToString(bundle);
        var jsonElement = JsonDocument.Parse(json).RootElement;
        
        // Delegate to new method - pass BOTH JSON and Bundle
        return await ResolvePathAsync(jsonElement, bundle, path, resourceType, entryIndex, cancellationToken);
    }
    
    public int? FindEntryIndexByReference(Bundle bundle, string reference)
    {
        if (string.IsNullOrWhiteSpace(reference))
            return null;
        
        for (int i = 0; i < bundle.Entry.Count; i++)
        {
            var entry = bundle.Entry[i];
            
            // Match fullUrl
            if (entry.FullUrl == reference)
                return i;
            
            // Match resource id for relative references
            if (entry.Resource != null && reference.Contains("/"))
            {
                var parts = reference.Split('/');
                if (parts.Length == 2 && 
                    entry.Resource.TypeName == parts[0] && 
                    entry.Resource.Id == parts[1])
                {
                    return i;
                }
            }
        }
        
        return null;
    }
    
    public int? FindEntryIndexByResourceId(Bundle bundle, string resourceType, string resourceId)
    {
        for (int i = 0; i < bundle.Entry.Count; i++)
        {
            var entry = bundle.Entry[i];
            if (entry.Resource != null && 
                entry.Resource.TypeName == resourceType && 
                entry.Resource.Id == resourceId)
            {
                return i;
            }
        }
        
        return null;
    }
    
    private string NormalizePath(string path)
    {
        // Remove Bundle. prefix if present
        if (path.StartsWith("Bundle."))
            path = path.Substring(7);
        
        return path;
    }
    
    private List<PathSegment> ParsePathSegments(string path)
    {
        var segments = new List<PathSegment>();
        
        // Split by dots, but handle where() clauses and array indices
        // Match patterns: property, property[index], property.where(condition)
        var parts = new List<string>();
        var currentPart = "";
        var parenDepth = 0;
        
        for (int i = 0; i < path.Length; i++)
        {
            var ch = path[i];
            
            if (ch == '(')
            {
                parenDepth++;
                currentPart += ch;
            }
            else if (ch == ')')
            {
                parenDepth--;
                currentPart += ch;
            }
            else if (ch == '.' && parenDepth == 0)
            {
                // Only split on dots that are not inside parentheses
                // But check if next part is "where(" - if so, include it in current part
                if (i + 6 < path.Length && path.Substring(i + 1, 6) == "where(")
                {
                    currentPart += ch; // Include the dot
                }
                else
                {
                    if (currentPart.Length > 0)
                    {
                        parts.Add(currentPart);
                        currentPart = "";
                    }
                }
            }
            else
            {
                currentPart += ch;
            }
        }
        
        if (currentPart.Length > 0)
            parts.Add(currentPart);
        
        // Now parse each part
        foreach (var part in parts)
        {
            // Check for where clause: property.where(condition)
            var whereMatch = Regex.Match(part, @"^(\w+)\.where\(([^)]+)\)$");
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
            
            // Check for array index: property[index]
            var indexMatch = Regex.Match(part, @"^(\w+)\[(\d+)\]$");
            if (indexMatch.Success)
            {
                segments.Add(new PathSegment
                {
                    Type = SegmentType.ArrayIndex,
                    PropertyName = indexMatch.Groups[1].Value,
                    Index = int.Parse(indexMatch.Groups[2].Value)
                });
                continue;
            }
            
            // Simple property
            if (Regex.IsMatch(part, @"^\w+$"))
            {
                segments.Add(new PathSegment
                {
                    Type = SegmentType.Property,
                    PropertyName = part
                });
            }
        }
        
        return segments;
    }
    
    private int EvaluateWhereClause(JsonElement element, string? whereExpression)
    {
        if (element.ValueKind != JsonValueKind.Array || string.IsNullOrWhiteSpace(whereExpression))
            return -1;
        
        // Simple where() evaluation - can be extended for complex FHIRPath
        // For now, handle basic cases like: code.coding.code='SQ-001'
        for (int i = 0; i < element.GetArrayLength(); i++)
        {
            var item = element[i];
            if (EvaluateWhereCondition(item, whereExpression))
                return i;
        }
        
        return -1;
    }
    
    private bool EvaluateWhereCondition(JsonElement element, string condition)
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
                
                // If current is an array, navigate into first element for next iteration
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