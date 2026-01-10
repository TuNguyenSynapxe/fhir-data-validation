using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.BundleProfiles;

/// <summary>
/// Phase 8.3: Implementation of bundle profile resolution.
/// 
/// RESOLUTION ALGORITHM (STRICT):
/// 1. Manual selection (if exists) → return immediately
/// 2. meta.profile exact match → single match only
/// 3. Filename exact match → single match only
/// 4. No match → UNRESOLVED
/// 
/// NO HEURISTICS. NO GUESSING. DETERMINISTIC ONLY.
/// </summary>
public sealed class BundleProfileResolutionService : IBundleProfileResolutionService
{
    private readonly FhirProcessorDbContext _dbContext;
    private readonly ILogger<BundleProfileResolutionService> _logger;

    public BundleProfileResolutionService(
        FhirProcessorDbContext dbContext,
        ILogger<BundleProfileResolutionService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<BundleProfileResolutionResult> ResolveAsync(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug(
            "Resolving Bundle profile: ProjectId={ProjectId}, BundleId={BundleId}",
            projectId, bundleId);

        // Step 0: Check for existing manual selection
        var existing = await GetProfileSelectionAsync(bundleId, cancellationToken);
        if (existing != null)
        {
            _logger.LogDebug(
                "Found existing selection: Source={Source}, SDID={SDID}",
                existing.Source, existing.StructureDefinitionId);

            if (existing.StructureDefinitionId == null)
            {
                return BundleProfileResolutionResult.Unprofiled(existing.Source);
            }

            return BundleProfileResolutionResult.Resolved(
                existing.StructureDefinitionId.Value,
                existing.Source);
        }

        // Fetch Bundle and StructureDefinitions for this project
        var bundle = await _dbContext.ProjectBundles
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == bundleId && b.ProjectId == projectId, cancellationToken);

        if (bundle == null)
        {
            _logger.LogWarning("Bundle not found: {BundleId}", bundleId);
            return BundleProfileResolutionResult.Unresolved();
        }

        var bundleStructureDefinitions = await _dbContext.ProjectArtifacts
            .AsNoTracking()
            .Where(a => a.ProjectId == projectId
                && a.ArtifactType == ArtifactType.StructureDefinition
                && a.ResourceType == "StructureDefinition")
            .ToListAsync(cancellationToken);

        // Filter to Bundle-type SDs only
        var bundleSDs = bundleStructureDefinitions
            .Where(sd => IsBundleStructureDefinition(sd.ResourceJson))
            .ToList();

        _logger.LogDebug(
            "Found {Count} Bundle StructureDefinitions in project",
            bundleSDs.Count);

        // Step 1: meta.profile exact match
        var metaProfileMatch = ResolveByMetaProfile(bundle, bundleSDs);
        if (metaProfileMatch != null)
        {
            _logger.LogInformation(
                "Resolved via meta.profile: {CanonicalUrl}",
                metaProfileMatch.CanonicalUrl);

            // Auto-save the resolution
            await SaveAutoResolutionAsync(bundleId, metaProfileMatch.Id, cancellationToken);

            return BundleProfileResolutionResult.Resolved(
                metaProfileMatch.Id,
                BundleProfileSelectionSource.Auto);
        }

        // Step 2: Filename exact match
        var filenameMatch = ResolveByFilename(bundle, bundleSDs);
        if (filenameMatch != null)
        {
            _logger.LogInformation(
                "Resolved via filename: {FileName}",
                bundle.Name);

            // Auto-save the resolution
            await SaveAutoResolutionAsync(bundleId, filenameMatch.Id, cancellationToken);

            return BundleProfileResolutionResult.Resolved(
                filenameMatch.Id,
                BundleProfileSelectionSource.Auto);
        }

        // Step 3: No match
        _logger.LogDebug("No confident match found for Bundle: {BundleName}", bundle.Name);
        return BundleProfileResolutionResult.Unresolved();
    }

    /// <inheritdoc />
    public async Task SetProfileAsync(
        Guid projectId,
        Guid bundleId,
        Guid? structureDefinitionId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Setting Bundle profile manually: BundleId={BundleId}, SDID={SDID}",
            bundleId, structureDefinitionId);

