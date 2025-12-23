namespace Pss.FhirProcessor.Engine.Models.Questions;

/// <summary>
/// Answer type for a semantic question
/// </summary>
public enum QuestionAnswerType
{
    Code,
    Quantity,
    Integer,
    Decimal,
    String,
    Boolean
}
