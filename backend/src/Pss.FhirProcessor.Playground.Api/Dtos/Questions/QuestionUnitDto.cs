namespace Pss.FhirProcessor.Playground.Api.Dtos.Questions;

/// <summary>
/// DTO for UCUM unit
/// </summary>
public class QuestionUnitDto
{
    public string System { get; set; } = "http://unitsofmeasure.org";
    public string Code { get; set; } = string.Empty;
    public string Display { get; set; } = string.Empty;
}
