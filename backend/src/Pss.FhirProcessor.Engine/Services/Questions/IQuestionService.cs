using Pss.FhirProcessor.Engine.Models.Questions;

namespace Pss.FhirProcessor.Engine.Services.Questions;

/// <summary>
/// Service for managing Questions
/// </summary>
public interface IQuestionService
{
    /// <summary>
    /// List all questions for a project
    /// </summary>
    Task<IEnumerable<Question>> ListQuestionsAsync(string projectId);

    /// <summary>
    /// Get a question by ID
    /// </summary>
    Task<Question?> GetQuestionAsync(string projectId, string questionId);

    /// <summary>
    /// Create a new question
    /// </summary>
    Task<Question> CreateQuestionAsync(string projectId, Question question);

    /// <summary>
    /// Update an existing question
    /// </summary>
    Task<Question> UpdateQuestionAsync(string projectId, string questionId, Question question);

    /// <summary>
    /// Delete a question
    /// </summary>
    Task DeleteQuestionAsync(string projectId, string questionId);
}
