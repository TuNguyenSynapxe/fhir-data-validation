using System.Text.Json;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Loads FHIR sample JSON files from disk.
/// Samples are cached at startup for fast access.
/// </summary>
public class FhirSampleProvider : IFhirSampleProvider
{
    private readonly ILogger<FhirSampleProvider> _logger;
    private readonly string _samplesBasePath;
    private readonly Dictionary<string, List<FhirSampleMetadata>> _sampleCache;
    private bool _initialized;

    public FhirSampleProvider(ILogger<FhirSampleProvider> logger)
    {
        _logger = logger;
        
        // Samples folder relative to application root
        var appRoot = AppContext.BaseDirectory;
        _samplesBasePath = Path.Combine(appRoot, "data", "samples");
        
        _sampleCache = new Dictionary<string, List<FhirSampleMetadata>>();
        _initialized = false;

        // Initialize on construction
        Initialize();
    }

    private void Initialize()
    {
        if (_initialized) return;

        try
        {
            _logger.LogInformation("Initializing FHIR Sample Provider from: {Path}", _samplesBasePath);

            if (!Directory.Exists(_samplesBasePath))
            {
                _logger.LogWarning("Samples directory not found: {Path}. Creating empty directory.", _samplesBasePath);
                Directory.CreateDirectory(_samplesBasePath);
                _initialized = true;
                return;
            }

            // Scan for version folders (e.g., r4, r5)
            var versionFolders = Directory.GetDirectories(_samplesBasePath);
            
            foreach (var versionFolder in versionFolders)
            {
                var version = Path.GetFileName(versionFolder).ToUpperInvariant();
                _logger.LogDebug("Scanning version folder: {Version}", version);

                // Scan for resource type folders
                var resourceTypeFolders = Directory.GetDirectories(versionFolder);

                foreach (var resourceTypeFolder in resourceTypeFolders)
                {
                    var resourceType = Path.GetFileName(resourceTypeFolder);
                    var cacheKey = $"{version}/{resourceType}";

                    var samples = new List<FhirSampleMetadata>();

                    // Scan for JSON files
                    var jsonFiles = Directory.GetFiles(resourceTypeFolder, "*.json");

                    foreach (var jsonFile in jsonFiles)
                    {
                        try
                        {
                            var sampleId = Path.GetFileNameWithoutExtension(jsonFile);
                            var display = FormatDisplayName(sampleId);

                            // Basic validation: ensure it's valid JSON
                            var jsonContent = File.ReadAllText(jsonFile);
                            using var doc = JsonDocument.Parse(jsonContent);
                            
                            // Validate resourceType matches folder
                            if (doc.RootElement.TryGetProperty("resourceType", out var resourceTypeElement))
                            {
                                var actualResourceType = resourceTypeElement.GetString();
                                if (actualResourceType != resourceType)
                                {
                                    _logger.LogWarning(
                                        "Sample {File} has resourceType '{Actual}' but is in '{Expected}' folder",
                                        jsonFile, actualResourceType, resourceType);
                                }
                            }

                            var metadata = new FhirSampleMetadata
                            {
                                Id = sampleId,
                                ResourceType = resourceType,
                                Version = version,
                                Display = display,
                                Description = null
                            };

                            samples.Add(metadata);
                            _logger.LogDebug("Loaded sample: {Version}/{ResourceType}/{SampleId}", 
                                version, resourceType, sampleId);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to load sample: {File}", jsonFile);
                        }
                    }

                    if (samples.Count > 0)
                    {
                        _sampleCache[cacheKey] = samples;
                        _logger.LogInformation("Cached {Count} samples for {Key}", samples.Count, cacheKey);
                    }
                }
            }

            _initialized = true;
            _logger.LogInformation("FHIR Sample Provider initialized with {Count} resource types", 
                _sampleCache.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize FHIR Sample Provider");
            _initialized = true; // Mark as initialized to prevent repeated attempts
        }
    }

    public Task<IReadOnlyList<FhirSampleMetadata>> ListSamplesAsync(
        string version, 
        string? resourceType = null)
    {
        version = version.ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(resourceType))
        {
            // Return all samples for this version
            var allSamples = _sampleCache
                .Where(kvp => kvp.Key.StartsWith($"{version}/"))
                .SelectMany(kvp => kvp.Value)
                .ToList();

            return Task.FromResult<IReadOnlyList<FhirSampleMetadata>>(allSamples);
        }

        var cacheKey = $"{version}/{resourceType}";
        
        if (_sampleCache.TryGetValue(cacheKey, out var samples))
        {
            return Task.FromResult<IReadOnlyList<FhirSampleMetadata>>(samples);
        }

        return Task.FromResult<IReadOnlyList<FhirSampleMetadata>>(Array.Empty<FhirSampleMetadata>());
    }

    public async Task<string> LoadSampleJsonAsync(
        string version, 
        string resourceType, 
        string sampleId)
    {
        version = version.ToUpperInvariant();
        
        // Construct file path
        var filePath = Path.Combine(
            _samplesBasePath,
            version.ToLowerInvariant(),
            resourceType,
            $"{sampleId}.json");

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Sample not found: {version}/{resourceType}/{sampleId}");
        }

        // Validate it's within samples directory (security)
        var fullPath = Path.GetFullPath(filePath);
        var basePath = Path.GetFullPath(_samplesBasePath);
        
        if (!fullPath.StartsWith(basePath))
        {
            throw new UnauthorizedAccessException("Invalid sample path");
        }

        var json = await File.ReadAllTextAsync(filePath);

        // Basic validation
        using var doc = JsonDocument.Parse(json);
        
        if (doc.RootElement.TryGetProperty("resourceType", out var resourceTypeElement))
        {
            var actualResourceType = resourceTypeElement.GetString();
            if (actualResourceType != resourceType)
            {
                _logger.LogWarning(
                    "Sample {SampleId} has resourceType '{Actual}' but '{Expected}' was requested",
                    sampleId, actualResourceType, resourceType);
            }
        }

        return json;
    }

    private string FormatDisplayName(string sampleId)
    {
        // Convert "patient-full" -> "Patient Full"
        return string.Join(" ", 
            sampleId.Split('-', '_')
                .Select(word => char.ToUpper(word[0]) + word.Substring(1)));
    }
}
