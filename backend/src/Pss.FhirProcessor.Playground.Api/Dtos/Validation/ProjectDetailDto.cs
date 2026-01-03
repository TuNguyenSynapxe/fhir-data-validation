namespace Pss.FhirProcessor.Playground.Api.Dtos.Validation;

/// <summary>
/// Detailed DTO for a specific project (includes ruleset metadata but not full rules).
/// </summary>
public sealed record ProjectDetailDto
{
    /// <summary>
    /// Project unique identifier.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// URL-friendly slug for project identification.
    /// </summary>
    public required string Slug { get; init; }

    /// <summary>
    /// Display name of the project.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Optional project description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Project status.
    /// </summary>
    public required string Status { get; init; }

    /// <summary>
    /// Date/time when project was created.
    /// </summary>
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>
    /// Date/time when project was published.
    /// </summary>
    public DateTimeOffset? PublishedAt { get; init; }

    /// <summary>
    /// Ruleset metadata (rule count, code system count, etc.).
    /// Does NOT include full ruleset JSON (kept opaque).
    /// </summary>
    public ProjectRulesetMetadata? RulesetMetadata { get; init; }
}

/// <summary>
/// Metadata about a project's ruleset (summary statistics).
/// </summary>
public sealed record ProjectRulesetMetadata
{
    public required int RuleCount { get; init; }
    public required int CodeSystemCount { get; init; }
    public required string FhirVersion { get; init; }
}
