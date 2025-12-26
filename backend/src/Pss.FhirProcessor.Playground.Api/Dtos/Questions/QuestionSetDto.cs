namespace Pss.FhirProcessor.Playground.Api.Dtos.Questions;

/// <summary>
/// Question Set DTO
/// </summary>
public class QuestionSetDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TerminologyUrl { get; set; } = string.Empty;
    public List<QuestionSetQuestionRefDto> Questions { get; set; } = new();
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>
/// Question reference within a question set
/// </summary>
public class QuestionSetQuestionRefDto
{
    public string QuestionId { get; set; } = string.Empty;
    public bool Required { get; set; }
    public QuestionDto? Question { get; set; }
}

/// <summary>
/// DTO for creating/updating question sets
/// </summary>
public class CreateQuestionSetDto
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TerminologyUrl { get; set; } = string.Empty;
    public List<QuestionSetQuestionRefDto> Questions { get; set; } = new();
}
