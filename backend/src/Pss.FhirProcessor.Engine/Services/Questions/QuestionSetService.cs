using System.Text.Json;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models.Questions;

namespace Pss.FhirProcessor.Engine.Services.Questions;

/// <summary>
/// JSON-file-based implementation of QuestionSet service
/// </summary>
public class QuestionSetService : IQuestionSetService
{
    private readonly ILogger<QuestionSetService> _logger;
    private const string QuestionSetsFileName = "questionsets.json";

    public QuestionSetService(ILogger<QuestionSetService> logger)
    {
        _logger = logger;
    }

    private string GetQuestionSetsFilePath(string projectId)
    {
        var baseDir = Path.Combine("data", "projects", projectId);
        Directory.CreateDirectory(baseDir);
        return Path.Combine(baseDir, QuestionSetsFileName);
    }

    public async Task<IEnumerable<QuestionSet>> ListQuestionSetsAsync(string projectId)
    {
        var filePath = GetQuestionSetsFilePath(projectId);
        
        if (!File.Exists(filePath))
        {
            return Array.Empty<QuestionSet>();
        }

        try
        {
            var json = await File.ReadAllTextAsync(filePath);
            var questionSets = JsonSerializer.Deserialize<List<QuestionSet>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            return questionSets ?? new List<QuestionSet>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read question sets from {FilePath}", filePath);
            return new List<QuestionSet>();
        }
    }

    public async Task<QuestionSet?> GetQuestionSetAsync(string projectId, string questionSetId)
    {
        var questionSets = await ListQuestionSetsAsync(projectId);
        return questionSets.FirstOrDefault(qs => qs.Id == questionSetId);
    }

    public async Task<QuestionSet> CreateQuestionSetAsync(string projectId, QuestionSet questionSet)
    {
        var questionSets = (await ListQuestionSetsAsync(projectId)).ToList();

        // Generate ID if not provided
        if (string.IsNullOrWhiteSpace(questionSet.Id))
        {
            questionSet.Id = Guid.NewGuid().ToString();
        }

        questionSet.CreatedAt = DateTimeOffset.UtcNow;
        questionSet.UpdatedAt = DateTimeOffset.UtcNow;

        questionSets.Add(questionSet);
        await SaveQuestionSetsAsync(projectId, questionSets);

        _logger.LogInformation("Created question set {QuestionSetId} in project {ProjectId}", 
            questionSet.Id, projectId);

        return questionSet;
    }

    public async Task<QuestionSet> UpdateQuestionSetAsync(string projectId, string questionSetId, QuestionSet updatedQuestionSet)
    {
        var questionSets = (await ListQuestionSetsAsync(projectId)).ToList();
        var index = questionSets.FindIndex(qs => qs.Id == questionSetId);

        if (index < 0)
        {
            throw new InvalidOperationException($"Question set {questionSetId} not found");
        }

        updatedQuestionSet.Id = questionSetId;
        updatedQuestionSet.CreatedAt = questionSets[index].CreatedAt;
        updatedQuestionSet.UpdatedAt = DateTimeOffset.UtcNow;

        questionSets[index] = updatedQuestionSet;
        await SaveQuestionSetsAsync(projectId, questionSets);

        _logger.LogInformation("Updated question set {QuestionSetId} in project {ProjectId}", 
            questionSetId, projectId);

        return updatedQuestionSet;
    }

    public async Task DeleteQuestionSetAsync(string projectId, string questionSetId)
    {
        var questionSets = (await ListQuestionSetsAsync(projectId)).ToList();
        var removed = questionSets.RemoveAll(qs => qs.Id == questionSetId);

        if (removed > 0)
        {
            await SaveQuestionSetsAsync(projectId, questionSets);
            _logger.LogInformation("Deleted question set {QuestionSetId} from project {ProjectId}", 
                questionSetId, projectId);
        }
    }

    private async Task SaveQuestionSetsAsync(string projectId, List<QuestionSet> questionSets)
    {
        var filePath = GetQuestionSetsFilePath(projectId);
        var json = JsonSerializer.Serialize(questionSets, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        await File.WriteAllTextAsync(filePath, json);
    }
}
