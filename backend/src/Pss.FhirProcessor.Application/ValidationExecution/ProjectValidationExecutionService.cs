using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Application.Projects.BundleProfiles;
using Pss.FhirProcessor.Application.ValidationExecution.Interfaces;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using System.Text.Json;

namespace Pss.FhirProcessor.Application.ValidationExecution;

/// <summary>
/// Phase 8.1 + 8.4: Validation Execution Service
/// Pure application-layer service that orchestrates validation for Project + Bundle.
/// READ-ONLY. NO mutations. NO rule management. Deterministic.
/// 
/// Phase 8.4 Integration:
/// - Loads Bundle profile state from Phase 8.3
/// - Filters project rules based on profile resolution
/// - Surfaces validation scope in response metadata
/// </summary>
public sealed class ProjectValidationExecutionService : IProjectValidationExecutionService
{
    private readonly FhirProcessorDbContext _dbContext;
    private readonly IValidationPipeline _validationPipeline;
    private readonly IBundleProfileResolutionService _bundleProfileResolution;
    private readonly ILogger<ProjectValidationExecutionService> _logger;

    public ProjectValidationExecutionService(
        FhirProcessorDbContext dbContext,
        IValidationPipeline validationPipeline,
        IBundleProfileResolutionService bundleProfileResolution,
        ILogger<ProjectValidationExecutionService> logger)
    {
        _dbContext = dbContext;
        _validationPipeline = validationPipeline;
        _bundleProfileResolution = bundleProfileResolution;
        _logger = logger;
    }

