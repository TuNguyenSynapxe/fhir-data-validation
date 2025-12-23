using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

/// <summary>
/// Result of Question/Answer validation
/// </summary>
public class QuestionAnswerResult
{
    /// <summary>
    /// Validation errors found
    /// </summary>
    public List<RuleValidationError> Errors { get; set; } = new();

    /// <summary>
    /// Number of questions validated
    /// </summary>
    public int QuestionsValidated { get; set; }

    /// <summary>
    /// Number of answers validated
    /// </summary>
    public int AnswersValidated { get; set; }

    /// <summary>
    /// Advisory notes (e.g., missing master data)
    /// </summary>
    public List<string> AdvisoryNotes { get; set; } = new();
}
