using System.IO.Compression;
using System.Text.Json;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Microsoft.Extensions.Logging;

namespace Pss.FhirProcessor.Engine.Simplifier;

/// <summary>
/// Reads and indexes Simplifier FHIR R5 packages.
/// 
/// Phase 2: STRICT R5 ENFORCEMENT
/// - Rejects packages without fhirVersions
/// - Rejects packages with non-R5 versions
/// - Rejects packages with mixed versions
/// - Indexes conformance resources by canonical URL
/// </summary>
public sealed class SimplifierPackageReader : ISimplifierPackageReader
{
    private readonly ILogger<SimplifierPackageReader> _logger;
    private readonly FhirJsonParser _parser;

    public SimplifierPackageReader(ILogger<SimplifierPackageReader> logger)
    {
        _logger = logger;
        _parser = new FhirJsonParser();
    }

    public async Task<SimplifierPackage> ReadPackageAsync(
        Stream packageStream, 
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Reading Simplifier package from stream");

        using var archive = new ZipArchive(packageStream, ZipArchiveMode.Read, leaveOpen: true);

        // Step 1: Read and validate package.json
        var packageManifest = await ReadPackageManifestAsync(archive, cancellationToken);

        // Step 2: Validate R5-only constraint
        ValidateR5Only(packageManifest);

        // Step 3: Index conformance resources
        var structureDefinitions = new Dictionary<string, StructureDefinition>();
        var valueSets = new Dictionary<string, ValueSet>();
        var codeSystems = new Dictionary<string, CodeSystem>();

        foreach (var entry in archive.Entries)
        {
            // Skip package.json and non-JSON files
            if (entry.Name == "package.json" || !entry.Name.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            try
            {
                await using var entryStream = entry.Open();
                using var reader = new StreamReader(entryStream);
                var json = await reader.ReadToEndAsync(cancellationToken);

                // Parse resource and index by canonical URL
                var resource = _parser.Parse<Resource>(json);

                switch (resource)
                {
                    case StructureDefinition sd:
                        if (!string.IsNullOrEmpty(sd.Url))
                        {
                            var canonicalUrl = StripVersion(sd.Url);
                            structureDefinitions[canonicalUrl] = sd;
                            _logger.LogDebug("Indexed StructureDefinition: {Url}", canonicalUrl);
                        }
                        break;

                    case ValueSet vs:
                        if (!string.IsNullOrEmpty(vs.Url))
                        {
                            var canonicalUrl = StripVersion(vs.Url);
                            valueSets[canonicalUrl] = vs;
                            _logger.LogDebug("Indexed ValueSet: {Url}", canonicalUrl);
                        }
                        break;

                    case CodeSystem cs:
                        if (!string.IsNullOrEmpty(cs.Url))
                        {
                            var canonicalUrl = StripVersion(cs.Url);
                            codeSystems[canonicalUrl] = cs;
                            _logger.LogDebug("Indexed CodeSystem: {Url}", canonicalUrl);
                        }
                        break;

                    default:
                        // Ignore other resource types
                        _logger.LogTrace("Skipped resource type: {Type}", resource.TypeName);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse resource: {EntryName}", entry.FullName);
                // Continue processing other resources
            }
        }

        _logger.LogInformation(
            "Indexed package {Name} v{Version}: {SDCount} StructureDefinitions, {VSCount} ValueSets, {CSCount} CodeSystems",
            packageManifest.Name,
            packageManifest.Version,
            structureDefinitions.Count,
            valueSets.Count,
            codeSystems.Count);

        return new SimplifierPackage
        {
            Name = packageManifest.Name,
            Version = packageManifest.Version,
            FhirVersions = packageManifest.FhirVersions,
            Dependencies = packageManifest.Dependencies,
            StructureDefinitions = structureDefinitions,
            ValueSets = valueSets,
            CodeSystems = codeSystems
        };
    }

    private async Task<PackageManifest> ReadPackageManifestAsync(
        ZipArchive archive, 
        CancellationToken cancellationToken)
    {
        var packageEntry = archive.GetEntry("package/package.json");
        if (packageEntry == null)
        {
            throw new InvalidOperationException(
                "Invalid Simplifier package: package.json not found at package/package.json");
        }

        await using var stream = packageEntry.Open();
        using var reader = new StreamReader(stream);
        var json = await reader.ReadToEndAsync(cancellationToken);

        try
        {
            var manifest = JsonSerializer.Deserialize<PackageManifest>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (manifest == null)
            {
                throw new InvalidOperationException("package.json deserialized to null");
            }

            return manifest;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Invalid package.json format: {ex.Message}", ex);
        }
    }

    private void ValidateR5Only(PackageManifest manifest)
    {
        // Validate fhirVersions is present
        if (manifest.FhirVersions == null || manifest.FhirVersions.Count == 0)
        {
            throw new InvalidOperationException(
                $"Package '{manifest.Name}' missing required 'fhirVersions' field in package.json. " +
                "Phase 2 requires explicit FHIR version declaration.");
        }

        // Validate R5 only
        foreach (var version in manifest.FhirVersions)
        {
            if (!IsR5Version(version))
            {
                throw new InvalidOperationException(
                    $"Package '{manifest.Name}' declares non-R5 FHIR version: {version}. " +
                    $"Phase 2 supports R5 (5.0.0) only. Found versions: [{string.Join(", ", manifest.FhirVersions)}]");
            }
        }

        _logger.LogInformation(
            "Package '{Name}' v{Version} validated as R5-only: {Versions}",
            manifest.Name,
            manifest.Version,
            string.Join(", ", manifest.FhirVersions));
    }

    private static bool IsR5Version(string version)
    {
        // Accept 5.0.0 or 5.0.x
        return version.StartsWith("5.0", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Strips version suffix from canonical URL.
    /// Example: "http://example.org/fhir/StructureDefinition/MyProfile|1.0.0" -> "http://example.org/fhir/StructureDefinition/MyProfile"
    /// </summary>
    private static string StripVersion(string canonicalUrl)
    {
        var pipeIndex = canonicalUrl.IndexOf('|');
        return pipeIndex >= 0 ? canonicalUrl.Substring(0, pipeIndex) : canonicalUrl;
    }

    /// <summary>
    /// Internal model for package.json deserialization
    /// </summary>
    private sealed class PackageManifest
    {
        public string Name { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public List<string> FhirVersions { get; set; } = new();
        public Dictionary<string, string> Dependencies { get; set; } = new();
    }
}
