namespace Pss.FhirProcessor.Playground.Api.Dtos.Validation;

/// <summary>
/// Summary DTO for listing published projects.
/// </summary>
public sealed record ProjectSummaryDto
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
    /// Project status (should always be "published" for this endpoint).
    /// </summary>
    public required string Status { get; init; }

    /// <summary>
    /// Date/time when project was published.
    /// </summary>
    public DateTimeOffset? PublishedAt { get; init; }
}
