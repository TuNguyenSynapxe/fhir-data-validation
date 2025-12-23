using Hl7.Fhir.Model;

namespace Pss.FhirProcessor.Engine.Models.Questions;

/// <summary>
/// Semantic question with answer type and constraints
/// </summary>
public class Question
{
    /// <summary>
    /// Stable internal identifier
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Terminology code identifying this question
    /// </summary>
    public Coding Code { get; set; } = new Coding();

    /// <summary>
    /// Expected answer type
    /// </summary>
    public QuestionAnswerType AnswerType { get; set; }

    /// <summary>
    /// Unit (for Quantity answers only)
    /// </summary>
    public QuestionUnit? Unit { get; set; }

    /// <summary>
    /// Value constraints
    /// </summary>
    public QuestionConstraints? Constraints { get; set; }

    /// <summary>
    /// ValueSet binding (for Code answers only)
    /// </summary>
    public ValueSetBinding? ValueSet { get; set; }

    /// <summary>
    /// Metadata
    /// </summary>
    public QuestionMetadata Metadata { get; set; } = new QuestionMetadata();
}

/// <summary>
/// Question metadata
/// </summary>
public class QuestionMetadata
{
    /// <summary>
    /// Question text (human-readable)
    /// </summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Description or help text
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Creation timestamp
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Last update timestamp
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
