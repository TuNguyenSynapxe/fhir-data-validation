namespace Pss.FhirProcessor.Engine.Models.Questions;

/// <summary>
/// UCUM unit for quantity answers
/// </summary>
public class QuestionUnit
{
    /// <summary>
    /// Unit system (UCUM only)
    /// </summary>
    public string System { get; set; } = "http://unitsofmeasure.org";

    /// <summary>
    /// UCUM unit code
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable unit display
    /// </summary>
    public string Display { get; set; } = string.Empty;
}
