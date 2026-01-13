using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Application.Projects.Import.Errors;
using Pss.FhirProcessor.Application.Services;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Import;

/// <summary>
/// Orchestrates the import of Simplifier R5 packages into the database.
/// Implements deterministic, fail-fast import flow.
/// </summary>
public sealed class ProjectImportService
{
    private readonly FhirProcessorDbContext _dbContext;
    private readonly SimplifierPackageParser _parser;
    private readonly ArtifactClassifier _classifier;
    private readonly StructureDefinitionClassifier _sdClassifier; // Phase 10.0
    private readonly StructureDefinitionRuleGenerator _ruleGenerator;
    private readonly IBundleAutoTaggingService _autoTaggingService; // Phase 3.2
    private readonly ILogger<ProjectImportService> _logger;

    public ProjectImportService(
        FhirProcessorDbContext dbContext,
        SimplifierPackageParser parser,
        ArtifactClassifier classifier,
        StructureDefinitionClassifier sdClassifier, // Phase 10.0
        StructureDefinitionRuleGenerator ruleGenerator,
        IBundleAutoTaggingService autoTaggingService, // Phase 3.2
        ILogger<ProjectImportService> logger)
    {
        _dbContext = dbContext;
        _parser = parser;
        _classifier = classifier;
        _sdClassifier = sdClassifier; // Phase 10.0
        _ruleGenerator = ruleGenerator;
        _autoTaggingService = autoTaggingService; // Phase 3.2
        _logger = logger;
    }

