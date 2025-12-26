using Pss.FhirProcessor.Engine.Models.Questions;

namespace Pss.FhirProcessor.Engine.Services.Questions;

/// <summary>
/// Service for managing Question Sets
/// </summary>
public interface IQuestionSetService
{
    /// <summary>
    /// List all question sets for a project
    /// </summary>
    Task<IEnumerable<QuestionSet>> ListQuestionSetsAsync(string projectId);

    /// <summary>
    /// Get a question set by ID
    /// </summary>
    Task<QuestionSet?> GetQuestionSetAsync(string projectId, string questionSetId);

    /// <summary>
    /// Create a new question set
    /// </summary>
    Task<QuestionSet> CreateQuestionSetAsync(string projectId, QuestionSet questionSet);

    /// <summary>
    /// Update an existing question set
    /// </summary>
    Task<QuestionSet> UpdateQuestionSetAsync(string projectId, string questionSetId, QuestionSet questionSet);

    /// <summary>
    /// Delete a question set
    /// </summary>
    Task DeleteQuestionSetAsync(string projectId, string questionSetId);
}
