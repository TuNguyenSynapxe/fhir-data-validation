using Hl7.Fhir.Model;
using Hl7.Fhir.ElementModel;
using Hl7.FhirPath;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Selects resource instances from a Bundle based on structured InstanceScope criteria.
/// NO STRING PARSING. NO REGEX. Explicit and testable.
/// </summary>
public interface IResourceSelector
{
    /// <summary>
    /// Select resources from Bundle matching the given criteria.
    /// </summary>
    /// <returns>Resources with their Bundle entry indices</returns>
    IEnumerable<(Resource Resource, int EntryIndex)> SelectResources(
        Bundle bundle,
        string resourceType,
        InstanceScope scope);
}

public class ResourceSelector : IResourceSelector
{
    private readonly FhirPathCompiler _compiler;
    private readonly ILogger<ResourceSelector> _logger;

    public ResourceSelector(ILogger<ResourceSelector> logger)
    {
        _compiler = new FhirPathCompiler();
        _logger = logger;
    }

    public IEnumerable<(Resource Resource, int EntryIndex)> SelectResources(
        Bundle bundle,
        string resourceType,
        InstanceScope scope)
    {
        if (bundle?.Entry == null)
        {
            return Enumerable.Empty<(Resource, int)>();
        }

        // Step 1: Find all resources of the specified type
        var matchingEntries = bundle.Entry
            .Select((entry, index) => new { Entry = entry, Index = index })
            .Where(item => item.Entry.Resource != null && 
                          item.Entry.Resource.TypeName == resourceType)
            .ToList();

        if (!matchingEntries.Any())
        {
            _logger.LogTrace("No resources of type {ResourceType} found in Bundle", resourceType);
            return Enumerable.Empty<(Resource, int)>();
        }

        // Step 2: Apply instance scope filtering
        return scope switch
        {
            AllInstances => SelectAllInstances(matchingEntries),
            FirstInstance => SelectFirstInstance(matchingEntries),
            FilteredInstances filtered => SelectFilteredInstances(matchingEntries, filtered),
            _ => throw new NotSupportedException($"Unknown InstanceScope type: {scope.GetType().Name}")
        };
    }

    private IEnumerable<(Resource, int)> SelectAllInstances<T>(
        List<T> matchingEntries) where T : class
    {
        _logger.LogTrace("Selecting all {Count} instances", matchingEntries.Count);
        return matchingEntries.Select(item => 
        {
            var entry = (dynamic)item;
            return ((Resource)entry.Entry.Resource, (int)entry.Index);
        });
    }

    private IEnumerable<(Resource, int)> SelectFirstInstance<T>(
        List<T> matchingEntries) where T : class
    {
        _logger.LogTrace("Selecting first instance only");
        var first = matchingEntries.FirstOrDefault();
        if (first == null) return Enumerable.Empty<(Resource, int)>();
        
        var entry = (dynamic)first;
        return new[] { ((Resource)entry.Entry.Resource, (int)entry.Index) };
    }

    private IEnumerable<(Resource, int)> SelectFilteredInstances<T>(
        List<T> matchingEntries,
        FilteredInstances filter) where T : class
    {
        _logger.LogTrace("Applying filter: {Condition}", filter.ConditionFhirPath);

        var results = new List<(Resource, int)>();

        try
        {
            var compiled = _compiler.Compile(filter.ConditionFhirPath);

            foreach (var item in matchingEntries)
            {
                var entry = (dynamic)item;
                var resource = (Resource)entry.Entry.Resource;
                var entryIndex = (int)entry.Index;

                // Evaluate filter relative to this resource
                var typedElement = resource.ToTypedElement();
                var scopedNode = new ScopedNode(typedElement);
                var evalResult = compiled(scopedNode, new EvaluationContext());
                var resultList = evalResult.ToList();

                // Interpret result: non-empty = match, empty = no match
                // For boolean results, check the actual value
                var matches = false;

                if (resultList.Any())
                {
                    var firstResult = resultList.First();
                    if (firstResult is ITypedElement element && element.Value is bool boolValue)
                    {
                        matches = boolValue;
                    }
                    else
                    {
                        // Non-boolean result: non-empty collection = match
                        matches = true;
                    }
                }

                if (matches)
                {
                    _logger.LogTrace("Resource at entry {EntryIndex} matches filter", entryIndex);
                    results.Add((resource, entryIndex));
                }
                else
                {
                    _logger.LogTrace("Resource at entry {EntryIndex} does not match filter", entryIndex);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error evaluating filter condition: {Condition}", filter.ConditionFhirPath);
            throw new InvalidOperationException(
                $"Failed to evaluate filter condition '{filter.ConditionFhirPath}': {ex.Message}", ex);
        }

        return results;
    }
}
