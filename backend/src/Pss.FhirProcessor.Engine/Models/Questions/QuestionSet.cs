namespace Pss.FhirProcessor.Engine.Models.Questions;

/// <summary>
/// A collection of questions grouped together
/// </summary>
public class QuestionSet
{
    /// <summary>
    /// Stable internal identifier
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the question set
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Terminology URL (legacy field, may be empty)
    /// </summary>
    public string TerminologyUrl { get; set; } = string.Empty;

    /// <summary>
    /// Question references
    /// </summary>
    public List<QuestionSetQuestionRef> Questions { get; set; } = new();

    /// <summary>
    /// Creation timestamp
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Last update timestamp
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>
/// Reference to a question within a question set
/// </summary>
public class QuestionSetQuestionRef
{
    /// <summary>
    /// Question ID
    /// </summary>
    public string QuestionId { get; set; } = string.Empty;

    /// <summary>
    /// Is this question required?
    /// </summary>
    public bool Required { get; set; }
}
