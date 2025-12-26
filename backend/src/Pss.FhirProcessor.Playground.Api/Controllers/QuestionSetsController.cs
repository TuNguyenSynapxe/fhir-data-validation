using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Models.Questions;
using Pss.FhirProcessor.Engine.Services.Questions;
using Pss.FhirProcessor.Playground.Api.Dtos.Questions;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId}/questionsets")]
public class QuestionSetsController : ControllerBase
{
    private readonly IQuestionSetService _questionSetService;
    private readonly ILogger<QuestionSetsController> _logger;

    public QuestionSetsController(
        IQuestionSetService questionSetService,
        ILogger<QuestionSetsController> logger)
    {
        _questionSetService = questionSetService;
        _logger = logger;
    }

    /// <summary>
    /// List all question sets for a project
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<QuestionSetDto>>> ListQuestionSets(string projectId)
    {
        try
        {
            var questionSets = await _questionSetService.ListQuestionSetsAsync(projectId);
            return Ok(questionSets.Select(MapToDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing question sets for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to list question sets" });
        }
    }

    /// <summary>
    /// Get a specific question set
    /// </summary>
    [HttpGet("{questionSetId}")]
    public async Task<ActionResult<QuestionSetDto>> GetQuestionSet(string projectId, string questionSetId)
    {
        try
        {
            var questionSet = await _questionSetService.GetQuestionSetAsync(projectId, questionSetId);
            if (questionSet == null)
            {
                return NotFound(new { error = $"Question set {questionSetId} not found" });
            }
            return Ok(MapToDto(questionSet));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting question set {QuestionSetId}", questionSetId);
            return StatusCode(500, new { error = "Failed to get question set" });
        }
    }

    /// <summary>
    /// Create a new question set
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<QuestionSetDto>> CreateQuestionSet(
        string projectId,
        [FromBody] CreateQuestionSetDto dto)
    {
        try
        {
            var questionSet = new QuestionSet
            {
                Id = dto.Id ?? string.Empty,
                Name = dto.Name,
                Description = dto.Description,
                TerminologyUrl = dto.TerminologyUrl,
                Questions = dto.Questions.Select(q => new QuestionSetQuestionRef
                {
                    QuestionId = q.QuestionId,
                    Required = q.Required
                }).ToList()
            };

            var created = await _questionSetService.CreateQuestionSetAsync(projectId, questionSet);
            return CreatedAtAction(
                nameof(GetQuestionSet),
                new { projectId, questionSetId = created.Id },
                MapToDto(created));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating question set for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to create question set" });
        }
    }

    /// <summary>
    /// Update an existing question set
    /// </summary>
    [HttpPut("{questionSetId}")]
    public async Task<ActionResult<QuestionSetDto>> UpdateQuestionSet(
        string projectId,
        string questionSetId,
        [FromBody] CreateQuestionSetDto dto)
    {
        try
        {
            var questionSet = new QuestionSet
            {
                Name = dto.Name,
                Description = dto.Description,
                TerminologyUrl = dto.TerminologyUrl,
                Questions = dto.Questions.Select(q => new QuestionSetQuestionRef
                {
                    QuestionId = q.QuestionId,
                    Required = q.Required
                }).ToList()
            };

            var updated = await _questionSetService.UpdateQuestionSetAsync(projectId, questionSetId, questionSet);
            return Ok(MapToDto(updated));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating question set {QuestionSetId}", questionSetId);
            return StatusCode(500, new { error = "Failed to update question set" });
        }
    }

    /// <summary>
    /// Delete a question set
    /// </summary>
    [HttpDelete("{questionSetId}")]
    public async Task<IActionResult> DeleteQuestionSet(string projectId, string questionSetId)
    {
        try
        {
            await _questionSetService.DeleteQuestionSetAsync(projectId, questionSetId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting question set {QuestionSetId}", questionSetId);
            return StatusCode(500, new { error = "Failed to delete question set" });
        }
    }

    private static QuestionSetDto MapToDto(QuestionSet questionSet)
    {
        return new QuestionSetDto
        {
            Id = questionSet.Id,
            Name = questionSet.Name,
            Description = questionSet.Description,
            TerminologyUrl = questionSet.TerminologyUrl,
            Questions = questionSet.Questions.Select(q => new QuestionSetQuestionRefDto
            {
                QuestionId = q.QuestionId,
                Required = q.Required
            }).ToList(),
            CreatedAt = questionSet.CreatedAt,
            UpdatedAt = questionSet.UpdatedAt
        };
    }
}