    public async Task<ValidationResponse> ExecuteAsync(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            _logger.LogInformation(
                "Starting validation execution for ProjectId={ProjectId}, BundleId={BundleId}",
                projectId, bundleId);

            // Step 1: Load and validate project context (fail-fast)
            var context = await LoadValidationContextAsync(projectId, bundleId, cancellationToken);

            // Step 2: Load bundle JSON (fail-fast on invalid JSON)
            ValidateBundleJson(context.BundleJson);

            // Step 3: Load structure definitions (fail-fast if none available)
            var structureDefinitions = await LoadStructureDefinitionsAsync(projectId, cancellationToken);

            // Step 3.5: Phase 8.4 - Resolve Bundle profile state (determines rule scope)
            var bundleProfileResult = await _bundleProfileResolution.ResolveAsync(
                projectId, bundleId, cancellationToken);

            _logger.LogInformation(
                "Bundle profile state: {State}, SDID={SDID}, Source={Source}",
                bundleProfileResult.State,
                bundleProfileResult.StructureDefinitionId,
                bundleProfileResult.Source);

            // Step 4: Load enabled rules with profile-based filtering (Phase 8.4)
            var rulesJson = await LoadRulesJsonAsync(
                projectId, bundleId, bundleProfileResult.State, cancellationToken);

            // Step 5: Build validation request
            var validationRequest = new ValidationRequest
            {
                BundleJson = context.BundleJson,
                RulesJson = rulesJson,
                FhirVersion = "5.0.0", // R5 from Phase 7
                ValidationMode = "standard", // No authoring features needed for execution
                // Include structure definitions for profile validation
                // NOTE: Phase 8.1 focuses on FHIRPath rules; profile validation is future work
            };

            // Step 6: Execute validation via engine (stateless, deterministic)
            _logger.LogDebug("Executing validation pipeline with {RuleCount} rules", 
                CountRulesInJson(rulesJson));

            var result = await _validationPipeline.ValidateAsync(validationRequest, cancellationToken);

            _logger.LogInformation(
                "Validation execution completed: ProjectId={ProjectId}, BundleId={BundleId}, " +
                "Errors={ErrorCount}, Warnings={WarningCount}, BundleProfileState={State}, " +
                "AppliedProjectRules={AppliedRules}",
                projectId, bundleId, result.Summary.TotalErrors, result.Summary.WarningCount,
                bundleProfileResult.State, bundleProfileResult.State == BundleProfileState.Resolved);

            // Phase 8.4: Add validation scope metadata to response
            result.Metadata.ValidationScope = new ValidationScope
            {
                BundleProfileState = bundleProfileResult.State.ToString().ToLowerInvariant(),
                AppliedProjectRules = bundleProfileResult.State == BundleProfileState.Resolved,
                StructureDefinitionId = bundleProfileResult.StructureDefinitionId,
                Source = bundleProfileResult.Source?.ToString().ToLowerInvariant()
            };

            return result;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Validation execution cancelled: ProjectId={ProjectId}, BundleId={BundleId}",
                projectId, bundleId);
            throw new ValidationExecutionException(
                ValidationExecutionException.ErrorCodes.CANCELLED,
                "Validation execution was cancelled");
        }
        catch (ValidationExecutionException)
        {
            // Re-throw our own exceptions
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Validation engine failure: ProjectId={ProjectId}, BundleId={BundleId}",
                projectId, bundleId);
            throw new ValidationExecutionException(
                ValidationExecutionException.ErrorCodes.VALIDATION_ENGINE_FAILURE,
                "Validation engine encountered an unexpected error",
                ex);
        }
    }

    /// <summary>
    /// Load and validate project + bundle context (fail-fast).
    /// </summary>
    private async Task<ValidationContext> LoadValidationContextAsync(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken)
    {
        // Check project exists
        var project = await _dbContext.Projects
            .AsNoTracking()
            .Where(p => p.Id == projectId)
            .Select(p => new { p.Id, p.Name, p.PolicyMode })
            .FirstOrDefaultAsync(cancellationToken);

        if (project == null)
        {
            throw new ValidationExecutionException(
                ValidationExecutionException.ErrorCodes.PROJECT_NOT_FOUND,
                $"Project not found: {projectId}");
        }

        // Check bundle exists and belongs to project
        var bundle = await _dbContext.ProjectBundles
            .AsNoTracking()
            .Where(b => b.Id == bundleId && b.ProjectId == projectId)
            .Select(b => new { b.Id, b.Name, b.BundleJson })
            .FirstOrDefaultAsync(cancellationToken);

        if (bundle == null)
        {
            throw new ValidationExecutionException(
                ValidationExecutionException.ErrorCodes.BUNDLE_NOT_FOUND,
                $"Bundle not found or does not belong to project: BundleId={bundleId}, ProjectId={projectId}");
        }

        _logger.LogDebug(
            "Loaded validation context: Project={ProjectName}, Bundle={BundleName}, PolicyMode={PolicyMode}",
            project.Name, bundle.Name, project.PolicyMode);

        return new ValidationContext
        {
            ProjectId = project.Id,
            ProjectName = project.Name,
            PolicyMode = project.PolicyMode,
            BundleId = bundle.Id,
            BundleName = bundle.Name,
            BundleJson = bundle.BundleJson
        };
    }

    /// <summary>
    /// Validate bundle JSON is parseable (fail-fast).
    /// </summary>
    private void ValidateBundleJson(string bundleJson)
    {
        if (string.IsNullOrWhiteSpace(bundleJson))
        {
            throw new ValidationExecutionException(
                ValidationExecutionException.ErrorCodes.INVALID_BUNDLE_JSON,
                "Bundle JSON is empty or whitespace");
        }

        try
        {
            using var doc = JsonDocument.Parse(bundleJson);
            var root = doc.RootElement;

            // Basic FHIR Bundle structure check
            if (root.ValueKind != JsonValueKind.Object)
            {
                throw new ValidationExecutionException(
                    ValidationExecutionException.ErrorCodes.INVALID_BUNDLE_JSON,
                    "Bundle JSON is not a valid JSON object");
            }

            if (!root.TryGetProperty("resourceType", out var resourceType) ||
                resourceType.GetString() != "Bundle")
            {
                throw new ValidationExecutionException(
                    ValidationExecutionException.ErrorCodes.INVALID_BUNDLE_JSON,
                    "Bundle JSON must have resourceType='Bundle'");
            }
        }
        catch (JsonException ex)
        {
            throw new ValidationExecutionException(
                ValidationExecutionException.ErrorCodes.INVALID_BUNDLE_JSON,
                "Bundle JSON is malformed",
                ex);
        }
    }

    /// <summary>
    /// Load structure definitions for the project (fail-fast if none available).
    /// Phase 8.1: Placeholder for future profile validation integration.
    /// Currently returns empty list as FHIRPath rules are the primary focus.
    /// </summary>
    private async Task<List<StructureDefinitionInfo>> LoadStructureDefinitionsAsync(
        Guid projectId,
        CancellationToken cancellationToken)
    {
        var structureDefinitions = await _dbContext.ProjectArtifacts
            .AsNoTracking()
            .Where(a => a.ProjectId == projectId && a.ArtifactType == ArtifactType.StructureDefinition)
            .OrderBy(a => a.FilePath) // Deterministic ordering
            .Select(a => new StructureDefinitionInfo
            {
                ArtifactId = a.Id,
                CanonicalUrl = a.CanonicalUrl,
                FileName = a.FileName
            })
            .ToListAsync(cancellationToken);

        _logger.LogDebug("Loaded {Count} structure definitions for project {ProjectId}",
            structureDefinitions.Count, projectId);

        // Phase 8.1: Structure definitions are loaded but not yet integrated into validation request.
        // FHIRPath rules from ProjectRules are the primary validation mechanism.
        // Future: Pass structure definitions to ValidationRequest for profile validation.

        return structureDefinitions;
    }

    /// <summary>
    /// Phase 8.4: Load enabled rules with Bundle profile state filtering.
    /// 
    /// Rule Filtering Logic (EXACT):
    /// - If Bundle profile state is NOT Resolved: Return null (skip ALL project rules)
    /// - If Bundle profile state is Resolved: Load and apply rules normally
    /// 
    /// This is scope control, not validation logic modification.
    /// Base FHIR validation always runs regardless of rule filtering.
    /// </summary>
    private async Task<string?> LoadRulesJsonAsync(
        Guid projectId,
        Guid bundleId,
        BundleProfileState bundleProfileState,
        CancellationToken cancellationToken)
    {
        // Phase 8.4: Filter project rules based on Bundle profile state
        if (bundleProfileState != BundleProfileState.Resolved)
        {
            _logger.LogInformation(
                "Bundle profile state is {State} - skipping ALL project rules. " +
                "Only base FHIR validation will apply.",
                bundleProfileState);
            return null;
        }

        // Bundle is RESOLVED - apply project rules normally
        _logger.LogDebug("Bundle profile is RESOLVED - loading project rules");

        var rules = await _dbContext.ProjectRules
            .AsNoTracking()
            .Where(r => r.ProjectId == projectId && r.IsEnabled)
            .Where(r => r.Scope == RuleScope.Project || 
                       (r.Scope == RuleScope.Bundle && r.BundleId == bundleId))
            .OrderBy(r => r.Scope) // Project first, then Bundle
            .ThenBy(r => r.Title)  // Deterministic within scope
            .Select(r => new
            {
                r.Id,
                r.Scope,
                r.RuleType,
                r.Provenance,
                r.Title,
                r.DefinitionJson
            })
            .ToListAsync(cancellationToken);

        if (!rules.Any())
        {
            _logger.LogWarning("No enabled rules found for ProjectId={ProjectId}, BundleId={BundleId}",
                projectId, bundleId);
            return null;
        }

        _logger.LogDebug("Loaded {RuleCount} enabled rules (Project: {ProjectRules}, Bundle: {BundleRules})",
            rules.Count,
            rules.Count(r => r.Scope == RuleScope.Project),
            rules.Count(r => r.Scope == RuleScope.Bundle));

        // Build rules array JSON from DefinitionJson fields
        // Each DefinitionJson contains a complete rule definition compatible with validation engine
        var ruleDefinitions = rules.Select(r =>
        {
            try
            {
                // Parse and re-serialize to ensure valid JSON
                using var doc = JsonDocument.Parse(r.DefinitionJson);
                return doc.RootElement.Clone();
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex,
                    "Skipping rule with invalid JSON: RuleId={RuleId}, Title={Title}",
                    r.Id, r.Title);
                return (JsonElement?)null;
            }
        })
        .Where(e => e.HasValue)
        .Select(e => e!.Value)
        .ToList();

        if (!ruleDefinitions.Any())
        {
            _logger.LogWarning("All rules had invalid JSON, no rules to apply");
            return null;
        }

        // Serialize as JSON array
        var rulesArray = JsonSerializer.Serialize(ruleDefinitions, new JsonSerializerOptions
        {
            WriteIndented = false
        });

        return rulesArray;
    }

    /// <summary>
    /// Count rules in JSON array (for logging).
    /// </summary>
    private int CountRulesInJson(string? rulesJson)
    {
        if (string.IsNullOrWhiteSpace(rulesJson))
            return 0;

        try
        {
            using var doc = JsonDocument.Parse(rulesJson);
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                return doc.RootElement.GetArrayLength();
            }
        }
        catch
        {
            // Ignore parse errors
        }

        return 0;
    }

    /// <summary>
    /// Internal context model for validation execution.
    /// </summary>
    private sealed class ValidationContext
    {
        public Guid ProjectId { get; init; }
        public string ProjectName { get; init; } = string.Empty;
        public PolicyMode PolicyMode { get; init; }
        public Guid BundleId { get; init; }
        public string BundleName { get; init; } = string.Empty;
        public string BundleJson { get; init; } = string.Empty;
    }

    /// <summary>
    /// Internal model for structure definition metadata.
    /// </summary>
    private sealed class StructureDefinitionInfo
    {
        public Guid ArtifactId { get; init; }
        public string? CanonicalUrl { get; init; }
        public string FileName { get; init; } = string.Empty;
    }
}
