using System.Text.Json;
using Pss.FhirProcessor.Terminology.ImportTool.Models;

namespace Pss.FhirProcessor.Terminology.ImportTool.Parsers;

/// <summary>
/// Parses FHIR CodeSystem JSON files using System.Text.Json only (no Firely).
/// Extracts minimal fields: url, version, name, concepts (code + display).
/// </summary>
public static class CodeSystemParser
{
    public static CodeSystemRegistryEntry? Parse(string filePath, List<string> warnings)
    {
        try
        {
            var json = File.ReadAllText(filePath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Validate resourceType
            if (!root.TryGetProperty("resourceType", out var resourceType) ||
                resourceType.GetString() != "CodeSystem")
            {
                warnings.Add($"Skipping {Path.GetFileName(filePath)}: not a CodeSystem");
                return null;
            }

            // Extract required fields
            if (!root.TryGetProperty("url", out var urlElement))
            {
                warnings.Add($"Skipping {Path.GetFileName(filePath)}: missing 'url' field");
                return null;
            }

            var url = urlElement.GetString();
            if (string.IsNullOrWhiteSpace(url))
            {
                warnings.Add($"Skipping {Path.GetFileName(filePath)}: empty 'url' field");
                return null;
            }

            // Name is required
            if (!root.TryGetProperty("name", out var nameElement))
            {
                warnings.Add($"Skipping {Path.GetFileName(filePath)}: missing 'name' field");
                return null;
            }

            var name = nameElement.GetString();
            if (string.IsNullOrWhiteSpace(name))
            {
                warnings.Add($"Skipping {Path.GetFileName(filePath)}: empty 'name' field");
                return null;
            }

            // Extract optional fields
            var version = root.TryGetProperty("version", out var versionElement)
                ? versionElement.GetString()
                : null;

            var title = root.TryGetProperty("title", out var titleElement)
                ? titleElement.GetString()
                : null;

            var description = root.TryGetProperty("description", out var descElement)
                ? descElement.GetString()
                : null;

            var publisher = root.TryGetProperty("publisher", out var pubElement)
                ? pubElement.GetString()
                : null;

            // Extract concepts
            var concepts = new List<ConceptEntry>();
            if (root.TryGetProperty("concept", out var conceptsElement) && conceptsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var conceptElement in conceptsElement.EnumerateArray())
                {
                    ExtractConcepts(conceptElement, concepts, warnings, filePath);
                }
            }

            return new CodeSystemRegistryEntry
            {
                Url = url,
                Version = version,
                Name = name,
                Title = title,
                Description = description,
                Publisher = publisher,
                Concepts = concepts
            };
        }
        catch (Exception ex)
        {
            warnings.Add($"Error parsing {Path.GetFileName(filePath)}: {ex.Message}");
            return null;
        }
    }

    private static void ExtractConcepts(JsonElement conceptElement, List<ConceptEntry> concepts, List<string> warnings, string filePath)
    {
        if (!conceptElement.TryGetProperty("code", out var codeElement))
        {
            return; // Skip concepts without code
        }

        var code = codeElement.GetString();
        if (string.IsNullOrWhiteSpace(code))
        {
            return;
        }

        var display = conceptElement.TryGetProperty("display", out var displayElement)
            ? displayElement.GetString()
            : null;

        concepts.Add(new ConceptEntry
        {
            Code = code,
            Display = display
        });

        // Recursively extract child concepts (flatten hierarchy)
        if (conceptElement.TryGetProperty("concept", out var childConceptsElement) &&
            childConceptsElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var childElement in childConceptsElement.EnumerateArray())
            {
                ExtractConcepts(childElement, concepts, warnings, filePath);
            }
        }
    }
}
