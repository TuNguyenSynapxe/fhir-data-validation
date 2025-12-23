namespace Pss.FhirProcessor.Playground.Api.Dtos.Questions;

/// <summary>
/// DTO for ValueSet binding
/// </summary>
public class ValueSetBindingDto
{
    public string Url { get; set; } = string.Empty;
    public string BindingStrength { get; set; } = "required";
}
