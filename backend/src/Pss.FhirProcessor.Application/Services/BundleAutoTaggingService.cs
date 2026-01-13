using System.Text.Json;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Services;

/// <summary>
/// Service for auto-tagging bundles to StructureDefinitions based on meta.profile matching.
/// 
/// STRICT RULES:
/// - Only matches exact canonical URL from bundle meta.profile
/// - Do NOT infer from resourceType
/// - Do NOT infer from structure
/// - Do NOT validate
/// - Firely remains the sole validator
/// </summary>
public interface IBundleAutoTaggingService
{
    /// <summary>
    /// Auto-tag a bundle to a StructureDefinition based on meta.profile matching.
    /// Returns the matched SD canonical URL if exactly one match, otherwise null.
    /// </summary>
    Task<(string? SdCanonicalUrl, BundleTaggingMode TaggingMode)> AutoTagBundleAsync(
        string bundleJson,
        IEnumerable<string> knownSdCanonicalUrls,
        CancellationToken cancellationToken = default);
}

public class BundleAutoTaggingService : IBundleAutoTaggingService
{
    private readonly ILogger<BundleAutoTaggingService> _logger;

    public BundleAutoTaggingService(ILogger<BundleAutoTaggingService> logger)
    {
        _logger = logger;
    }

    public async Task<(string? SdCanonicalUrl, BundleTaggingMode TaggingMode)> AutoTagBundleAsync(
        string bundleJson,
        IEnumerable<string> knownSdCanonicalUrls,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // 1. Parse bundle JSON safely
            using var doc = JsonDocument.Parse(bundleJson);
            var root = doc.RootElement;

            // 2. Collect all meta.profile URLs
            var profileUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // Check Bundle.meta.profile[]
            if (root.TryGetProperty("meta", out var meta) &&
                meta.TryGetProperty("profile", out var bundleProfiles) &&
                bundleProfiles.ValueKind == JsonValueKind.Array)
            {
                foreach (var profile in bundleProfiles.EnumerateArray())
                {
                    if (profile.ValueKind == JsonValueKind.String)
                    {
                        var url = profile.GetString();
                        if (!string.IsNullOrWhiteSpace(url))
                        {
                            profileUrls.Add(url);
                        }
                    }
                }
            }

            // Check entry[*].resource.meta.profile[]
            if (root.TryGetProperty("entry", out var entries) &&
                entries.ValueKind == JsonValueKind.Array)
            {
                foreach (var entry in entries.EnumerateArray())
                {
                    if (entry.TryGetProperty("resource", out var resource) &&
                        resource.TryGetProperty("meta", out var resourceMeta) &&
                        resourceMeta.TryGetProperty("profile", out var resourceProfiles) &&
                        resourceProfiles.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var profile in resourceProfiles.EnumerateArray())
                        {
                            if (profile.ValueKind == JsonValueKind.String)
                            {
                                var url = profile.GetString();
                                if (!string.IsNullOrWhiteSpace(url))
                                {
                                    profileUrls.Add(url);
                                }
                            }
                        }
                    }
                }
            }

            _logger.LogDebug("Collected {Count} meta.profile URLs from bundle", profileUrls.Count);

            // 3. Compare with known SD canonical URLs
            var knownUrlsSet = new HashSet<string>(knownSdCanonicalUrls, StringComparer.OrdinalIgnoreCase);
            var matchedUrls = profileUrls.Where(url => knownUrlsSet.Contains(url)).ToList();

            // 4. Apply auto-tagging rules
            if (matchedUrls.Count == 1)
            {
                // Exactly one match - auto tag
                var matchedUrl = matchedUrls[0];
                _logger.LogInformation("Auto-tagged bundle to SD: {SdCanonicalUrl}", matchedUrl);
                return (matchedUrl, BundleTaggingMode.Auto);
            }
            else if (matchedUrls.Count == 0)
            {
                // No matches
                _logger.LogDebug("No SD matches found for bundle (declared {Count} profiles)", profileUrls.Count);
                return (null, BundleTaggingMode.None);
            }
            else
            {
                // Multiple matches - do not guess
                _logger.LogWarning(
                    "Multiple SD matches found for bundle: {MatchedUrls}. Tagging as None.",
                    string.Join(", ", matchedUrls));
                return (null, BundleTaggingMode.None);
            }
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse bundle JSON for auto-tagging");
            return (null, BundleTaggingMode.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during auto-tagging");
            return (null, BundleTaggingMode.None);
        }
    }
}
