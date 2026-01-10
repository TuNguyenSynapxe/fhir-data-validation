using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using System.Text.Json;

namespace Pss.FhirProcessor.Application.Projects.Queries;

/// <summary>
/// Phase 10.1: Query service for promoted StructureDefinitions.
/// Read-only service exposing Phase 10.0 classification results.
/// </summary>
public sealed class ProjectStructureDefinitionQueryService
{
    private readonly FhirProcessorDbContext _dbContext;

    public ProjectStructureDefinitionQueryService(FhirProcessorDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Represents a promoted StructureDefinition result.
    /// </summary>
    public sealed class StructureDefinitionResult
    {
        public Guid ArtifactId { get; init; }
        public string Name { get; init; } = string.Empty;
        public string CanonicalUrl { get; init; } = string.Empty;
        public string ResourceType { get; init; } = string.Empty;
        public StructureDefinitionRole Role { get; init; }
    }

    /// <summary>
    /// Gets all promoted StructureDefinitions for a project.
    /// Phase 10.1: Filters using Phase 10.0 IsPromoted and StructureDefinitionRole fields.
    /// </summary>
    /// <param name="projectId">Project identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of promoted SDs (empty list if none promoted).</returns>
    public async Task<List<StructureDefinitionResult>> GetPromotedStructureDefinitionsAsync(
        Guid projectId,
        CancellationToken cancellationToken = default)
    {
        // Phase 10.1: Query ONLY promoted StructureDefinitions
        // Uses Phase 10.0 classification fields (IsPromoted, StructureDefinitionRole)
        var artifacts = await _dbContext.ProjectArtifacts
            .AsNoTracking()
            .Where(a => a.ProjectId == projectId &&
                       a.ArtifactType == ArtifactType.StructureDefinition &&
                       a.IsPromoted == true &&
                       a.StructureDefinitionRole != null)
            .OrderBy(a => a.FileName) // Deterministic ordering
            .ToListAsync(cancellationToken);

        // Extract display name from SD JSON
        var results = new List<StructureDefinitionResult>();
        foreach (var artifact in artifacts)
        {
            var name = ExtractDisplayName(artifact);
            var resourceType = ExtractResourceType(artifact);

            results.Add(new StructureDefinitionResult
            {
                ArtifactId = artifact.Id,
                Name = name,
                CanonicalUrl = artifact.CanonicalUrl ?? string.Empty,
                ResourceType = resourceType,
                Role = artifact.StructureDefinitionRole!.Value // Safe: filtered by != null
            });
        }

        return results;
    }

    /// <summary>
    /// Extracts display name from StructureDefinition JSON.
    /// Tries: title → name → filename (fallback).
    /// </summary>
    private static string ExtractDisplayName(ProjectArtifact artifact)
    {
        try
        {
            var doc = JsonDocument.Parse(artifact.ResourceJson);
            var root = doc.RootElement;

            // Try title first (most human-readable)
            if (root.TryGetProperty("title", out var titleElement))
            {
                var title = titleElement.GetString();
                if (!string.IsNullOrWhiteSpace(title))
                {
                    return title;
                }
            }

            // Try name next
            if (root.TryGetProperty("name", out var nameElement))
            {
                var name = nameElement.GetString();
                if (!string.IsNullOrWhiteSpace(name))
                {
                    return name;
                }
            }

            // Fallback to filename without extension
            return Path.GetFileNameWithoutExtension(artifact.FileName);
        }
        catch (JsonException)
        {
            // JSON parsing failed, use filename
            return Path.GetFileNameWithoutExtension(artifact.FileName);
        }
    }

    /// <summary>
    /// Extracts resource type from StructureDefinition JSON.
    /// Reads the "type" field (e.g., "Patient", "Observation", "Bundle").
    /// </summary>
    private static string ExtractResourceType(ProjectArtifact artifact)
    {
        try
        {
            var doc = JsonDocument.Parse(artifact.ResourceJson);
            var root = doc.RootElement;

            if (root.TryGetProperty("type", out var typeElement))
            {
                var type = typeElement.GetString();
                if (!string.IsNullOrWhiteSpace(type))
                {
                    return type;
                }
            }

            // Fallback to empty string (should not happen for valid SDs)
            return string.Empty;
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }

    /// <summary>
    /// Checks if a project exists.
    /// </summary>
    public async Task<bool> ProjectExistsAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Projects
            .AsNoTracking()
            .AnyAsync(p => p.Id == projectId, cancellationToken);
    }
}
