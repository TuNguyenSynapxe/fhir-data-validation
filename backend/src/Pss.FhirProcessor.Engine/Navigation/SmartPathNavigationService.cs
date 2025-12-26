using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Hl7.FhirPath;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Navigation;

/// <summary>
/// AUTHORING-ONLY: Adapter service that provides POCO-based where() filtering for authoring scenarios.
/// 
/// ARCHITECTURE (Phase 2):
/// - DLL-SAFE paths: Delegates to IJsonPointerResolver (pure JSON, no POCO)
/// - AUTHORING paths with resource-level where(): Uses Bundle POCO, then delegates to IJsonPointerResolver
/// 
/// RESOURCE-LEVEL WHERE() FILTERING:
/// - Example: "Observation.where(code.coding.code='HS')" requires Bundle POCO to iterate entries
/// - After filtering, navigation delegates to IJsonPointerResolver using explicit entryIndex
/// 
/// RUNTIME RECOMMENDATION:
/// - Pass explicit entryIndex to avoid POCO dependency
/// - Use IJsonPointerResolver directly for DLL-safe scenarios
/// </summary>
public class SmartPathNavigationService : ISmartPathNavigationService
{
    private readonly IJsonPointerResolver _jsonResolver;
    private readonly ILogger<SmartPathNavigationService> _logger;
    
    public SmartPathNavigationService(
        IJsonPointerResolver jsonResolver,
        ILogger<SmartPathNavigationService> logger)
    {
        _jsonResolver = jsonResolver;
        _logger = logger;
    }
    
    /// <summary>
    /// AUTHORING-ONLY: Resolves a FHIRPath expression with optional POCO-based resource-level where() filtering.
    /// 
    /// DELEGATION STRATEGY:
    /// 1. If Bundle is null OR path has no resource-level where(): Delegate to IJsonPointerResolver (DLL-SAFE)
    /// 2. If Bundle is provided AND path has resource-level where(): Filter entries with POCO, then delegate (AUTHORING)
    /// 
    /// RUNTIME RECOMMENDATION: Pass explicit entryIndex to avoid POCO dependency.
    /// </summary>
    public async Task<string?> ResolvePathAsync(
        JsonElement rawBundleJson,
        Bundle? bundle,
        string path,
        string? resourceType = null,
        int? entryIndex = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var normalizedPath = NormalizePath(path);
            var segments = ParsePathSegments(normalizedPath);
            
            // AUTHORING-ONLY: Detect resource-level where() clause
            // Example: "Observation.where(code.coding.code='HS')" → filter bundle entries
            bool hasResourceLevelWhere = segments.Count > 0 &&
                                          segments[0].Type == SegmentType.WhereClause &&
                                          bundle != null &&
                                          IsResourceType(bundle, segments[0].PropertyName);
            
            if (hasResourceLevelWhere && !entryIndex.HasValue)
            {
                // AUTHORING-ONLY: Use Bundle POCO to filter entries
                _logger.LogDebug("AUTHORING MODE: Evaluating resource-level where() for path: {Path}", path);
                
                var whereSegment = segments[0];
                var targetResourceType = whereSegment.PropertyName;
                var fhirSerializer = new Hl7.Fhir.Serialization.FhirJsonSerializer();
                
                // Iterate bundle entries to find first match
                for (int i = 0; i < bundle!.Entry.Count; i++)
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
                            entryIndex = i;
                            _logger.LogDebug("AUTHORING MODE: Resource-level where() matched entry {Index}", i);
                            break;
                        }
                    }
                }
                
                // If no match found, return null immediately
                if (!entryIndex.HasValue)
                {
                    _logger.LogDebug("AUTHORING MODE: Resource-level where() found no matches");
                    return null;
                }
                
                // Rebuild path without the resource-level where() segment
                var remainingSegments = segments.Skip(1).ToList();
                var rebuiltPath = string.Join(".", remainingSegments.Select(s => SegmentToString(s)));
                
                // FALLBACK: Delegate to DLL-SAFE resolver with explicit entryIndex
                return _jsonResolver.Resolve(rawBundleJson, rebuiltPath, entryIndex, targetResourceType);
            }
            
            // DLL-SAFE: No resource-level where() or explicit entryIndex provided
            // Delegate directly to JsonPointerResolver
            _logger.LogDebug("DLL-SAFE MODE: Delegating to JsonPointerResolver for path: {Path}", path);
            return _jsonResolver.Resolve(rawBundleJson, normalizedPath, entryIndex, resourceType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resolve path: {Path}", path);
            return null;
        }
    }
    
    /// <summary>
    /// Legacy overload - serializes Bundle POCO to JSON then navigates.
    /// </summary>
    [Obsolete("Use ResolvePathAsync(JsonElement rawBundleJson, Bundle bundle, ...) to ensure consistent navigation behavior")]
    public async Task<string?> ResolvePathAsync(
        Bundle bundle,
        string path,
        string? resourceType = null,
        int? entryIndex = null,
        CancellationToken cancellationToken = default)
    {
        // Serialize Bundle POCO to JSON
        var fhirSerializer = new Hl7.Fhir.Serialization.FhirJsonSerializer();
        var json = fhirSerializer.SerializeToString(bundle);
        var jsonElement = JsonDocument.Parse(json).RootElement;
        
        // Delegate to new method
        return await ResolvePathAsync(jsonElement, bundle, path, resourceType, entryIndex, cancellationToken);
    }
    
    // ============================================================================
    // AUTHORING-ONLY HELPERS (POCO-dependent)
    // ============================================================================
    
    private bool IsResourceType(Bundle bundle, string typeName)
    {
        return bundle.Entry.Any(e => e.Resource?.TypeName == typeName);
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
                
                // If current is an array, navigate into first element
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
    
    // ============================================================================
    // SHARED HELPERS (used by authoring logic)
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
        var parts = new List<string>();
        var currentPart = "";
        var parenDepth = 0;
        
        // Split by dots, but handle where() clauses
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
                // Check if next part is "where(" - if so, include it in current part
                if (i + 6 < path.Length && path.Substring(i + 1, 6) == "where(")
                {
                    currentPart += ch;
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
        
        // Parse each part
        foreach (var part in parts)
        {
            // Check for where clause
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
            
            // Check for array index
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
    
    private string SegmentToString(PathSegment segment)
    {
        return segment.Type switch
        {
            SegmentType.Property => segment.PropertyName,
            SegmentType.ArrayIndex => $"{segment.PropertyName}[{segment.Index}]",
            SegmentType.WhereClause => $"{segment.PropertyName}.where({segment.WhereExpression})",
            SegmentType.EntryReference => segment.Value,
            _ => segment.PropertyName
        };
    }
}