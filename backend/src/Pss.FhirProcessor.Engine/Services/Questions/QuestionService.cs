using System.Text.Json;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models.Questions;
using Pss.FhirProcessor.Engine.Validation.Questions;

namespace Pss.FhirProcessor.Engine.Services.Questions;

/// <summary>
/// Storage model for Question JSON files (with value wrappers)
/// </summary>
internal class QuestionStorageModel
{
    public string Id { get; set; } = string.Empty;
    public CodingStorageModel Code { get; set; } = new();
    public int AnswerType { get; set; }
    public QuestionUnitStorageModel? Unit { get; set; }
    public QuestionConstraints? Constraints { get; set; }
    public ValueSetBindingStorageModel? ValueSet { get; set; }
    public QuestionMetadata Metadata { get; set; } = new();
}

internal class CodingStorageModel
{
    public ValueWrapper System { get; set; } = new();
    public ValueWrapper Code { get; set; } = new();
    public ValueWrapper Display { get; set; } = new();
}

internal class QuestionUnitStorageModel
{
    public ValueWrapper System { get; set; } = new();
    public ValueWrapper Code { get; set; } = new();
    public ValueWrapper Display { get; set; } = new();
}

internal class ValueSetBindingStorageModel
{
    public ValueWrapper Url { get; set; } = new();
    public ValueWrapper BindingStrength { get; set; } = new();
}

internal class ValueWrapper
{
    public string Value { get; set; } = string.Empty;
}

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
            var storageModel = JsonSerializer.Deserialize<QuestionStorageModel>(json, _jsonOptions);
            if (storageModel != null)
            {
                questions.Add(MapFromStorageModel(storageModel));
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
        var storageModel = JsonSerializer.Deserialize<QuestionStorageModel>(json, _jsonOptions);
        
        if (storageModel == null)
        {
            return null;
        }

        return MapFromStorageModel(storageModel);
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

        // Convert to storage model and save to file
        var storageModel = MapToStorageModel(question);
        var json = JsonSerializer.Serialize(storageModel, _jsonOptions);
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

        // Load existing question to preserve CreatedAt (using storage model)
        var existingJson = await File.ReadAllTextAsync(filePath);
        var existingStorageModel = JsonSerializer.Deserialize<QuestionStorageModel>(existingJson, _jsonOptions);

        // Ensure ID matches
        question.Id = questionId;

        // Preserve CreatedAt, update UpdatedAt
        if (existingStorageModel != null)
        {
            question.Metadata.CreatedAt = existingStorageModel.Metadata.CreatedAt;
        }
        question.Metadata.UpdatedAt = DateTimeOffset.UtcNow;

        // Convert to storage model and save to file
        var storageModel = MapToStorageModel(question);
        var json = JsonSerializer.Serialize(storageModel, _jsonOptions);
        await File.WriteAllTextAsync(filePath, json);

        return question;
    }

    public async System.Threading.Tasks.Task DeleteQuestionAsync(string projectId, string questionId)
    {
        var filePath = GetQuestionFilePath(projectId, questionId);
        if (!File.Exists(filePath))
        {
            throw new InvalidOperationException($"Question with ID '{questionId}' not found");
        }

        await System.Threading.Tasks.Task.Run(() => File.Delete(filePath));
    }

    private string GetProjectDirectory(string projectId)
    {
        return Path.Combine(_dataRoot, projectId);
    }

    private string GetQuestionFilePath(string projectId, string questionId)
    {
        return Path.Combine(GetProjectDirectory(projectId), $"question_{questionId}.json");
    }

    private static Question MapFromStorageModel(QuestionStorageModel storage)
    {
        return new Question
        {
            Id = storage.Id,
            Code = new Coding
            {
                System = storage.Code.System.Value,
                Code = storage.Code.Code.Value,
                Display = storage.Code.Display.Value
            },
            AnswerType = (QuestionAnswerType)storage.AnswerType,
            Unit = storage.Unit != null ? new QuestionUnit
            {
                System = storage.Unit.System.Value,
                Code = storage.Unit.Code.Value,
                Display = storage.Unit.Display.Value
            } : null,
            Constraints = storage.Constraints,
            ValueSet = storage.ValueSet != null ? new ValueSetBinding
            {
                Url = storage.ValueSet.Url.Value,
                BindingStrength = storage.ValueSet.BindingStrength.Value
            } : null,
            Metadata = storage.Metadata
        };
    }

    private static QuestionStorageModel MapToStorageModel(Question question)
    {
        return new QuestionStorageModel
        {
            Id = question.Id,
            Code = new CodingStorageModel
            {
                System = new ValueWrapper { Value = question.Code.System ?? string.Empty },
                Code = new ValueWrapper { Value = question.Code.Code ?? string.Empty },
                Display = new ValueWrapper { Value = question.Code.Display ?? string.Empty }
            },
            AnswerType = (int)question.AnswerType,
            Unit = question.Unit != null ? new QuestionUnitStorageModel
            {
                System = new ValueWrapper { Value = question.Unit.System },
                Code = new ValueWrapper { Value = question.Unit.Code },
                Display = new ValueWrapper { Value = question.Unit.Display }
            } : null,
            Constraints = question.Constraints,
            ValueSet = question.ValueSet != null ? new ValueSetBindingStorageModel
            {
                Url = new ValueWrapper { Value = question.ValueSet.Url },
                BindingStrength = new ValueWrapper { Value = question.ValueSet.BindingStrength }
            } : null,
            Metadata = question.Metadata
        };
    }
}
