namespace Pss.FhirProcessor.Playground.Api.Dtos.Questions;

/// <summary>
/// DTO for question coding
/// </summary>
public class CodingDto
{
    public string System { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Display { get; set; }
}
