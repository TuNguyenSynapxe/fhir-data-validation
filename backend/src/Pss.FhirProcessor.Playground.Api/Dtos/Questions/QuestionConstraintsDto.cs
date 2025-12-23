namespace Pss.FhirProcessor.Playground.Api.Dtos.Questions;

/// <summary>
/// DTO for question constraints
/// </summary>
public class QuestionConstraintsDto
{
    public decimal? Min { get; set; }
    public decimal? Max { get; set; }
    public int? Precision { get; set; }
    public int? MaxLength { get; set; }
    public string? Regex { get; set; }
}