        // Validate Bundle exists
        var bundleExists = await _dbContext.ProjectBundles
            .AnyAsync(b => b.Id == bundleId && b.ProjectId == projectId, cancellationToken);

        if (!bundleExists)
        {
            throw new BundleProfileResolutionException(
                BundleProfileResolutionErrorCodes.BundleNotFound,
                $"Bundle {bundleId} not found in project {projectId}");
        }

        // If SD specified, validate it exists and is Bundle-type
        if (structureDefinitionId.HasValue)
        {
            var sd = await _dbContext.ProjectArtifacts
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    a => a.Id == structureDefinitionId.Value && a.ProjectId == projectId,
                    cancellationToken);

            if (sd == null)
            {
                throw new BundleProfileResolutionException(
                    BundleProfileResolutionErrorCodes.StructureDefinitionNotFound,
                    $"StructureDefinition {structureDefinitionId} not found in project {projectId}");
            }

            if (!IsBundleStructureDefinition(sd.ResourceJson))
            {
                throw new BundleProfileResolutionException(
                    BundleProfileResolutionErrorCodes.StructureDefinitionNotBundleType,
                    "StructureDefinition is not a Bundle profile",
                    new Dictionary<string, object>
                    {
                        ["StructureDefinitionId"] = structureDefinitionId.Value,
                        ["CanonicalUrl"] = sd.CanonicalUrl ?? "unknown"
                    });
            }
        }

        // Upsert selection
        var existing = await _dbContext.Set<ProjectBundleProfileSelection>()
            .FirstOrDefaultAsync(s => s.ProjectBundleId == bundleId, cancellationToken);

        if (existing != null)
        {
            existing.StructureDefinitionId = structureDefinitionId;
            existing.Source = BundleProfileSelectionSource.Manual;
            existing.CreatedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            var newSelection = new ProjectBundleProfileSelection
            {
                Id = Guid.NewGuid(),
                ProjectBundleId = bundleId,
                StructureDefinitionId = structureDefinitionId,
                Source = BundleProfileSelectionSource.Manual,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _dbContext.Set<ProjectBundleProfileSelection>().Add(newSelection);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Bundle profile set: BundleId={BundleId}, SDID={SDID}, Source=Manual",
            bundleId, structureDefinitionId);
    }

    /// <inheritdoc />
    public async Task<ProjectBundleProfileSelection?> GetProfileSelectionAsync(
        Guid bundleId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<ProjectBundleProfileSelection>()
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.ProjectBundleId == bundleId, cancellationToken);
    }

    // =========================================================================
    // PRIVATE RESOLUTION LOGIC
    // =========================================================================

    /// <summary>
    /// Step 1: Resolve by meta.profile exact match.
    /// Returns SD if EXACTLY ONE match found, otherwise null.
    /// </summary>
    private ProjectArtifact? ResolveByMetaProfile(
        ProjectBundle bundle,
        List<ProjectArtifact> bundleSDs)
    {
        try
        {
            var bundleDoc = JsonDocument.Parse(bundle.BundleJson);
            var root = bundleDoc.RootElement;

            if (!root.TryGetProperty("meta", out var meta) ||
                !meta.TryGetProperty("profile", out var profiles) ||
                profiles.ValueKind != JsonValueKind.Array)
            {
                _logger.LogTrace("Bundle has no meta.profile array");
                return null;
            }

            var profileUrls = profiles.EnumerateArray()
                .Where(p => p.ValueKind == JsonValueKind.String)
                .Select(p => p.GetString())
                .Where(url => !string.IsNullOrWhiteSpace(url))
                .ToList();

            if (profileUrls.Count == 0)
            {
                _logger.LogTrace("Bundle meta.profile array is empty");
                return null;
            }

            // Find SDs matching any profile URL
            var matches = bundleSDs
                .Where(sd => profileUrls.Contains(sd.CanonicalUrl, StringComparer.OrdinalIgnoreCase))
                .ToList();

            if (matches.Count == 0)
            {
                _logger.LogTrace("No SD matched meta.profile URLs: {URLs}", string.Join(", ", profileUrls));
                return null;
            }

            if (matches.Count > 1)
            {
                _logger.LogWarning(
                    "Multiple Bundle SDs match meta.profile - ambiguous, returning null: {URLs}",
                    string.Join(", ", matches.Select(m => m.CanonicalUrl)));
                return null;
            }

            return matches[0];
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse Bundle JSON for meta.profile resolution");
            return null;
        }
    }

    /// <summary>
    /// Step 2: Resolve by filename exact match.
    /// Matches Bundle.Name against SD.id, SD.name, or SD filename.
    /// Returns SD if EXACTLY ONE match found, otherwise null.
    /// </summary>
    private ProjectArtifact? ResolveByFilename(
        ProjectBundle bundle,
        List<ProjectArtifact> bundleSDs)
    {
        var bundleName = Path.GetFileNameWithoutExtension(bundle.Name);

        var matches = new List<ProjectArtifact>();

        foreach (var sd in bundleSDs)
        {
            // Try SD filename
            var sdFileName = Path.GetFileNameWithoutExtension(sd.FileName);
            if (string.Equals(bundleName, sdFileName, StringComparison.OrdinalIgnoreCase))
            {
                matches.Add(sd);
                continue;
            }

            // Try SD.id and SD.name from JSON
            try
            {
                var sdDoc = JsonDocument.Parse(sd.ResourceJson);
                var root = sdDoc.RootElement;

                if (root.TryGetProperty("id", out var idElement))
                {
                    var id = idElement.GetString();
                    if (!string.IsNullOrWhiteSpace(id) &&
                        string.Equals(bundleName, id, StringComparison.OrdinalIgnoreCase))
                    {
                        matches.Add(sd);
                        continue;
                    }
                }

                if (root.TryGetProperty("name", out var nameElement))
                {
                    var name = nameElement.GetString();
                    if (!string.IsNullOrWhiteSpace(name) &&
                        string.Equals(bundleName, name, StringComparison.OrdinalIgnoreCase))
                    {
                        matches.Add(sd);
                        continue;
                    }
                }
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to parse SD JSON for filename resolution: {FileName}", sd.FileName);
            }
        }

        if (matches.Count == 0)
        {
            _logger.LogTrace("No SD matched filename: {BundleName}", bundleName);
            return null;
        }

        if (matches.Count > 1)
        {
            _logger.LogWarning(
                "Multiple Bundle SDs match filename - ambiguous, returning null: {BundleName}",
                bundleName);
            return null;
        }

        return matches[0];
    }

    /// <summary>
    /// Checks if a StructureDefinition is for Bundle resource type.
    /// </summary>
    private bool IsBundleStructureDefinition(string resourceJson)
    {
        try
        {
            var doc = JsonDocument.Parse(resourceJson);
            var root = doc.RootElement;

            if (!root.TryGetProperty("type", out var typeElement))
            {
                return false;
            }

            var type = typeElement.GetString();
            return string.Equals(type, "Bundle", StringComparison.OrdinalIgnoreCase);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse SD JSON for type check");
            return false;
        }
    }

    /// <summary>
    /// Saves an auto-resolved profile selection.
    /// </summary>
    private async Task SaveAutoResolutionAsync(
        Guid bundleId,
        Guid structureDefinitionId,
        CancellationToken cancellationToken)
    {
        var existing = await _dbContext.Set<ProjectBundleProfileSelection>()
            .FirstOrDefaultAsync(s => s.ProjectBundleId == bundleId, cancellationToken);

        // Only save if no manual selection exists
        if (existing?.Source == BundleProfileSelectionSource.Manual)
        {
            _logger.LogDebug(
                "Skipping auto-save - manual selection exists for Bundle {BundleId}",
                bundleId);
            return;
        }

        if (existing != null)
        {
            existing.StructureDefinitionId = structureDefinitionId;
            existing.Source = BundleProfileSelectionSource.Auto;
            existing.CreatedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            var newSelection = new ProjectBundleProfileSelection
            {
                Id = Guid.NewGuid(),
                ProjectBundleId = bundleId,
                StructureDefinitionId = structureDefinitionId,
                Source = BundleProfileSelectionSource.Auto,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _dbContext.Set<ProjectBundleProfileSelection>().Add(newSelection);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
