using System.Text.Json;
using Pss.FhirProcessor.Application.Projects.Import.ImportModels;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Import;

/// <summary>
/// Generates ProjectRules from StructureDefinitions.
/// Rules are descriptive metadata, not executable logic.
/// </summary>
public sealed class StructureDefinitionRuleGenerator
{
    /// <summary>
    /// Represents a generated rule from a StructureDefinition.
    /// </summary>
    public sealed class GeneratedRule
    {
        public RuleScope Scope { get; init; }
        public RuleType RuleType { get; init; }
        public RuleProvenance Provenance { get; init; }
        public string Title { get; init; } = string.Empty;
        public string? Description { get; init; }
        public string DefinitionJson { get; init; } = string.Empty;
        public bool IsEnabled { get; init; }
    }

    /// <summary>
    /// Generates rules from StructureDefinition artifacts.
    /// </summary>
    /// <param name="structureDefinitions">Parsed StructureDefinition artifacts.</param>
    /// <returns>List of generated rules.</returns>
    public List<GeneratedRule> GenerateRules(List<ParsedArtifact> structureDefinitions)
    {
        var rules = new List<GeneratedRule>();

        foreach (var sd in structureDefinitions.Where(a => a.ArtifactType == ArtifactType.StructureDefinition))
        {
            var doc = JsonDocument.Parse(sd.ResourceJson);
            var root = doc.RootElement;

            // Extract metadata
            var title = ExtractTitle(root, sd);
            var description = ExtractDescription(root);
            var url = sd.CanonicalUrl ?? "unknown";

            // Create rule definition metadata
            var ruleDefinition = new
            {
                canonical = url,
                resourceType = "StructureDefinition",
                source = "import",
                importedFrom = sd.FileName,
                constraints = ExtractConstraints(root)
            };

            rules.Add(new GeneratedRule
            {
                Scope = RuleScope.Project,
                RuleType = RuleType.ProfileDerived,
                Provenance = RuleProvenance.ImportedGenerated,
                Title = title,
                Description = description,
                DefinitionJson = JsonSerializer.Serialize(ruleDefinition),
                IsEnabled = true
            });
        }

        return rules;
    }

    private static string ExtractTitle(JsonElement root, ParsedArtifact sd)
    {
        // Try: title → name → filename
        if (root.TryGetProperty("title", out var titleElement))
        {
            var title = titleElement.GetString();
            if (!string.IsNullOrWhiteSpace(title))
            {
                return title;
            }
        }

        if (root.TryGetProperty("name", out var nameElement))
        {
            var name = nameElement.GetString();
            if (!string.IsNullOrWhiteSpace(name))
            {
                return name;
            }
        }

        return Path.GetFileNameWithoutExtension(sd.FileName);
    }

    private static string? ExtractDescription(JsonElement root)
    {
        if (root.TryGetProperty("description", out var descElement))
        {
            return descElement.GetString();
        }

        return null;
    }

    private static List<object> ExtractConstraints(JsonElement root)
    {
        var constraints = new List<object>();

        // Extract snapshot.element[].constraint if present
        if (root.TryGetProperty("snapshot", out var snapshotElement) &&
            snapshotElement.TryGetProperty("element", out var elementsElement) &&
            elementsElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var element in elementsElement.EnumerateArray())
            {
                if (element.TryGetProperty("constraint", out var constraintArray) &&
                    constraintArray.ValueKind == JsonValueKind.Array)
                {
                    foreach (var constraint in constraintArray.EnumerateArray())
                    {
                        if (constraint.TryGetProperty("key", out var keyElement) &&
                            constraint.TryGetProperty("severity", out var severityElement) &&
                            constraint.TryGetProperty("human", out var humanElement))
                        {
                            constraints.Add(new
                            {
                                key = keyElement.GetString(),
                                severity = severityElement.GetString(),
                                human = humanElement.GetString(),
                                expression = constraint.TryGetProperty("expression", out var exprElement)
                                    ? exprElement.GetString()
                                    : null
                            });
                        }
                    }
                }
            }
        }

        return constraints;
    }
}
