using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.RuleSuggestion.Interfaces;
using Pss.FhirProcessor.Engine.RuleSuggestion.Models;

namespace Pss.FhirProcessor.Engine.RuleSuggestion.Services;

/// <summary>
/// Service for flattening FHIR bundles into FHIRPath observations
/// </summary>
public class BundleFlattener : IBundleFlattener
{
    public Dictionary<string, List<object>> FlattenBundle(object bundle)
    {
        var pathMap = new Dictionary<string, List<object>>();
        
        if (bundle is Bundle fhirBundle && fhirBundle.Entry != null)
        {
            foreach (var entry in fhirBundle.Entry)
            {
                if (entry.Resource == null) continue;
                
                var resourceType = entry.Resource.TypeName;
                ExtractPaths(entry.Resource, resourceType, resourceType, pathMap);
            }
        }
        else if (bundle is JsonElement jsonBundle)
        {
            if (jsonBundle.TryGetProperty("entry", out var entries) && entries.ValueKind == JsonValueKind.Array)
            {
                foreach (var entry in entries.EnumerateArray())
                {
                    if (entry.TryGetProperty("resource", out var resource))
                    {
                        if (resource.TryGetProperty("resourceType", out var resourceTypeElement))
                        {
                            var resourceType = resourceTypeElement.GetString() ?? "Unknown";
                            ExtractPathsFromJson(resource, resourceType, resourceType, pathMap);
                        }
                    }
                }
            }
        }
        
        // Normalize values
        foreach (var kvp in pathMap.ToList())
        {
            pathMap[kvp.Key] = NormalizeValues(kvp.Value);
        }
        
        return pathMap;
    }
    
    public List<PathClassification> ClassifyPaths(Dictionary<string, List<object>> flattenedData)
    {
        var classifications = new List<PathClassification>();
        
        foreach (var kvp in flattenedData)
        {
            var path = kvp.Key;
            var values = kvp.Value;
            
            if (values.Count == 0) continue;
            
            var classification = new PathClassification
            {
                Path = path,
                ResourceType = ExtractResourceType(path),
                ObservedValues = values,
                DistinctValueCount = values.Distinct().Count(),
                IsArray = IsArrayPath(path),
                PrimitiveType = DetectPrimitiveType(values),
                HasSystemAndCode = DetectSystemAndCode(values),
                HasValueX = path.Contains("value[x]") || path.Contains("value"),
                HasConsistentFormat = DetectConsistentFormat(values)
            };
            
            classifications.Add(classification);
        }
        
        return classifications;
    }
    
    private void ExtractPaths(Resource resource, string basePath, string resourceType, Dictionary<string, List<object>> pathMap)
    {
        var json = JsonSerializer.Serialize(resource, new JsonSerializerOptions { WriteIndented = false });
        var element = JsonSerializer.Deserialize<JsonElement>(json);
        ExtractPathsFromJson(element, basePath, resourceType, pathMap);
    }
    
    private void ExtractPathsFromJson(JsonElement element, string currentPath, string resourceType, Dictionary<string, List<object>> pathMap)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    // Skip internal FHIR properties
                    if (property.Name.StartsWith("_")) continue;
                    
                    var fieldPath = $"{currentPath}.{property.Name}";
                    
                    if (property.Value.ValueKind == JsonValueKind.Array)
                    {
                        var array = property.Value.EnumerateArray().ToList();
                        for (int i = 0; i < array.Count; i++)
                        {
                            var arrayPath = $"{fieldPath}[{i}]";
                            ExtractPathsFromJson(array[i], arrayPath, resourceType, pathMap);
                        }
                    }
                    else if (property.Value.ValueKind == JsonValueKind.Object)
                    {
                        ExtractPathsFromJson(property.Value, fieldPath, resourceType, pathMap);
                    }
                    else
                    {
                        // Leaf value - add to path map
                        AddToPathMap(pathMap, fieldPath, property.Value);
                    }
                }
                break;
                
            case JsonValueKind.String:
            case JsonValueKind.Number:
            case JsonValueKind.True:
            case JsonValueKind.False:
                AddToPathMap(pathMap, currentPath, element);
                break;
        }
    }
    
    private void AddToPathMap(Dictionary<string, List<object>> pathMap, string path, JsonElement value)
    {
        // Normalize path (remove array indices for aggregation)
        var normalizedPath = Regex.Replace(path, @"\[\d+\]", "[*]");
        
        if (!pathMap.ContainsKey(normalizedPath))
        {
            pathMap[normalizedPath] = new List<object>();
        }
        
        object extractedValue = value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? string.Empty,
            JsonValueKind.Number => value.TryGetInt32(out var intVal) ? intVal : value.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => value.ToString()
        };
        
        pathMap[normalizedPath].Add(extractedValue);
    }
    
    private List<object> NormalizeValues(List<object> values)
    {
        return values
            .Where(v => v != null)
            .Select(v =>
            {
                if (v is string str)
                {
                    return str.Trim();
                }
                return v;
            })
            .Where(v => v is not string s || !string.IsNullOrWhiteSpace(s))
            .ToList();
    }
    
    private string ExtractResourceType(string path)
    {
        var parts = path.Split('.');
        return parts.Length > 0 ? parts[0] : "Unknown";
    }
    
    private bool IsArrayPath(string path)
    {
        return path.Contains("[*]");
    }
    
    private Models.PrimitiveType DetectPrimitiveType(List<object> values)
    {
        if (values.Count == 0) return Models.PrimitiveType.Unknown;
        
        var sample = values.First();
        
        return sample switch
        {
            bool => Models.PrimitiveType.Boolean,
            int or long or double or decimal => Models.PrimitiveType.Number,
            string str when IsDateLike(str) => Models.PrimitiveType.Date,
            string str when IsCodeLike(str) => Models.PrimitiveType.Code,
            string => Models.PrimitiveType.String,
            _ => Models.PrimitiveType.Object
        };
    }
    
    private bool IsDateLike(string value)
    {
        return DateTime.TryParse(value, out _) || 
               Regex.IsMatch(value, @"^\d{4}-\d{2}-\d{2}");
    }
    
    private bool IsCodeLike(string value)
    {
        // Short uppercase strings or hyphen-separated codes
        return value.Length <= 20 && 
               (value.All(char.IsUpper) || value.Contains('-') || value.Contains('_'));
    }
    
    private bool DetectSystemAndCode(List<object> values)
    {
        // This would need more sophisticated detection in real implementation
        // For now, return false - proper detection requires analyzing parent structure
        return false;
    }
    
    private bool DetectConsistentFormat(List<object> values)
    {
        if (values.Count < 2) return true;
        
        var stringValues = values.OfType<string>().ToList();
        if (stringValues.Count == 0) return true;
        
        // Check if all values match same format pattern
        var firstPattern = GetFormatPattern(stringValues.First());
        return stringValues.All(v => GetFormatPattern(v) == firstPattern);
    }
    
    private string GetFormatPattern(string value)
    {
        // Convert specific chars to generic patterns
        return Regex.Replace(value, @"\d", "N")           // Numbers
                    .Replace(" ", "S")                     // Spaces
                    .Replace("-", "D")                     // Dashes
                    .Replace("/", "L")                     // Slashes
                    .Replace(":", "C");                    // Colons
    }
}
