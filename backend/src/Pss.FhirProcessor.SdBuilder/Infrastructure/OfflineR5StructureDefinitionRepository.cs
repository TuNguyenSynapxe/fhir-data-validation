using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.SdBuilder.Abstractions;

namespace Pss.FhirProcessor.SdBuilder.Infrastructure;

/// <summary>
/// Loads StructureDefinitions from a local HL7 R5 package cache.
/// Fully offline, deterministic, no HTTP calls, no ZipSource.
/// Uses Firely SDK ONLY for JSON parsing - not for resolution logic.
/// </summary>
public sealed class OfflineR5StructureDefinitionRepository : IStructureDefinitionRepository
{
    private readonly Hl7R5PackageIndex _index;
    private readonly FhirJsonParser _parser;

    public OfflineR5StructureDefinitionRepository(string packageRootPath)
    {
        if (string.IsNullOrWhiteSpace(packageRootPath))
        {
            throw new ArgumentException("Package root path cannot be null or empty", nameof(packageRootPath));
        }

        // Build index on startup (deterministic)
        _index = new Hl7R5PackageIndex(packageRootPath);

        // Configure Firely parser with default settings
        // Let parse errors bubble up - spec integrity enforcement
        _parser = new FhirJsonParser();

        Console.WriteLine($"[OfflineR5Repository] Initialized with {_index.GetAllUrls().Count} StructureDefinitions from {packageRootPath}");
    }

    /// <summary>
    /// Finds a StructureDefinition by canonical URL from local package cache.
    /// Fails fast if SD not found - NO fallback logic.
    /// </summary>
    public async Task<object?> FindByUrlAsync(string url, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            Console.WriteLine("[OfflineR5Repository] Warning: FindByUrlAsync called with null/empty URL");
            return null;
        }

        // Resolve canonical URL to file path via index
        if (!_index.TryResolve(url, out var filePath) || string.IsNullOrEmpty(filePath))
        {
            Console.WriteLine($"[OfflineR5Repository] StructureDefinition not found in package cache: {url}");
            return null;
        }

        try
        {
            // Read JSON from disk
            var json = await File.ReadAllTextAsync(filePath, cancellationToken);

            // Parse using Firely SDK (R5)
            // DO NOT catch StructuralTypeException - let it bubble up
            // Cached package JSON must already be valid R5
            var structureDefinition = _parser.Parse<StructureDefinition>(json);

            Console.WriteLine($"[OfflineR5Repository] Loaded {url} from {Path.GetFileName(filePath)}");

            return structureDefinition;
        }
        catch (FileNotFoundException)
        {
            Console.WriteLine($"[OfflineR5Repository] Error: File disappeared after index lookup: {filePath}");
            return null;
        }
        catch (Exception ex)
        {
            // Parse errors bubble up - this indicates corrupted spec cache
            Console.WriteLine($"[OfflineR5Repository] Error: Failed to parse {filePath}: {ex.Message}");
            throw new InvalidOperationException(
                $"Failed to load StructureDefinition from package cache: {url}. " +
                $"File: {filePath}. Check spec cache integrity.", ex);
        }
    }
}
