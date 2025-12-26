using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Safe schema expansion service with recursion guards.
/// Prevents infinite loops when expanding FHIR StructureDefinitions.
/// </summary>
public class SchemaExpansionService : ISchemaExpansionService
{
    private readonly ILogger<SchemaExpansionService> _logger;
    private const int DefaultMaxDepth = 8;
    
    // FHIR R4 primitive types that should NOT be expanded
    private static readonly HashSet<string> PrimitiveTypes = new()
    {
        "boolean", "integer", "string", "decimal", "uri", "url", "canonical",
        "base64Binary", "instant", "date", "dateTime", "time", "code", "oid",
        "id", "markdown", "unsignedInt", "positiveInt", "uuid", "xhtml"
    };

    public SchemaExpansionService(ILogger<SchemaExpansionService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Expands a StructureDefinition into a safe, finite schema tree.
    /// </summary>
    public FhirSchemaNode ExpandStructureDefinition(
        StructureDefinition structureDefinition, 
        string resourceType,
        int maxDepth = DefaultMaxDepth)
    {
        if (structureDefinition.Snapshot == null || structureDefinition.Snapshot.Element.Count == 0)
        {
            throw new ArgumentException($"StructureDefinition for {resourceType} has no snapshot elements", nameof(structureDefinition));
        }

        _logger.LogInformation("Expanding schema for {ResourceType} with max depth {MaxDepth}", resourceType, maxDepth);

        var elements = structureDefinition.Snapshot.Element;
        var rootElement = elements.FirstOrDefault(e => e.Path == resourceType);
        
        if (rootElement == null)
        {
            throw new InvalidOperationException($"Root element not found for {resourceType}");
        }

        // Initialize recursion tracking
        var visitedTypes = new HashSet<string>();
        var elementsByPath = elements.ToDictionary(e => e.Path, e => e);

        // Expand root node
        var rootNode = CreateNodeFromElement(rootElement, resourceType);
        ExpandChildren(rootNode, elements, resourceType, elementsByPath, visitedTypes, currentDepth: 0, maxDepth);

        _logger.LogInformation("Schema expansion completed for {ResourceType}", resourceType);
        return rootNode;
    }

    /// <summary>
    /// Recursively expands child nodes with safety guards.
    /// </summary>
    private void ExpandChildren(
        FhirSchemaNode parentNode,
        List<ElementDefinition> allElements,
        string parentPath,
        Dictionary<string, ElementDefinition> elementsByPath,
        HashSet<string> visitedTypes,
        int currentDepth,
        int maxDepth)
    {
        // Guard: Max depth reached
        if (currentDepth >= maxDepth)
        {
            _logger.LogDebug("Max depth {MaxDepth} reached at path: {Path}", maxDepth, parentPath);
            return;
        }

        // Find direct children (one level deeper than parent)
        var childElements = allElements
            .Where(e => IsDirectChild(e.Path, parentPath))
            .ToList();

        foreach (var childElement in childElements)
        {
            var childNode = CreateNodeFromElement(childElement, parentPath);
            parentNode.Children.Add(childNode);

            // Guard: Don't expand primitive types
            if (IsPrimitiveType(childNode.Type))
            {
                _logger.LogTrace("Skipping primitive type: {Type} at {Path}", childNode.Type, childElement.Path);
                continue;
            }

            // Guard: Don't expand choice types automatically (Phase 1)
            if (childNode.IsChoice)
            {
                _logger.LogDebug("Choice type element: {Path} with types: {Types}", 
                    childElement.Path, string.Join(", ", childNode.ChoiceTypes));
                continue;
            }

            // Guard: Check if type already visited (prevent cycles)
            var typeKey = GetTypeKey(childNode);
            if (visitedTypes.Contains(typeKey))
            {
                _logger.LogDebug("Type {Type} already visited, skipping expansion at {Path}", 
                    childNode.Type, childElement.Path);
                continue;
            }

            // Expand complex types and BackboneElements
            if (ShouldExpand(childElement, childNode))
            {
                // Add type to visited set for this branch
                var branchVisitedTypes = new HashSet<string>(visitedTypes) { typeKey };
                
                ExpandChildren(
                    childNode, 
                    allElements, 
                    childElement.Path, 
                    elementsByPath,
                    branchVisitedTypes,
                    currentDepth + 1,
                    maxDepth);
            }
        }
    }

    /// <summary>
    /// Determines if an element path is a direct child of a parent path.
    /// Example: "Patient.name" is child of "Patient", but "Patient.name.family" is not.
    /// </summary>
    private bool IsDirectChild(string childPath, string parentPath)
    {
        if (!childPath.StartsWith(parentPath + "."))
            return false;

        var suffix = childPath.Substring(parentPath.Length + 1);
        return !suffix.Contains('.');
    }

    /// <summary>
    /// Creates a schema node from an ElementDefinition.
    /// </summary>
    private FhirSchemaNode CreateNodeFromElement(ElementDefinition element, string parentPath)
    {
        var elementName = GetElementName(element.Path, parentPath);
        var types = element.Type?.Select(t => t.Code?.ToString() ?? "").Where(c => !string.IsNullOrEmpty(c)).ToList() 
                    ?? new List<string>();
        
        var isChoice = element.Path.Contains("[x]") || types.Count > 1;
        var isBackbone = types.Contains("BackboneElement") || element.Type?.Any(t => t.Code == null) == true;
        
        // Determine primary type
        string primaryType;
        if (isChoice && types.Count > 0)
        {
            primaryType = element.Path.Contains("[x]") ? element.Path.Split('.').Last() : types.First();
        }
        else if (types.Count > 0)
        {
            primaryType = types.First();
        }
        else if (isBackbone)
        {
            primaryType = "BackboneElement";
        }
        else
        {
            primaryType = "Element";
        }

        var node = new FhirSchemaNode
        {
            Path = element.Path,
            ElementName = elementName,
            Type = primaryType,
            ChoiceTypes = isChoice ? types : new List<string>(),
            IsArray = element.Max == "*",
            IsChoice = isChoice,
            Min = element.Min ?? 0,
            Max = element.Max ?? "1",
            Description = element.Definition,
            Short = element.Short,
            IsBackbone = isBackbone,
            IsRequired = (element.Min ?? 0) >= 1
        };

        return node;
    }

    /// <summary>
    /// Extracts the element name from a full path.
    /// </summary>
    private string GetElementName(string path, string parentPath)
    {
        if (path == parentPath)
            return path; // Root element

        var parts = path.Split('.');
        return parts.Last();
    }

    /// <summary>
    /// Determines if a type is a FHIR primitive type.
    /// </summary>
    private bool IsPrimitiveType(string typeName)
    {
        return PrimitiveTypes.Contains(typeName);
    }

    /// <summary>
    /// Generates a unique key for tracking visited types.
    /// </summary>
    private string GetTypeKey(FhirSchemaNode node)
    {
        // For BackboneElements, use the path as key (they're structure-specific)
        if (node.IsBackbone)
        {
            return $"BackboneElement:{node.Path}";
        }
        
        // For regular types, use the type name
        return node.Type;
    }

    /// <summary>
    /// Determines if an element should be expanded.
    /// </summary>
    private bool ShouldExpand(ElementDefinition element, FhirSchemaNode node)
    {
        // Always expand BackboneElements (they're inline definitions)
        if (node.IsBackbone)
        {
            return true;
        }

        // Don't expand primitive types
        if (IsPrimitiveType(node.Type))
        {
            return false;
        }

        // Don't expand choice types in Phase 1
        if (node.IsChoice)
        {
            return false;
        }

        // Expand complex types (start with uppercase, not primitive)
        return !string.IsNullOrEmpty(node.Type) && char.IsUpper(node.Type[0]);
    }
}
