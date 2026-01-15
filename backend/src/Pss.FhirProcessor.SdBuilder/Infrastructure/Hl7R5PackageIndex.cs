using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Linq;

namespace Pss.FhirProcessor.SdBuilder.Infrastructure;

/// <summary>
/// Builds an in-memory index of HL7 R5 StructureDefinitions from a local package cache.
/// Uses System.Text.Json only - NO Firely SDK references.
/// Immutable and deterministic after construction.
/// </summary>
public sealed class Hl7R5PackageIndex
{
    private readonly IReadOnlyDictionary<string, string> _urlToFilePath;

    /// <summary>
    /// Scans packageRootPath for StructureDefinition-*.json files and builds canonical URL index.
    /// </summary>
    /// <param name="packageRootPath">Absolute path to hl7.fhir.r5.core package folder</param>
    public Hl7R5PackageIndex(string packageRootPath)
    {
        if (string.IsNullOrWhiteSpace(packageRootPath))
        {
            throw new ArgumentException("Package root path cannot be null or empty", nameof(packageRootPath));
        }

        if (!Directory.Exists(packageRootPath))
        {
            throw new DirectoryNotFoundException($"Package root not found: {packageRootPath}");
        }

        var index = new Dictionary<string, string>(StringComparer.Ordinal);

        // Scan for StructureDefinition-*.json files
        var jsonFiles = Directory.GetFiles(packageRootPath, "StructureDefinition-*.json", SearchOption.TopDirectoryOnly);

        foreach (var filePath in jsonFiles)
        {
            try
            {
                var canonicalUrl = ExtractCanonicalUrl(filePath);
                if (!string.IsNullOrEmpty(canonicalUrl))
                {
                    // Store canonical URL -> file path mapping
                    index[canonicalUrl] = filePath;
                }
            }
            catch (Exception ex)
            {
                // Log but don't fail - skip malformed files
                Console.WriteLine($"[Hl7R5PackageIndex] Skipping {Path.GetFileName(filePath)}: {ex.Message}");
            }
        }

        _urlToFilePath = index;
        Console.WriteLine($"[Hl7R5PackageIndex] Indexed {_urlToFilePath.Count} StructureDefinitions from {packageRootPath}");
    }

    /// <summary>
    /// Attempts to resolve a canonical URL to its local file path.
    /// </summary>
    public bool TryResolve(string canonicalUrl, out string? filePath)
    {
        if (string.IsNullOrWhiteSpace(canonicalUrl))
        {
            filePath = null;
            return false;
        }

        return _urlToFilePath.TryGetValue(canonicalUrl, out filePath);
    }

    /// <summary>
    /// Returns all indexed canonical URLs.
    /// </summary>
    public IReadOnlyCollection<string> GetAllUrls() => _urlToFilePath.Keys.ToList();

    /// <summary>
    /// Extracts the canonical URL from a StructureDefinition JSON file.
    /// Uses System.Text.Json for minimal parsing - only reads "url" property.
    /// </summary>
    private static string? ExtractCanonicalUrl(string jsonFilePath)
    {
        var json = File.ReadAllText(jsonFilePath);
        
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        // Read top-level "url" property
        if (root.TryGetProperty("url", out var urlElement))
        {
            return urlElement.GetString();
        }

        return null;
    }
}
