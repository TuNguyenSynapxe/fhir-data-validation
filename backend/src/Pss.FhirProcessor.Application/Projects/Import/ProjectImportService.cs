using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Application.Projects.Import.Errors;
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
    private readonly StructureDefinitionRuleGenerator _ruleGenerator;
    private readonly ILogger<ProjectImportService> _logger;

    public ProjectImportService(
        FhirProcessorDbContext dbContext,
        SimplifierPackageParser parser,
        ArtifactClassifier classifier,
        StructureDefinitionRuleGenerator ruleGenerator,
        ILogger<ProjectImportService> logger)
    {
        _dbContext = dbContext;
        _parser = parser;
        _classifier = classifier;
        _ruleGenerator = ruleGenerator;
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

            // Step 5: Generate rules from StructureDefinitions
            _logger.LogDebug("Generating rules from StructureDefinitions");
            var rules = _ruleGenerator.GenerateRules(artifacts);

            _logger.LogInformation("Generated {Count} rules", rules.Count);

            // Step 6: Create project graph in database
            _logger.LogDebug("Creating project graph in database");
            var projectId = await CreateProjectGraphAsync(
                manifest,
                artifacts,
                bundles,
                rules,
                policyMode,
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
                    CreatedAt = now
                };

                _dbContext.ProjectArtifacts.Add(projectArtifact);
            }

            // Create ProjectBundles
            foreach (var bundle in bundles)
            {
                var projectBundle = new ProjectBundle
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    Name = bundle.Name,
                    Source = BundleSource.ImportedExample,
                    BundleJson = bundle.BundleJson,
                    CreatedAt = now
                };

                _dbContext.ProjectBundles.Add(projectBundle);
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
