using System.Text.Json;
using Pss.FhirProcessor.Terminology.ImportTool.Models;
using Pss.FhirProcessor.Terminology.ImportTool.Parsers;

namespace Pss.FhirProcessor.Terminology.ImportTool;

/// <summary>
/// Main importer: scans FHIR package folder and generates 3 registry JSON files.
/// Output is deterministic (sorted by URL).
/// </summary>
public sealed class Hl7R5Importer
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task<ImportResult> ImportAsync(string inputPath, string outputPath)
    {
        var warnings = new List<string>();

        // Validate input
        if (!Directory.Exists(inputPath))
        {
            throw new DirectoryNotFoundException($"Input directory not found: {inputPath}");
        }

        // Ensure output directory exists
        Directory.CreateDirectory(outputPath);

        Console.WriteLine("Scanning CodeSystem files...");
        var codeSystemFiles = Directory.GetFiles(inputPath, "CodeSystem-*.json");
        var codeSystems = new Dictionary<string, CodeSystemRegistryEntry>();

        foreach (var file in codeSystemFiles)
        {
            var entry = CodeSystemParser.Parse(file, warnings);
            if (entry != null)
            {
                // Use canonical URL without version as key
                var key = StripVersion(entry.Url);
                if (!codeSystems.ContainsKey(key))
                {
                    codeSystems[key] = entry;
                }
                else
                {
                    warnings.Add($"Duplicate CodeSystem URL (version stripped): {key}, keeping first occurrence");
                }
            }
        }

        Console.WriteLine($"  Found {codeSystems.Count} CodeSystems");

        Console.WriteLine("Scanning ValueSet files...");
        var valueSetFiles = Directory.GetFiles(inputPath, "ValueSet-*.json");
        var valueSets = new Dictionary<string, ValueSetRegistryEntry>();

        foreach (var file in valueSetFiles)
        {
            var entry = ValueSetParser.Parse(file, warnings);
            if (entry != null)
            {
                // Use canonical URL without version as key
                var key = StripVersion(entry.Url);
                if (!valueSets.ContainsKey(key))
                {
                    valueSets[key] = entry;
                }
                else
                {
                    warnings.Add($"Duplicate ValueSet URL (version stripped): {key}, keeping first occurrence");
                }
            }
        }

        Console.WriteLine($"  Found {valueSets.Count} ValueSets");

        // Generate index
        Console.WriteLine("Building search index...");
        var indexEntries = BuildIndex(codeSystems, valueSets);
        Console.WriteLine($"  Generated {indexEntries.Count} index entries");

        // Sort for deterministic output
        var sortedCodeSystems = codeSystems.OrderBy(kvp => kvp.Key).ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        var sortedValueSets = valueSets.OrderBy(kvp => kvp.Key).ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        var sortedIndex = indexEntries.OrderBy(e => e.Url).ToList();

        // Write output files
        Console.WriteLine("Writing output files...");
        
        var codeSystemsPath = Path.Combine(outputPath, "hl7-r5-codesystems.json");
        await File.WriteAllTextAsync(codeSystemsPath, JsonSerializer.Serialize(sortedCodeSystems, JsonOptions));
        Console.WriteLine($"  ✓ {codeSystemsPath}");

        var valueSetsPath = Path.Combine(outputPath, "hl7-r5-valuesets.json");
        await File.WriteAllTextAsync(valueSetsPath, JsonSerializer.Serialize(sortedValueSets, JsonOptions));
        Console.WriteLine($"  ✓ {valueSetsPath}");

        var indexPath = Path.Combine(outputPath, "hl7-r5-index.json");
        await File.WriteAllTextAsync(indexPath, JsonSerializer.Serialize(sortedIndex, JsonOptions));
        Console.WriteLine($"  ✓ {indexPath}");

        return new ImportResult
        {
            CodeSystemCount = codeSystems.Count,
            ValueSetCount = valueSets.Count,
            IndexEntryCount = indexEntries.Count,
            Warnings = warnings
        };
    }

    private static List<IndexEntry> BuildIndex(
        Dictionary<string, CodeSystemRegistryEntry> codeSystems,
        Dictionary<string, ValueSetRegistryEntry> valueSets)
    {
        var index = new List<IndexEntry>();

        foreach (var (url, cs) in codeSystems)
        {
            index.Add(new IndexEntry
            {
                Url = url,
                ResourceType = "CodeSystem",
                Name = cs.Name,
                Title = cs.Title,
                Publisher = cs.Publisher,
                Description = cs.Description
            });
        }

        foreach (var (url, vs) in valueSets)
        {
            index.Add(new IndexEntry
            {
                Url = url,
                ResourceType = "ValueSet",
                Name = vs.Name,
                Title = vs.Title,
                Publisher = vs.Publisher,
                Description = vs.Description
            });
        }

        return index;
    }

    /// <summary>
    /// Strip version suffix from canonical URL (e.g., "url|5.0.0" -> "url").
    /// </summary>
    private static string StripVersion(string canonicalUrl)
    {
        var pipeIndex = canonicalUrl.IndexOf('|');
        return pipeIndex == -1 ? canonicalUrl : canonicalUrl[..pipeIndex];
    }
}
