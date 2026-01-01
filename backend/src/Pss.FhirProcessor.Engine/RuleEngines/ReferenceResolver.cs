using System.Reflection;
using Hl7.Fhir.Model;
using Hl7.Fhir.Introspection;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;
using Microsoft.Extensions.Logging;

namespace Pss.FhirProcessor.Engine.RuleEngines;

/// <summary>
/// Validates resource references within a bundle
/// </summary>
public class ReferenceResolver : IReferenceResolver
{
    private readonly ILogger<ReferenceResolver>? _logger;
    
    public ReferenceResolver(ILogger<ReferenceResolver>? logger = null)
    {
        _logger = logger;
    }
    
    public async Task<List<ReferenceValidationError>> ValidateAsync(Bundle bundle, ValidationSettings? settings = null, CancellationToken cancellationToken = default)
    {
        var errors = new List<ReferenceValidationError>();
        
        var policy = settings?.ReferenceResolutionPolicy ?? "InBundleOnly";
        _logger?.LogInformation("Reference validation starting with policy: {Policy}", policy);
        
        // Build a lookup of available resources
        var resourceLookup = BuildResourceLookup(bundle);
        
        // Validate references in each entry
        for (int i = 0; i < bundle.Entry.Count; i++)
        {
            var entry = bundle.Entry[i];
            if (entry.Resource == null)
                continue;
            
            var refErrors = ValidateResourceReferences(entry.Resource, i, resourceLookup, settings);
            errors.AddRange(refErrors);
        }
        
        _logger?.LogInformation("Reference validation complete: {ErrorCount} errors found", errors.Count);
        
        return await System.Threading.Tasks.Task.FromResult(errors);
    }
    
    private Dictionary<string, (string ResourceType, string ResourceId, int EntryIndex)> BuildResourceLookup(Bundle bundle)
    {
        var lookup = new Dictionary<string, (string, string, int)>();
        
        for (int i = 0; i < bundle.Entry.Count; i++)
        {
            var entry = bundle.Entry[i];
            if (entry.Resource == null)
                continue;
            
            var resourceType = entry.Resource.TypeName;
            var resourceId = entry.Resource.Id;
            
            // Add fullUrl mapping
            if (!string.IsNullOrEmpty(entry.FullUrl))
            {
                lookup[entry.FullUrl] = (resourceType, resourceId ?? "", i);
            }
            
            // Add resourceType/id mapping
            if (!string.IsNullOrEmpty(resourceId))
            {
                var key = $"{resourceType}/{resourceId}";
                lookup[key] = (resourceType, resourceId, i);
            }
        }
        
        return lookup;
    }
    
    private List<ReferenceValidationError> ValidateResourceReferences(
        Resource resource,
        int entryIndex,
        Dictionary<string, (string ResourceType, string ResourceId, int EntryIndex)> resourceLookup,
        ValidationSettings? settings = null)
    {
        var errors = new List<ReferenceValidationError>();
        
        // Use reflection to find all ResourceReference properties
        var references = FindAllReferences(resource);
        
        // Deduplicate references - keep only the first occurrence of each unique reference string
        var seenReferences = new HashSet<string>();
        var uniqueReferences = new List<(string Path, ResourceReference Reference)>();
        
        foreach (var (refPath, reference) in references)
        {
            if (string.IsNullOrEmpty(reference.Reference))
                continue;
                
            // Only process each reference string once
            if (seenReferences.Add(reference.Reference))
            {
                uniqueReferences.Add((refPath, reference));
            }
        }
        
        foreach (var (refPath, reference) in uniqueReferences)
        {
            
            // Check if reference exists in bundle
            if (!resourceLookup.ContainsKey(reference.Reference))
            {
                // Determine severity based on validation settings
                var severity = "error";
                var message = $"Referenced resource not found: {reference.Reference}";
                
                // Apply AllowExternal policy: downgrade to warning if external references are allowed
                var policy = settings?.ReferenceResolutionPolicy ?? "InBundleOnly";
                
                _logger?.LogInformation("Reference not found: {Reference}, Policy: {Policy}", reference.Reference, policy);
                
                if (policy.Equals("AllowExternal", StringComparison.OrdinalIgnoreCase))
                {
                    severity = "warning";
                    message = $"Reference not resolved: {reference.Reference}. External references are allowed by project settings.";
                    _logger?.LogInformation("Downgraded to warning due to AllowExternal policy");
                }
                
                errors.Add(new ReferenceValidationError
                {
                    Severity = severity,
                    ResourceType = resource.TypeName,
                    FieldPath = refPath,
                    ErrorCode = "REFERENCE_NOT_FOUND",
                    Details = new Dictionary<string, object>
                    {
                        ["reference"] = reference.Reference
                    },
                    EntryIndex = entryIndex,
                    ResourceId = resource.Id,
                    Reference = reference.Reference
                });
            }
            else
            {
                // Validate reference type if specified
                var targetResource = resourceLookup[reference.Reference];
                
                // Check type in reference.Type or infer from reference string
                var expectedTypes = GetExpectedReferenceTypes(reference, refPath);
                
                if (expectedTypes.Any() && !expectedTypes.Contains(targetResource.ResourceType))
                {
                    errors.Add(new ReferenceValidationError
                    {
                        Severity = "error",
                        ResourceType = resource.TypeName,
                        FieldPath = refPath,
                        ErrorCode = "REFERENCE_TYPE_MISMATCH",
                        Details = new Dictionary<string, object>
                        {
                            ["reference"] = reference.Reference,
                            ["expectedTypes"] = expectedTypes,
                            ["actualType"] = targetResource.ResourceType
                        },
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id,
                        Reference = reference.Reference
                    });
                }
            }
        }
        
        return errors;
    }
    
