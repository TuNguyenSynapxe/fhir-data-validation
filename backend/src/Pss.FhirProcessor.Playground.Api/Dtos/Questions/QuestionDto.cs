namespace Pss.FhirProcessor.Playground.Api.Dtos.Questions;

/// <summary>
/// DTO for Question (API representation)
/// </summary>
public class QuestionDto
{
    public string Id { get; set; } = string.Empty;
    public CodingDto Code { get; set; } = new CodingDto();
    public string AnswerType { get; set; } = string.Empty;
    public QuestionUnitDto? Unit { get; set; }
    public QuestionConstraintsDto? Constraints { get; set; }
    public ValueSetBindingDto? ValueSet { get; set; }
    public QuestionMetadataDto Metadata { get; set; } = new QuestionMetadataDto();
}

/// <summary>
/// DTO for Question metadata
/// </summary>
public class QuestionMetadataDto
{
    public string Text { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>
/// DTO for creating/updating a Question
/// </summary>
public class CreateQuestionDto
{
    public string? Id { get; set; }
    public CodingDto Code { get; set; } = new CodingDto();
    public string AnswerType { get; set; } = string.Empty;
    public QuestionUnitDto? Unit { get; set; }
    public QuestionConstraintsDto? Constraints { get; set; }
    public ValueSetBindingDto? ValueSet { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? Description { get; set; }
}
