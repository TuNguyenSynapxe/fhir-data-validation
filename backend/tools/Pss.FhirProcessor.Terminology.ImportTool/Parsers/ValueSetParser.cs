using System.Text.Json;
using Pss.FhirProcessor.Terminology.ImportTool.Models;

namespace Pss.FhirProcessor.Terminology.ImportTool.Parsers;

/// <summary>
/// Parses FHIR ValueSet JSON files using System.Text.Json only (no Firely).
/// Supports ONLY explicit compose.include with concept[] (no filters).
/// </summary>
public static class ValueSetParser
{
    public static ValueSetRegistryEntry? Parse(string filePath, List<string> warnings)
    {
        try
        {
            var json = File.ReadAllText(filePath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Validate resourceType
            if (!root.TryGetProperty("resourceType", out var resourceType) ||
                resourceType.GetString() != "ValueSet")
            {
                warnings.Add($"Skipping {Path.GetFileName(filePath)}: not a ValueSet");
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

            // Determine expansion strategy
            var (strategy, explicitCodes, composeIncludes) = DetermineExpansionStrategy(root, url, warnings);

            return new ValueSetRegistryEntry
            {
                Url = url,
                Version = version,
                Name = name,
                Title = title,
                Description = description,
                Publisher = publisher,
                ExpansionStrategy = strategy,
                ExplicitCodes = explicitCodes,
                ComposeIncludes = composeIncludes
            };
        }
        catch (Exception ex)
        {
            warnings.Add($"Error parsing {Path.GetFileName(filePath)}: {ex.Message}");
            return null;
        }
    }

    private static (ExpansionStrategyType Strategy, List<ExplicitCodeEntry>? ExplicitCodes, List<ComposeIncludeEntry>? ComposeIncludes)
        DetermineExpansionStrategy(JsonElement root, string url, List<string> warnings)
    {
        // Strategy 1: Check for expansion.contains (explicit codes)
        if (root.TryGetProperty("expansion", out var expansion) &&
            expansion.TryGetProperty("contains", out var contains) &&
            contains.ValueKind == JsonValueKind.Array)
        {
            var explicitCodes = new List<ExplicitCodeEntry>();
            foreach (var codeElement in contains.EnumerateArray())
            {
                if (!codeElement.TryGetProperty("code", out var codeValue))
                    continue;

                var code = codeValue.GetString();
                if (string.IsNullOrWhiteSpace(code))
                    continue;

                var system = codeElement.TryGetProperty("system", out var systemValue)
                    ? systemValue.GetString()
                    : null;

                var display = codeElement.TryGetProperty("display", out var displayValue)
                    ? displayValue.GetString()
                    : null;

                explicitCodes.Add(new ExplicitCodeEntry
                {
                    System = system,
                    Code = code,
                    Display = display
                });
            }

            if (explicitCodes.Count > 0)
            {
                return (ExpansionStrategyType.ExplicitCodes, explicitCodes, null);
            }
        }

        // Strategy 2: Check for compose.include
        if (root.TryGetProperty("compose", out var compose) &&
            compose.TryGetProperty("include", out var include) &&
            include.ValueKind == JsonValueKind.Array)
        {
            var composeIncludes = new List<ComposeIncludeEntry>();
            var hasUnsupportedFeatures = false;

            foreach (var includeElement in include.EnumerateArray())
            {
                if (!includeElement.TryGetProperty("system", out var systemValue))
                {
                    warnings.Add($"ValueSet {url}: compose.include missing 'system', skipping");
                    continue;
                }

                var system = systemValue.GetString();
                if (string.IsNullOrWhiteSpace(system))
                {
                    continue;
                }

                // Check for unsupported features
                if (includeElement.TryGetProperty("filter", out _))
                {
                    warnings.Add($"ValueSet {url}: compose.include has 'filter' (unsupported), marking as Unsupported");
                    hasUnsupportedFeatures = true;
                    continue;
                }

                if (includeElement.TryGetProperty("valueSet", out _))
                {
                    warnings.Add($"ValueSet {url}: compose.include has 'valueSet' import (unsupported), marking as Unsupported");
                    hasUnsupportedFeatures = true;
                    continue;
                }

                // Check if we should include all concepts or specific ones
                bool includeAll = false;
                List<string>? concepts = null;

                if (includeElement.TryGetProperty("concept", out var conceptsElement) &&
                    conceptsElement.ValueKind == JsonValueKind.Array)
                {
                    concepts = new List<string>();
                    foreach (var conceptElement in conceptsElement.EnumerateArray())
                    {
                        if (conceptElement.TryGetProperty("code", out var codeValue))
                        {
                            var code = codeValue.GetString();
                            if (!string.IsNullOrWhiteSpace(code))
                            {
                                concepts.Add(code);
                            }
                        }
                    }
                }
                else
                {
                    // No explicit concepts = include all from system
                    includeAll = true;
                }

                composeIncludes.Add(new ComposeIncludeEntry
                {
                    System = system,
                    IncludeAll = includeAll,
                    Concepts = concepts
                });
            }

            if (hasUnsupportedFeatures)
            {
                return (ExpansionStrategyType.Unsupported, null, null);
            }

            if (composeIncludes.Count > 0)
            {
                return (ExpansionStrategyType.ComposeIncludes, null, composeIncludes);
            }
        }

        // No supported strategy found
        warnings.Add($"ValueSet {url}: no supported expansion strategy found, marking as Unsupported");
        return (ExpansionStrategyType.Unsupported, null, null);
    }
}
