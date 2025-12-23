using Hl7.Fhir.Model;
using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Models.Questions;
using Pss.FhirProcessor.Engine.Services.Questions;
using Pss.FhirProcessor.Playground.Api.Dtos.Questions;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId}/questions")]
public class QuestionsController : ControllerBase
{
    private readonly IQuestionService _questionService;
    private readonly ILogger<QuestionsController> _logger;

    public QuestionsController(
        IQuestionService questionService,
        ILogger<QuestionsController> logger)
    {
        _questionService = questionService;
        _logger = logger;
    }

    /// <summary>
    /// List all questions for a project
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<QuestionDto>>> ListQuestions(string projectId)
    {
        try
        {
            var questions = await _questionService.ListQuestionsAsync(projectId);
            return Ok(questions.Select(MapToDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing questions for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to list questions" });
        }
    }

    /// <summary>
    /// Get a specific question
    /// </summary>
    [HttpGet("{questionId}")]
    public async Task<ActionResult<QuestionDto>> GetQuestion(string projectId, string questionId)
    {
        try
        {
            var question = await _questionService.GetQuestionAsync(projectId, questionId);
            if (question == null)
            {
                return NotFound(new { error = $"Question '{questionId}' not found" });
            }

            return Ok(MapToDto(question));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting question {QuestionId} for project {ProjectId}", 
                questionId, projectId);
            return StatusCode(500, new { error = "Failed to get question" });
        }
    }

    /// <summary>
    /// Create a new question
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<QuestionDto>> CreateQuestion(
        string projectId,
        [FromBody] CreateQuestionDto dto)
    {
        try
        {
            var question = MapFromCreateDto(dto);
            var created = await _questionService.CreateQuestionAsync(projectId, question);
            return CreatedAtAction(
                nameof(GetQuestion),
                new { projectId, questionId = created.Id },
                MapToDto(created));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating question for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to create question" });
        }
    }

    /// <summary>
    /// Update an existing question
    /// </summary>
    [HttpPut("{questionId}")]
    public async Task<ActionResult<QuestionDto>> UpdateQuestion(
        string projectId,
        string questionId,
        [FromBody] CreateQuestionDto dto)
    {
        try
        {
            var question = MapFromCreateDto(dto);
            var updated = await _questionService.UpdateQuestionAsync(projectId, questionId, question);
            return Ok(MapToDto(updated));
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("not found"))
            {
                return NotFound(new { error = ex.Message });
            }
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating question {QuestionId} for project {ProjectId}", 
                questionId, projectId);
            return StatusCode(500, new { error = "Failed to update question" });
        }
    }

    /// <summary>
    /// Delete a question
    /// </summary>
    [HttpDelete("{questionId}")]
    public async Task<ActionResult> DeleteQuestion(string projectId, string questionId)
    {
        try
        {
            await _questionService.DeleteQuestionAsync(projectId, questionId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting question {QuestionId} for project {ProjectId}", 
                questionId, projectId);
            return StatusCode(500, new { error = "Failed to delete question" });
        }
    }

    #region Mapping Helpers

    private static QuestionDto MapToDto(Question question)
    {
        return new QuestionDto
        {
            Id = question.Id,
            Code = new CodingDto
            {
                System = question.Code.System ?? string.Empty,
                Code = question.Code.Code ?? string.Empty,
                Display = question.Code.Display
            },
            AnswerType = question.AnswerType.ToString(),
            Unit = question.Unit != null
                ? new QuestionUnitDto
                {
                    System = question.Unit.System,
                    Code = question.Unit.Code,
                    Display = question.Unit.Display
                }
                : null,
            Constraints = question.Constraints != null
                ? new QuestionConstraintsDto
                {
                    Min = question.Constraints.Min,
                    Max = question.Constraints.Max,
                    Precision = question.Constraints.Precision,
                    MaxLength = question.Constraints.MaxLength,
                    Regex = question.Constraints.Regex
                }
                : null,
            ValueSet = question.ValueSet != null
                ? new ValueSetBindingDto
                {
                    Url = question.ValueSet.Url,
                    BindingStrength = question.ValueSet.BindingStrength
                }
                : null,
            Metadata = new QuestionMetadataDto
            {
                Text = question.Metadata.Text,
                Description = question.Metadata.Description,
                CreatedAt = question.Metadata.CreatedAt,
                UpdatedAt = question.Metadata.UpdatedAt
            }
        };
    }

    private static Question MapFromCreateDto(CreateQuestionDto dto)
    {
        if (!Enum.TryParse<QuestionAnswerType>(dto.AnswerType, true, out var answerType))
        {
            throw new InvalidOperationException($"Invalid AnswerType: {dto.AnswerType}");
        }

        return new Question
        {
            Id = dto.Id ?? string.Empty,
            Code = new Coding
            {
                System = dto.Code.System,
                Code = dto.Code.Code,
                Display = dto.Code.Display
            },
            AnswerType = answerType,
            Unit = dto.Unit != null
                ? new QuestionUnit
                {
                    System = dto.Unit.System,
                    Code = dto.Unit.Code,
                    Display = dto.Unit.Display
                }
                : null,
            Constraints = dto.Constraints != null
                ? new QuestionConstraints
                {
                    Min = dto.Constraints.Min,
                    Max = dto.Constraints.Max,
                    Precision = dto.Constraints.Precision,
                    MaxLength = dto.Constraints.MaxLength,
                    Regex = dto.Constraints.Regex
                }
                : null,
            ValueSet = dto.ValueSet != null
                ? new ValueSetBinding
                {
                    Url = dto.ValueSet.Url,
                    BindingStrength = dto.ValueSet.BindingStrength
                }
                : null,
            Metadata = new QuestionMetadata
            {
                Text = dto.Text,
                Description = dto.Description
            }
        };
    }

    #endregion
}