    /// <summary>
    /// Imports a Simplifier R5 package ZIP file into the database.
    /// </summary>
    /// <param name="zipFilePath">Path to the ZIP file.</param>
    /// <param name="policyMode">Policy mode for the project (default: Strict).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Created project ID.</returns>
    /// <exception cref="ProjectImportException">Thrown when import fails.</exception>
    public async Task<Guid> ImportPackageAsync(
        string zipFilePath,
        PolicyMode policyMode = PolicyMode.Strict,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting import of package: {ZipFilePath}", zipFilePath);

        try
        {
            // Step 1: Parse package manifest
            _logger.LogDebug("Parsing package manifest");
            var manifest = _parser.ParsePackageManifest(zipFilePath);

            _logger.LogInformation(
                "Package manifest parsed: {Name} v{Version} (FHIR {FhirVersion})",
                manifest.Name,
                manifest.Version,
                manifest.FhirVersion);

            // Step 2: Extract all JSON files
            _logger.LogDebug("Extracting JSON files from ZIP");
            var jsonFiles = _parser.ExtractJsonFiles(zipFilePath);

            _logger.LogInformation("Extracted {Count} JSON files", jsonFiles.Count);

            // Step 3: Classify artifacts
            _logger.LogDebug("Classifying artifacts");
            var artifacts = jsonFiles
                .Select(kvp => _classifier.Classify(kvp.Key, kvp.Value))
                .ToList();

            // Check for duplicate canonical URLs
            var duplicates = artifacts
                .Where(a => !string.IsNullOrWhiteSpace(a.CanonicalUrl))
                .GroupBy(a => a.CanonicalUrl)
                .Where(g => g.Count() > 1)
                .ToList();

            if (duplicates.Any())
            {
                var duplicate = duplicates.First();
                throw new ProjectImportException(
                    ImportErrorCodes.DuplicateCanonicalUrl,
                    $"Duplicate canonical URL found: {duplicate.Key}",
                    new Dictionary<string, object>
                    {
                        ["CanonicalUrl"] = duplicate.Key!,
                        ["Files"] = duplicate.Select(a => a.FilePath).ToArray()
                    });
            }

            _logger.LogInformation(
                "Classified {Total} artifacts: {SDs} SDs, {VS} ValueSets, {CS} CodeSystems, {Bundles} Bundles, {Other} Other",
                artifacts.Count,
                artifacts.Count(a => a.ArtifactType == ArtifactType.StructureDefinition),
                artifacts.Count(a => a.ArtifactType == ArtifactType.ValueSet),
                artifacts.Count(a => a.ArtifactType == ArtifactType.CodeSystem),
                artifacts.Count(a => a.ArtifactType == ArtifactType.Bundle),
                artifacts.Count(a => a.ArtifactType == ArtifactType.Other));

            // Step 4: Identify bundles
            _logger.LogDebug("Identifying bundles");
            var bundles = _classifier.IdentifyBundles(artifacts);

            _logger.LogInformation("Identified {Count} example bundles", bundles.Count);

            // Phase 10.0: Step 4.5: Classify StructureDefinitions
            _logger.LogDebug("Classifying StructureDefinitions for promotion");
            var bundleProfileUrls = _sdClassifier.ExtractBundleProfileUrls(bundles);
            var sdClassifications = new Dictionary<string, StructureDefinitionClassifier.ClassificationResult>();

            var structureDefinitions = artifacts.Where(a => a.ArtifactType == ArtifactType.StructureDefinition).ToList();
            foreach (var sd in structureDefinitions)
            {
                var classification = _sdClassifier.Classify(sd, bundleProfileUrls);
                sdClassifications[sd.CanonicalUrl ?? sd.FilePath] = classification;

                _logger.LogDebug(
                    "SD Classification: {FileName} -> {Role} (Promoted: {IsPromoted}) - {Reason}",
                    sd.FileName,
                    classification.Role,
                    classification.IsPromoted,
                    classification.Reason);
            }

            var promotedSDs = structureDefinitions
                .Where(sd => sdClassifications.ContainsKey(sd.CanonicalUrl ?? sd.FilePath) &&
                             sdClassifications[sd.CanonicalUrl ?? sd.FilePath].IsPromoted)
                .ToList();

            _logger.LogInformation(
                "StructureDefinition classification complete: {Total} SDs, {Promoted} promoted ({ValidationProfile} validation profiles, {BundleProfile} bundle profiles), {SupportingArtifact} supporting artifacts",
                structureDefinitions.Count,
                promotedSDs.Count,
                sdClassifications.Values.Count(c => c.Role == StructureDefinitionRole.ValidationProfile),
                sdClassifications.Values.Count(c => c.Role == StructureDefinitionRole.BundleProfile),
                sdClassifications.Values.Count(c => c.Role == StructureDefinitionRole.SupportingArtifact));

            // Step 5: Generate rules ONLY from Category A (ValidationProfile) SDs
            _logger.LogDebug("Generating rules from promoted validation profile StructureDefinitions");
            var validationProfileSDs = promotedSDs
                .Where(sd => sdClassifications[sd.CanonicalUrl ?? sd.FilePath].Role == StructureDefinitionRole.ValidationProfile)
                .ToList();

            var rules = _ruleGenerator.GenerateRules(validationProfileSDs);

            _logger.LogInformation("Generated {Count} rules from {SDCount} validation profile SDs", rules.Count, validationProfileSDs.Count);

            // Step 6: Create project graph in database
            _logger.LogDebug("Creating project graph in database");
            var projectId = await CreateProjectGraphAsync(
                manifest,
                artifacts,
                bundles,
                rules,
                policyMode,
                sdClassifications, // Phase 10.0: Pass classifications
                cancellationToken);

            _logger.LogInformation("Project created successfully: {ProjectId}", projectId);

            return projectId;
        }
        catch (ProjectImportException)
        {
            // Re-throw import exceptions as-is
            throw;
        }
        catch (Exception ex)
        {
            // Wrap unexpected exceptions
            _logger.LogError(ex, "Unexpected error during package import");
            throw new ProjectImportException(
                ImportErrorCodes.DatabaseError,
                "Unexpected error during package import",
                ex);
        }
    }

    private async Task<Guid> CreateProjectGraphAsync(
        ImportModels.ParsedPackageManifest manifest,
        List<ImportModels.ParsedArtifact> artifacts,
        List<ImportModels.ParsedBundle> bundles,
        List<StructureDefinitionRuleGenerator.GeneratedRule> rules,
        PolicyMode policyMode,
        Dictionary<string, StructureDefinitionClassifier.ClassificationResult> sdClassifications, // Phase 10.0
        CancellationToken cancellationToken)
    {
        // Check if using in-memory database (for testing)
        var isInMemory = _dbContext.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory";
        var transaction = isInMemory ? null : await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var now = DateTimeOffset.UtcNow;

            // Create Project
            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = $"{manifest.Name} v{manifest.Version}",
                Description = manifest.Description,
                PolicyMode = policyMode,
                IsPublicEnabled = false,
                PublicId = null,
                CreatedAt = now,
                UpdatedAt = now
            };

