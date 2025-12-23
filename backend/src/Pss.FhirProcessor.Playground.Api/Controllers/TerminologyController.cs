using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models.Terminology;
using Pss.FhirProcessor.Playground.Api.Models;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// PHASE 1 — Terminology API (CodeSet only: code + display)
/// 
/// IN-SCOPE:
/// - Create/Read/Update/Delete CodeSystems
/// - Simple lookup tables (code + display pairs)
/// - File-based storage
/// 
/// OUT-OF-SCOPE (Phase 2+):
/// - definition, designation, property fields
/// - Question Configuration (linking to Questionnaire items)
/// - ValueSet binding enforcement
/// - External terminology imports (SNOMED, LOINC)
/// 
/// See: /docs/TERMINOLOGY_PHASE_1.md
/// </summary>
[ApiController]
[Route("api/projects/{projectId}/terminology")]
public class TerminologyController : ControllerBase
{
    private readonly ITerminologyService _terminologyService;
    private readonly ILogger<TerminologyController> _logger;

    public TerminologyController(
        ITerminologyService terminologyService,
        ILogger<TerminologyController> logger)
    {
        _terminologyService = terminologyService;
        _logger = logger;
    }

    /// <summary>
    /// List all CodeSets for a project (DTO only)
    /// </summary>
    [HttpGet("codesystems")]
    public async Task<ActionResult<List<CodeSetDto>>> ListCodeSystems(string projectId)
    {
        try
        {
            _logger.LogDebug("List CodeSets for project: {ProjectId}", projectId);
            var codeSystems = await _terminologyService.ListCodeSystemsAsync(projectId);
            var dtos = codeSystems.Select(MapToDto).ToList();
            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing CodeSets for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to list CodeSets", message = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific CodeSet by canonical URL (DTO only)
    /// </summary>
    [HttpGet("codesystems/by-url")]
    public async Task<ActionResult<CodeSetDto>> GetCodeSystemByUrl(string projectId, [FromQuery] string url)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return BadRequest(new { error = "URL parameter is required" });
            }

            _logger.LogDebug("Get CodeSet by URL for project: {ProjectId}, URL: {Url}", projectId, url);
            var codeSystem = await _terminologyService.GetCodeSystemByUrlAsync(url);
            
            if (codeSystem == null)
            {
                return NotFound(new { error = "CodeSet not found", url });
            }

            return Ok(MapToDto(codeSystem));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting CodeSet for project {ProjectId}, URL {Url}", projectId, url);
            return StatusCode(500, new { error = "Failed to get CodeSet", message = ex.Message });
        }
    }

    /// <summary>
    /// Save (create or update) a CodeSet (DTO only)
    /// Uses CodeSet.url as the primary key
    /// </summary>
    [HttpPut("codesystems")]
    public async Task<ActionResult<CodeSetDto>> SaveCodeSystem(string projectId, [FromBody] CodeSetDto codeSetDto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(codeSetDto?.Url))
            {
                return BadRequest(new { error = "CodeSet.url is required" });
            }

            // Validate concepts
            if (codeSetDto.Concepts.Any(c => string.IsNullOrWhiteSpace(c.Code)))
            {
                return BadRequest(new { error = "All concepts must have a code" });
            }

            _logger.LogInformation("Save CodeSet for project: {ProjectId}, URL: {Url}", projectId, codeSetDto.Url);
            
            // Map DTO to domain model (strips extra fields automatically)
            var codeSystem = MapToDomain(codeSetDto);
            await _terminologyService.SaveCodeSystemAsync(projectId, codeSystem);
            
            return Ok(codeSetDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving CodeSet for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to save CodeSet", message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a CodeSet by canonical URL
    /// </summary>
    [HttpDelete("codesystems")]
    public async Task<ActionResult> DeleteCodeSystem(string projectId, [FromQuery] string url)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return BadRequest(new { error = "URL parameter is required" });
            }

            _logger.LogInformation("Delete CodeSet for project: {ProjectId}, URL: {Url}", projectId, url);
            
            var deleted = await _terminologyService.DeleteCodeSystemAsync(projectId, url);
            
            if (!deleted)
            {
                return NotFound(new { error = "CodeSet not found", url });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting CodeSet for project {ProjectId}, URL {Url}", projectId, url);
            return StatusCode(500, new { error = "Failed to delete CodeSet", message = ex.Message });
        }
    }

    // ===== PRIVATE MAPPING METHODS =====

    /// <summary>
    /// Map domain CodeSystem to lean Phase 1 DTO (code + display only)
    /// 
    /// PHASE 1 SCOPE: Strips all fields except url, name, code, display.
    /// Future phases may expose additional fields (definition, designation, property).
    /// </summary>
    private static CodeSetDto MapToDto(CodeSystem codeSystem)
    {
        return new CodeSetDto
        {
            Url = codeSystem.Url,
            Name = codeSystem.Name,
            // PHASE 1: Only code + display exposed
            Concepts = codeSystem.Concept.Select(c => new CodeSetConceptDto
            {
                Code = c.Code,
                Display = c.Display
                // TODO (Phase 2): Add Definition, Designation[], Property[]
            }).ToList()
        };
    }

    /// <summary>
    /// Map DTO to domain CodeSystem (strips extra fields, only code + display)
    /// 
    /// PHASE 1 SCOPE: Creates minimal CodeSystem for persistence.
    /// Domain model supports full FHIR fields, but Phase 1 only uses code + display.
    /// </summary>
    private static CodeSystem MapToDomain(CodeSetDto dto)
    {
        return new CodeSystem
        {
            Url = dto.Url,
            Name = dto.Name,
            Status = "active",
            Content = "complete",
            // PHASE 1: Only code + display persisted
            Concept = dto.Concepts.Select(c => new CodeSystemConcept
            {
                Code = c.Code,
                Display = c.Display
                // PHASE 1 LIMITATION: NO definition, designation, property, concept children
                // TODO (Phase 2): Support full FHIR CodeSystem.concept structure
            }).ToList()
        };
    }
}
