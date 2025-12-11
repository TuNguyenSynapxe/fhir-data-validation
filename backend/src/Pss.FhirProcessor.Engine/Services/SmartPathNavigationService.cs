using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Hl7.FhirPath;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Converts FHIRPath and Firely paths to JSON pointers as per docs/07_smart_path_navigation.md
/// </summary>
public class SmartPathNavigationService : ISmartPathNavigationService
{
    public async Task<NavigationInfo> ResolvePathAsync(Bundle bundle, string path, string? resourceType = null, CancellationToken cancellationToken = default)
    {
        var navInfo = new NavigationInfo();
        
        try
        {
            // Normalize the path
            var normalizedPath = NormalizePath(path);
            
            // Build breadcrumbs and JSON pointer
            var segments = ParsePathSegments(normalizedPath);
            var pointer = new StringBuilder();
            var breadcrumbs = new List<string>();
            var missingParents = new List<string>();
            var exists = true;
            
            // Start with Bundle
            breadcrumbs.Add("Bundle");
            
            // Use FhirJsonSerializer for proper FHIR serialization
            var fhirSerializer = new Hl7.Fhir.Serialization.FhirJsonSerializer();
            var json = fhirSerializer.SerializeToString(bundle);
            var currentNode = JsonDocument.Parse(json).RootElement;
            
            // If path doesn't start with "entry", assume it's relative to first resource (or specified resourceType)
            if (segments.Count > 0 && segments[0].PropertyName != "entry")
            {
                // Find entry index - either by resourceType or default to 0
                int? entryIndex = null;
                if (!string.IsNullOrEmpty(resourceType))
                {
                    // Find first entry matching resource type
                    for (int i = 0; i < bundle.Entry.Count; i++)
                    {
                        if (bundle.Entry[i].Resource?.TypeName == resourceType)
                        {
                            entryIndex = i;
                            break;
                        }
                    }
                }
                else
                {
                    entryIndex = 0; // Default to first entry
                }
                
                if (entryIndex.HasValue && entryIndex.Value < bundle.Entry.Count)
                {
                    // Navigate to entry[index].resource
                    pointer.Append($"/entry/{entryIndex.Value}");
                    breadcrumbs.Add($"entry[{entryIndex.Value}]");
                    
                    if (currentNode.TryGetProperty("entry", out var entryArray) && entryIndex.Value < entryArray.GetArrayLength())
                    {
                        currentNode = entryArray[entryIndex.Value];
                        
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
                        missingParents.Add($"entry[{entryIndex.Value}]");
                    }
                }
                else
                {
                    exists = false;
                    missingParents.Add(resourceType ?? "entry[0]");
                }
            }
            
            // Process each segment
            foreach (var segment in segments)
            {
                if (segment.Type == SegmentType.EntryReference)
                {
                    // Resolve entry index
                    var entryIndex = segment.ResourceType != null 
                        ? FindEntryIndexByResourceId(bundle, segment.ResourceType, segment.ResourceId ?? "")
                        : FindEntryIndexByReference(bundle, segment.Value);
                    
                    if (entryIndex.HasValue)
                    {
                        pointer.Append($"/entry/{entryIndex.Value}");
                        breadcrumbs.Add($"entry[{entryIndex.Value}]");
                        
                        if (currentNode.TryGetProperty("entry", out var entryArray) &&
                            entryIndex.Value < entryArray.GetArrayLength())
                        {
                            currentNode = entryArray[entryIndex.Value];
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
                    if (currentNode.TryGetProperty(segment.PropertyName, out var prop))
                    {
                        // If property is an array and no explicit index, take first element
                        if (prop.ValueKind == JsonValueKind.Array)
                        {
                            pointer.Append($"/{segment.PropertyName}/0");
                            breadcrumbs.Add($"{segment.PropertyName}[0]");
                            
                            if (prop.GetArrayLength() > 0)
                            {
                                currentNode = prop[0];
                            }
                            else
                            {
                                exists = false;
                                missingParents.Add($"{segment.PropertyName}[0]");
                                break;
                            }
                        }
                        else
                        {
                            pointer.Append($"/{segment.PropertyName}");
                            breadcrumbs.Add(segment.PropertyName);
                            currentNode = prop;
                        }
                    }
                    else
                    {
                        exists = false;
                        missingParents.Add(segment.PropertyName);
                        break;
                    }
                }
                else if (segment.Type == SegmentType.WhereClause)
                {
                    // First access the property (should be an array)
                    if (currentNode.TryGetProperty(segment.PropertyName, out var arrayProp))
                    {
                        pointer.Append($"/{segment.PropertyName}");
                        
                        // Then evaluate where() filter - find matching index
                        var matchIndex = EvaluateWhereClause(arrayProp, segment.WhereExpression);
                        if (matchIndex >= 0)
                        {
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
            
            navInfo.JsonPointer = pointer.ToString();
            navInfo.Breadcrumbs = breadcrumbs;
            navInfo.Exists = exists;
            navInfo.MissingParents = missingParents;
        }
        catch (Exception ex)
        {
            navInfo.Exists = false;
            navInfo.MissingParents.Add($"Error: {ex.Message}");
        }
        
        return await System.Threading.Tasks.Task.FromResult(navInfo);
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