    private List<(string Path, ResourceReference Reference)> FindAllReferences(Resource resource, string basePath = "")
    {
        var references = new List<(string, ResourceReference)>();
        
        if (resource == null)
            return references;
        
        var resourceType = resource.GetType();
        if (string.IsNullOrEmpty(basePath))
            basePath = resource.TypeName;
        
        // Get all properties but exclude base infrastructure properties to avoid duplicates
        // Exclude properties from Element, BackboneElement, Base, Resource base classes
        var properties = resourceType.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.Name != "Children" && // Internal FHIR element structure
                       p.Name != "ElementId" &&
                       p.Name != "Extension" &&  // These are already in typed properties
                       p.DeclaringType != typeof(Base) &&
                       p.GetIndexParameters().Length == 0); // Skip indexer properties
        
        foreach (var prop in properties)
        {
            object? value = null;
            try
            {
                value = prop.GetValue(resource);
            }
            catch (Exception ex) when (ex.InnerException is InvalidCastException)
            {
                // Handle invalid enum values that were allowed during lenient parsing
                // Skip this property and continue with others
                _logger?.LogDebug("Skipping property {Property} due to invalid enum value: {Message}", 
                    prop.Name, ex.InnerException.Message);
                continue;
            }
            
            if (value == null)
                continue;
            
            // Use JSON property name (camelCase) instead of C# property name (PascalCase)
            var jsonPropertyName = GetJsonPropertyName(prop);
            var propPath = $"{basePath}.{jsonPropertyName}";
            
            // Check if property is a ResourceReference
            if (value is ResourceReference resourceRef)
            {
                references.Add((propPath, resourceRef));
            }
            // Check if property is a list of ResourceReferences
            else if (value is System.Collections.IEnumerable enumerable && 
                     !(value is string))
            {
                int index = 0;
                foreach (var item in enumerable)
                {
                    if (item is ResourceReference itemRef)
                    {
                        references.Add(($"{propPath}[{index}]", itemRef));
                    }
                    else if (item is Element element)
                    {
                        // Recursively search complex elements
                        references.AddRange(FindReferencesInElement(element, $"{propPath}[{index}]"));
                    }
                    index++;
                }
            }
            // Recursively search complex types
            else if (value is Element element)
            {
                references.AddRange(FindReferencesInElement(element, propPath));
            }
        }
        
        return references;
    }
    
    private List<(string Path, ResourceReference Reference)> FindReferencesInElement(Element element, string basePath)
    {
        var references = new List<(string, ResourceReference)>();
        
        if (element == null)
            return references;
        
        var elementType = element.GetType();
        var properties = elementType.GetProperties(BindingFlags.Public | BindingFlags.Instance);
        
        foreach (var prop in properties)
        {
            object? value = null;
            try
            {
                value = prop.GetValue(element);
            }
            catch (Exception ex) when (ex.InnerException is InvalidCastException)
            {
                // Handle invalid enum values that were allowed during lenient parsing
                // Skip this property and continue with others
                continue;
            }
            
            if (value == null)
                continue;
            
            // Use JSON property name (camelCase) instead of C# property name (PascalCase)
            var jsonPropertyName = GetJsonPropertyName(prop);
            var propPath = $"{basePath}.{jsonPropertyName}";
            
            if (value is ResourceReference resourceRef)
            {
                references.Add((propPath, resourceRef));
            }
            else if (value is System.Collections.IEnumerable enumerable && 
                     !(value is string))
            {
                int index = 0;
                foreach (var item in enumerable)
                {
                    if (item is ResourceReference itemRef)
                    {
                        references.Add(($"{propPath}[{index}]", itemRef));
                    }
                    else if (item is Element childElement)
                    {
                        references.AddRange(FindReferencesInElement(childElement, $"{propPath}[{index}]"));
                    }
                    index++;
                }
            }
            else if (value is Element childElement)
            {
                references.AddRange(FindReferencesInElement(childElement, propPath));
            }
        }
        
        return references;
    }
    
    private List<string> GetExpectedReferenceTypes(ResourceReference reference, string path)
    {
        var types = new List<string>();
        
        // Check if reference.Type is specified
        if (!string.IsNullOrEmpty(reference.Type))
        {
            types.Add(reference.Type);
        }
        
        // Infer from common FHIR patterns (case-insensitive)
        var lowerPath = path.ToLowerInvariant();
        if (lowerPath.Contains(".subject"))
        {
            types.AddRange(new[] { "Patient", "Group", "Device", "Location" });
        }
        else if (lowerPath.Contains(".performer") || lowerPath.Contains(".practitioner"))
        {
            types.AddRange(new[] { "Practitioner", "PractitionerRole", "Organization" });
        }
        else if (lowerPath.Contains(".encounter"))
        {
            types.Add("Encounter");
        }
        else if (lowerPath.Contains(".location"))
        {
            types.Add("Location");
        }
        
        return types;
    }
    
    /// <summary>
    /// Get the JSON property name from a C# property using FHIR attributes.
    /// Falls back to camelCase conversion if no attribute found.
    /// </summary>
    private string GetJsonPropertyName(PropertyInfo prop)
    {
        // Check for FhirElementAttribute which contains the JSON name
        var fhirAttr = prop.GetCustomAttribute<FhirElementAttribute>();
        if (fhirAttr != null && !string.IsNullOrEmpty(fhirAttr.Name))
        {
            return fhirAttr.Name;
        }
        
        // Fallback: Convert PascalCase to camelCase
        var name = prop.Name;
        if (string.IsNullOrEmpty(name))
            return name;
            
        return char.ToLowerInvariant(name[0]) + name.Substring(1);
    }
}