            _dbContext.Projects.Add(project);

            // Create ProjectArtifacts
            foreach (var artifact in artifacts)
            {
                // Phase 10.0: Get SD classification if applicable
                StructureDefinitionRole? sdRole = null;
                bool? isPromoted = null;

                if (artifact.ArtifactType == ArtifactType.StructureDefinition)
                {
                    var key = artifact.CanonicalUrl ?? artifact.FilePath;
                    if (sdClassifications.ContainsKey(key))
                    {
                        var classification = sdClassifications[key];
                        sdRole = classification.Role;
                        isPromoted = classification.IsPromoted;
                    }
                }

                var projectArtifact = new ProjectArtifact
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    ArtifactType = artifact.ArtifactType,
                    FilePath = artifact.FilePath,
                    FileName = artifact.FileName,
                    ResourceType = artifact.ResourceType,
                    CanonicalUrl = artifact.CanonicalUrl,
                    ResourceJson = artifact.ResourceJson,
                    Hash = artifact.Hash,
                    StructureDefinitionRole = sdRole, // Phase 10.0
                    IsPromoted = isPromoted, // Phase 10.0
                    CreatedAt = now
                };

                _dbContext.ProjectArtifacts.Add(projectArtifact);
            }

            // Phase 3.2: Get known SD canonical URLs for auto-tagging
            var knownSdUrls = artifacts
                .Where(a => a.ArtifactType == ArtifactType.StructureDefinition && a.CanonicalUrl != null)
                .Select(a => a.CanonicalUrl!)
                .ToList();

            _logger.LogInformation(
                "Phase 3.2: Found {SdCount} StructureDefinitions for auto-tagging: {SdUrls}",
                knownSdUrls.Count,
                string.Join(", ", knownSdUrls.Take(3)) + (knownSdUrls.Count > 3 ? "..." : ""));

            // Create ProjectBundles with auto-tagging
            foreach (var bundle in bundles)
            {
                // Phase 3.2: Auto-tag bundle based on meta.profile
                var (autoTaggedUrl, taggingMode) = await _autoTaggingService.AutoTagBundleAsync(
                    bundle.BundleJson,
                    knownSdUrls,
                    cancellationToken);

                var projectBundle = new ProjectBundle
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    Name = bundle.Name,
                    Source = BundleSource.ImportedExample,
                    AutoTaggedSdCanonicalUrl = autoTaggedUrl,
                    ManuallyTaggedSdCanonicalUrl = null,
                    TaggingMode = taggingMode,
                    BundleJson = bundle.BundleJson,
                    CreatedAt = now
                };

                _dbContext.ProjectBundles.Add(projectBundle);
                
                _logger.LogInformation(
                    "Phase 3.2: Bundle '{BundleName}' auto-tagged: {AutoTagged} (mode: {TaggingMode})",
                    bundle.Name,
                    autoTaggedUrl ?? "(none)",
                    taggingMode);
            }

            // Create ProjectRules
            foreach (var rule in rules)
            {
                var projectRule = new ProjectRule
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    Scope = rule.Scope,
                    BundleId = null, // Project-scoped rules have no bundle
                    RuleType = rule.RuleType,
                    Provenance = rule.Provenance,
                    Title = rule.Title,
                    Description = rule.Description,
                    DefinitionJson = rule.DefinitionJson,
                    IsEnabled = rule.IsEnabled,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _dbContext.ProjectRules.Add(projectRule);
            }

            // Create ProjectPublicLink (disabled by default)
            var publicLink = new ProjectPublicLink
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                PublicId = GeneratePublicId(),
                Enabled = false,
                CreatedAt = now
            };

            _dbContext.ProjectPublicLinks.Add(publicLink);

            // Save all changes
            await _dbContext.SaveChangesAsync(cancellationToken);

            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            return project.Id;
        }
        catch (DbUpdateException ex)
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }
            throw new ProjectImportException(
                ImportErrorCodes.DatabaseError,
                "Failed to save project to database",
                ex);
        }
        finally
        {
            transaction?.Dispose();
        }
    }

    private static string GeneratePublicId()
    {
        // Generate a short, URL-safe identifier
        return Guid.NewGuid().ToString("N")[..12];
    }
}
