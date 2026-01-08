using Hl7.Fhir.Introspection;
using Microsoft.Extensions.Logging;
using System.Collections;

namespace Pss.FhirProcessor.Engine.SdValidation.PathResolution;

/// <summary>
/// Phase 3.1: Generic element path resolution against FHIR POCOs.
/// 
/// Uses ModelInspector to navigate POCO structures.
/// Supports nested paths, repeating elements, choice types.
/// Deterministic, safe, no reflection hacks.
/// </summary>
public class ElementPathResolver : IElementPathResolver
{
    private readonly ILogger<ElementPathResolver> _logger;

    public ElementPathResolver(ILogger<ElementPathResolver> logger)
    {
        _logger = logger;
    }

    public IEnumerable<ElementValueContext> ResolveValues(
        object rootPoco,
        string elementPath,
        ModelInspector inspector)
    {
        if (rootPoco == null)
        {
            yield return new ElementValueContext(null, elementPath, true);
            yield break;
        }

        if (string.IsNullOrWhiteSpace(elementPath))
        {
            _logger.LogWarning("Empty element path provided");
            yield return new ElementValueContext(null, elementPath, true);
            yield break;
        }

        var pathSegments = elementPath.Split('.', StringSplitOptions.RemoveEmptyEntries);
        if (pathSegments.Length == 0)
        {
            yield return new ElementValueContext(null, elementPath, true);
            yield break;
        }

        // Single segment - direct property access
        if (pathSegments.Length == 1)
        {
            yield return new ElementValueContext(rootPoco, pathSegments[0], false);
            yield break;
        }

        // Start traversal from root (skip resource type segment)
        var contexts = new List<(object Current, List<string> PathParts)> 
        { 
            (rootPoco, new List<string> { pathSegments[0] }) 
        };

        for (int segmentIndex = 1; segmentIndex < pathSegments.Length; segmentIndex++)
        {
            var segment = pathSegments[segmentIndex];
            var nextContexts = new List<(object Current, List<string> PathParts)>();

            foreach (var (current, pathParts) in contexts)
            {
                if (current == null)
                {
                    continue;
                }

                var resolvedValues = ResolveSegment(current, segment, inspector);
                foreach (var (value, resolvedName) in resolvedValues)
                {
                    if (value != null)
                    {
                        var newPath = new List<string>(pathParts) { resolvedName };
                        nextContexts.Add((value, newPath));
                    }
                }
            }

            contexts = nextContexts;

            if (contexts.Count == 0)
            {
                // Path exists in structure but no values found
                yield return new ElementValueContext(null, elementPath, true);
                yield break;
            }
        }

        // Return all resolved values
        if (contexts.Count == 0)
        {
            yield return new ElementValueContext(null, elementPath, true);
        }
        else
        {
            foreach (var (current, pathParts) in contexts)
            {
                var absolutePath = string.Join(".", pathParts);
                yield return new ElementValueContext(current, absolutePath, false);
            }
        }
    }

    /// <summary>
    /// Resolves a single path segment against a POCO.
    /// Handles properties, choice types, and collections.
    /// </summary>
    private IEnumerable<(object? Value, string ResolvedName)> ResolveSegment(
        object poco,
        string segment,
        ModelInspector inspector)
    {
        var classMapping = inspector.FindClassMapping(poco.GetType());
        if (classMapping == null)
        {
            _logger.LogDebug(
                "No class mapping found for type {Type}",
                poco.GetType().Name);
            yield break;
        }

        // Try exact property match first
        var propertyMapping = classMapping.PropertyMappings
            .FirstOrDefault(p => p.Name.Equals(segment, StringComparison.OrdinalIgnoreCase));

        if (propertyMapping != null)
        {
            var value = propertyMapping.GetValue(poco);
            if (value != null)
            {
                // Handle collections (but not dictionaries which shouldn't be enumerated)
                if (value is IEnumerable enumerable && value is not string && value.GetType().IsGenericType)
                {
                    var genericType = value.GetType().GetGenericTypeDefinition();
                    // Only enumerate lists, not dictionaries
                    if (genericType == typeof(List<>) || value.GetType().IsArray)
                    {
                        foreach (var item in enumerable)
                        {
                            if (item != null)
                            {
                                yield return (item, propertyMapping.Name);
                            }
                        }
                        yield break;
                    }
                }
                
                yield return (value, propertyMapping.Name);
            }
            yield break;
        }

        // Try choice type resolution ([x] suffix)
        if (segment.EndsWith("[x]", StringComparison.OrdinalIgnoreCase))
        {
            var baseName = segment.Substring(0, segment.Length - 3);
            var choiceProperties = classMapping.PropertyMappings
                .Where(p => p.Name.StartsWith(baseName, StringComparison.OrdinalIgnoreCase) &&
                           p.Choice == ChoiceType.DatatypeChoice)
                .ToList();

            foreach (var choiceProp in choiceProperties)
            {
                var value = choiceProp.GetValue(poco);
                if (value != null)
                {
                    yield return (value, choiceProp.Name);
                }
            }
            yield break;
        }

        // Try as choice type base name (e.g., "value" matches "valueString", "valueInteger")
        var potentialChoices = classMapping.PropertyMappings
            .Where(p => p.Name.StartsWith(segment, StringComparison.OrdinalIgnoreCase) &&
                       p.Choice == ChoiceType.DatatypeChoice)
            .ToList();

        if (potentialChoices.Any())
        {
            foreach (var choiceProp in potentialChoices)
            {
                var value = choiceProp.GetValue(poco);
                if (value != null)
                {
                    yield return (value, choiceProp.Name);
                }
            }
        }
    }
}
