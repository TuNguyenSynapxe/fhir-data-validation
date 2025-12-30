using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

/// <summary>
/// Default implementation of Question/Answer context resolution.
/// Phase 2A: Uses InstanceScope and FieldPath for iteration.
/// Handles deterministic traversal of Bundle entries and iteration nodes.
/// 
/// INTENTIONALLY MINIMAL:
/// - Only supports Observation.component iteration
/// - No heuristics or string parsing
/// - Deterministic FHIRPath generation
/// </summary>
public class DefaultQuestionAnswerContextProvider : IQuestionAnswerContextProvider
{
    private readonly ILogger<DefaultQuestionAnswerContextProvider> _logger;

    public DefaultQuestionAnswerContextProvider(ILogger<DefaultQuestionAnswerContextProvider> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Resolve all validation contexts for a rule.
    /// Phase 2A: Uses InstanceScope to determine iteration behavior.
    /// </summary>
    public IEnumerable<QuestionAnswerContextSeed> Resolve(Bundle bundle, RuleDefinition rule)
    {
        if (bundle?.Entry == null)
        {
            yield break;
        }

        // Select matching resources by type
        var matchingEntries = GetMatchingEntries(bundle, rule.ResourceType);

        foreach (var (resource, entryIndex) in matchingEntries)
        {
            // Phase 2A: Determine iteration based on FieldPath structure
            // Only Observation.component fields require iteration
            var iterationNodes = GetIterationNodes(resource, rule.FieldPath);

            if (iterationNodes.Count == 0)
            {
                // No iteration - validate at resource level
                yield return new QuestionAnswerContextSeed(
                    Resource: resource,
                    IterationNode: resource,
                    EntryIndex: entryIndex,
                    CurrentFhirPath: BuildResourceLevelPath(entryIndex),
                    IterationIndex: 0
                );
            }
            else
            {
                // Iterate over repeating nodes (e.g., Observation.component)
                for (int i = 0; i < iterationNodes.Count; i++)
                {
                    yield return new QuestionAnswerContextSeed(
                        Resource: resource,
                        IterationNode: iterationNodes[i],
                        EntryIndex: entryIndex,
                        CurrentFhirPath: BuildIterationNodePath(resource.TypeName, entryIndex, i, rule.FieldPath),
                        IterationIndex: i
                    );
                }
            }
        }
    }

    /// <summary>
    /// Get matching bundle entries with their indices.
    /// </summary>
    private IEnumerable<(Resource resource, int entryIndex)> GetMatchingEntries(Bundle bundle, string resourceType)
    {
        for (int i = 0; i < bundle.Entry.Count; i++)
        {
            var entry = bundle.Entry[i];
            if (entry.Resource != null && entry.Resource.TypeName == resourceType)
            {
                yield return (entry.Resource, i);
            }
        }
    }

    /// <summary>
    /// Get iteration nodes from resource.
    /// Phase 2A: Uses FieldPath to detect component iteration.
    /// MINIMAL IMPLEMENTATION: Only supports Observation.component.
    /// </summary>
    private List<Base> GetIterationNodes(Resource resource, string? fieldPath)
    {
        var nodes = new List<Base>();

        if (string.IsNullOrWhiteSpace(fieldPath))
        {
            return nodes;
        }

        try
        {
            // Intentionally minimal: only handle known iteration pattern
            if (ShouldIterateComponents(resource, fieldPath))
            {
                if (resource is Observation obs && obs.Component?.Any() == true)
                {
                    nodes.AddRange(obs.Component);
                }
            }
            // Otherwise: no iteration (resource-level validation)
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error resolving iteration nodes for {ResourceType}", resource.TypeName);
        }

        return nodes;
    }

    /// <summary>
    /// Determine if we should iterate over components.
    /// Phase 2A: Uses FieldPath structure instead of Path string.
    /// Minimal heuristic: FieldPath starts with "component" and resource is Observation.
    /// </summary>
    private bool ShouldIterateComponents(Resource resource, string fieldPath)
    {
        return resource is Observation &&
               fieldPath.StartsWith("component", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Build FHIRPath for resource-level validation.
    /// </summary>
    private string BuildResourceLevelPath(int entryIndex)
    {
        return $"Bundle.entry[{entryIndex}].resource";
    }

    /// <summary>
    /// Build FHIRPath for iteration node validation.
    /// Phase 2A: Uses FieldPath to construct deterministic path.
    /// Deterministic: Bundle.entry[{entryIndex}].resource.component[{nodeIndex}]
    /// </summary>
    private string BuildIterationNodePath(string resourceType, int entryIndex, int nodeIndex, string? fieldPath)
    {
        // Phase 2A: Extract iteration element from FieldPath structure
        // For now, hardcode "component" since that's our only supported case
        if (resourceType == "Observation" && 
            !string.IsNullOrWhiteSpace(fieldPath) && 
            fieldPath.StartsWith("component", StringComparison.OrdinalIgnoreCase))
        {
            return $"Bundle.entry[{entryIndex}].resource.component[{nodeIndex}]";
        }

        // Fallback (shouldn't reach here with current logic)
        return $"Bundle.entry[{entryIndex}].resource";
    }
}
