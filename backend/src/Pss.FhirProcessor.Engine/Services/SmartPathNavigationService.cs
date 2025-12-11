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
            var currentNode = JsonSerializer.SerializeToDocument(bundle).RootElement;
            
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
                    pointer.Append($"/{segment.PropertyName}");
                    breadcrumbs.Add(segment.PropertyName);
                    
                    if (currentNode.TryGetProperty(segment.PropertyName, out var prop))
                    {
                        currentNode = prop;
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
                    // Handle where() filter - find matching index
                    var matchIndex = EvaluateWhereClause(currentNode, segment.WhereExpression);
                    if (matchIndex >= 0)
                    {
                        pointer.Append($"/{matchIndex}");
                        breadcrumbs.Add($"[{matchIndex}]");
                        
                        if (currentNode.ValueKind == JsonValueKind.Array && matchIndex < currentNode.GetArrayLength())
                        {
                            currentNode = currentNode[matchIndex];
                        }
                    }
                    else
                    {
                        exists = false;
                        missingParents.Add($"where({segment.WhereExpression})");
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
        
        // Match patterns: entry[0], Observation, component.where(...), valueString
        var pattern = @"(\w+)(\[(\d+)\])?(\\.where\(([^)]+)\))?";
        var matches = Regex.Matches(path, pattern);
        
        foreach (Match match in matches)
        {
            var propertyName = match.Groups[1].Value;
            var hasIndex = match.Groups[2].Success;
            var index = hasIndex ? int.Parse(match.Groups[3].Value) : -1;
            var hasWhere = match.Groups[4].Success;
            var whereExpr = hasWhere ? match.Groups[5].Value : null;
            
            if (hasIndex)
            {
                segments.Add(new PathSegment
                {
                    Type = SegmentType.ArrayIndex,
                    PropertyName = propertyName,
                    Index = index
                });
            }
            else if (hasWhere)
            {
                segments.Add(new PathSegment
                {
                    Type = SegmentType.WhereClause,
                    PropertyName = propertyName,
                    WhereExpression = whereExpr
                });
            }
            else
            {
                segments.Add(new PathSegment
                {
                    Type = SegmentType.Property,
                    PropertyName = propertyName
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