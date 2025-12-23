using System.Text.Json;
using Pss.FhirProcessor.Engine.Models.Questions;
using Pss.FhirProcessor.Engine.Validation.Questions;

namespace Pss.FhirProcessor.Engine.Services.Questions;

/// <summary>
/// File-based Question storage service
/// </summary>
public class QuestionService : IQuestionService
{
    private readonly string _dataRoot;
    private readonly QuestionValidator _validator;
    private readonly JsonSerializerOptions _jsonOptions;

    public QuestionService(string dataRoot)
    {
        _dataRoot = dataRoot;
        _validator = new QuestionValidator();
        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    public async Task<IEnumerable<Question>> ListQuestionsAsync(string projectId)
    {
        var projectDir = GetProjectDirectory(projectId);
        if (!Directory.Exists(projectDir))
        {
            return Enumerable.Empty<Question>();
        }

        var questions = new List<Question>();
        var questionFiles = Directory.GetFiles(projectDir, "question_*.json");

        foreach (var file in questionFiles)
        {
            var json = await File.ReadAllTextAsync(file);
            var question = JsonSerializer.Deserialize<Question>(json, _jsonOptions);
            if (question != null)
            {
                questions.Add(question);
            }
        }

        return questions;
    }

    public async Task<Question?> GetQuestionAsync(string projectId, string questionId)
    {
        var filePath = GetQuestionFilePath(projectId, questionId);
        if (!File.Exists(filePath))
        {
            return null;
        }

        var json = await File.ReadAllTextAsync(filePath);
        return JsonSerializer.Deserialize<Question>(json, _jsonOptions);
    }

    public async Task<Question> CreateQuestionAsync(string projectId, Question question)
    {
        // Validate question
        var validationResult = _validator.Validate(question);
        if (!validationResult.IsValid)
        {
            throw new InvalidOperationException(
                $"Question validation failed: {string.Join(", ", validationResult.Errors)}");
        }

        // Ensure project directory exists
        var projectDir = GetProjectDirectory(projectId);
        Directory.CreateDirectory(projectDir);

        // Generate ID if not provided
        if (string.IsNullOrWhiteSpace(question.Id))
        {
            question.Id = Guid.NewGuid().ToString();
        }

        // Check if ID already exists
        var filePath = GetQuestionFilePath(projectId, question.Id);
        if (File.Exists(filePath))
        {
            throw new InvalidOperationException($"Question with ID '{question.Id}' already exists");
        }

        // Set timestamps
        question.Metadata.CreatedAt = DateTimeOffset.UtcNow;
        question.Metadata.UpdatedAt = DateTimeOffset.UtcNow;

        // Save to file
        var json = JsonSerializer.Serialize(question, _jsonOptions);
        await File.WriteAllTextAsync(filePath, json);

        return question;
    }

    public async Task<Question> UpdateQuestionAsync(string projectId, string questionId, Question question)
    {
        // Validate question
        var validationResult = _validator.Validate(question);
        if (!validationResult.IsValid)
        {
            throw new InvalidOperationException(
                $"Question validation failed: {string.Join(", ", validationResult.Errors)}");
        }

        // Check if question exists
        var filePath = GetQuestionFilePath(projectId, questionId);
        if (!File.Exists(filePath))
        {
            throw new InvalidOperationException($"Question with ID '{questionId}' not found");
        }

        // Load existing question to preserve CreatedAt
        var existingJson = await File.ReadAllTextAsync(filePath);
        var existingQuestion = JsonSerializer.Deserialize<Question>(existingJson, _jsonOptions);

        // Ensure ID matches
        question.Id = questionId;

        // Preserve CreatedAt, update UpdatedAt
        if (existingQuestion != null)
        {
            question.Metadata.CreatedAt = existingQuestion.Metadata.CreatedAt;
        }
        question.Metadata.UpdatedAt = DateTimeOffset.UtcNow;

        // Save to file
        var json = JsonSerializer.Serialize(question, _jsonOptions);
        await File.WriteAllTextAsync(filePath, json);

        return question;
    }

    public async Task DeleteQuestionAsync(string projectId, string questionId)
    {
        var filePath = GetQuestionFilePath(projectId, questionId);
        if (!File.Exists(filePath))
        {
            throw new InvalidOperationException($"Question with ID '{questionId}' not found");
        }

        await Task.Run(() => File.Delete(filePath));
    }

    private string GetProjectDirectory(string projectId)
    {
        return Path.Combine(_dataRoot, projectId);
    }

    private string GetQuestionFilePath(string projectId, string questionId)
    {
        return Path.Combine(GetProjectDirectory(projectId), $"question_{questionId}.json");
    }
}
