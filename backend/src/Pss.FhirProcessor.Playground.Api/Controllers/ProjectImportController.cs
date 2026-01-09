using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Application.Projects.Import;
using Pss.FhirProcessor.Application.Projects.Import.Errors;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using Pss.FhirProcessor.Playground.Api.Dtos;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// API controller for importing Simplifier FHIR packages.
/// Thin HTTP boundary over ProjectImportService - contains NO business logic.
/// </summary>
[ApiController]
[Route("api/admin/projects")]
public sealed class ProjectImportController : ControllerBase
{
    private readonly ProjectImportService _importService;
    private readonly FhirProcessorDbContext _dbContext;
    private readonly ILogger<ProjectImportController> _logger;
    
    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50MB
    private static readonly string[] AllowedContentTypes = { "application/zip", "application/x-zip-compressed" };

    public ProjectImportController(
        ProjectImportService importService,
        FhirProcessorDbContext dbContext,
        ILogger<ProjectImportController> logger)
    {
        _importService = importService;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Imports a Simplifier R5 package ZIP file and creates a new project.
    /// </summary>
    /// <param name="file">ZIP file containing the FHIR package.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Import result with project summary.</returns>
    [HttpPost("import")]
    [ProducesResponseType(typeof(ImportProjectResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ImportErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ImportErrorResponseDto), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ImportErrorResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ImportProject(
        [FromForm] IFormFile file,
        CancellationToken cancellationToken = default)
    {
        // Controller-level validation (HTTP concerns only)
        var validationError = ValidateUploadedFile(file);
        if (validationError != null)
        {
            return validationError;
        }

        string tempFilePath = Path.GetTempFileName();

        try
        {
            // Save uploaded file to temp location
            await using (var stream = new FileStream(tempFilePath, FileMode.Create))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            _logger.LogInformation(
                "Starting import of package: {FileName} ({Size} bytes)",
                file.FileName,
                file.Length);

            // Delegate to application service (Phase 7.2)
            var projectId = await _importService.ImportPackageAsync(
                tempFilePath,
                PolicyMode.Strict,
                cancellationToken);

            // Query created project for response DTO
            var response = await BuildResponseAsync(projectId, cancellationToken);

            _logger.LogInformation(
                "Successfully imported project {ProjectId} with {ArtifactCount} artifacts, {BundleCount} bundles, {RuleCount} rules",
                projectId,
                response.ArtifactCount,
                response.BundleCount,
                response.RuleCount);

            return CreatedAtAction(
                actionName: null,
                routeValues: new { id = projectId },
                value: response);
        }
        catch (ProjectImportException ex)
        {
            _logger.LogWarning(
                ex,
                "Import rejected: {ErrorCode} - {Message}",
                ex.ErrorCode,
                ex.Message);

            return MapImportExceptionToResponse(ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during project import");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new ImportErrorResponseDto
                {
                    Error = "InternalError",
                    Message = "An unexpected error occurred during import"
                });
        }
        finally
        {
            // Clean up temp file
            if (System.IO.File.Exists(tempFilePath))
            {
                try
                {
                    System.IO.File.Delete(tempFilePath);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete temp file: {FilePath}", tempFilePath);
                }
            }
        }
    }

    /// <summary>
    /// Validates uploaded file at HTTP layer.
    /// Returns error response if validation fails, null if valid.
    /// </summary>
    private IActionResult? ValidateUploadedFile(IFormFile? file)
    {
        if (file == null)
        {
            return BadRequest(new ImportErrorResponseDto
            {
                Error = "MissingFile",
                Message = "No file was uploaded. Please provide a ZIP package file."
            });
        }

        if (file.Length == 0)
        {
            return BadRequest(new ImportErrorResponseDto
            {
                Error = "EmptyFile",
                Message = "Uploaded file is empty."
            });
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return BadRequest(new ImportErrorResponseDto
            {
                Error = "FileTooLarge",
                Message = $"File size exceeds maximum allowed size of {MaxFileSizeBytes / 1024 / 1024}MB."
            });
        }

        var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (extension != ".zip")
        {
            return BadRequest(new ImportErrorResponseDto
            {
                Error = "InvalidFileType",
                Message = "Only ZIP files are accepted. File must have .zip extension."
            });
        }

        var contentType = file.ContentType?.ToLowerInvariant();
        if (!string.IsNullOrEmpty(contentType) && !AllowedContentTypes.Contains(contentType))
        {
            return BadRequest(new ImportErrorResponseDto
            {
                Error = "InvalidContentType",
                Message = $"Invalid content type: {contentType}. Expected application/zip."
            });
        }

        return null;
    }

    /// <summary>
    /// Maps ProjectImportException to appropriate HTTP error response.
    /// </summary>
    private IActionResult MapImportExceptionToResponse(ProjectImportException ex)
    {
        var errorResponse = new ImportErrorResponseDto
        {
            Error = ex.ErrorCode,
            Message = ex.Message,
            Context = ex.Context
        };

        // Map domain error codes to HTTP status codes
        return ex.ErrorCode switch
        {
            ImportErrorCodes.EmptyZip => BadRequest(errorResponse),
            ImportErrorCodes.InvalidZipStructure => BadRequest(errorResponse),
            ImportErrorCodes.MissingPackageJson => BadRequest(errorResponse),
            ImportErrorCodes.InvalidPackageJson => BadRequest(errorResponse),
            ImportErrorCodes.UnsupportedFhirVersion => BadRequest(errorResponse),
            ImportErrorCodes.InvalidJsonFile => UnprocessableEntity(errorResponse),
            ImportErrorCodes.UnknownResourceType => UnprocessableEntity(errorResponse),
            ImportErrorCodes.MissingCanonicalUrl => UnprocessableEntity(errorResponse),
            ImportErrorCodes.DuplicateCanonicalUrl => UnprocessableEntity(errorResponse),
            ImportErrorCodes.DatabaseError => StatusCode(StatusCodes.Status500InternalServerError, errorResponse),
            _ => StatusCode(StatusCodes.Status500InternalServerError, errorResponse)
        };
    }

    /// <summary>
    /// Builds response DTO by querying the created project from database.
    /// </summary>
    private async Task<ImportProjectResponseDto> BuildResponseAsync(
        Guid projectId,
        CancellationToken cancellationToken)
    {
        var project = await _dbContext.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            throw new InvalidOperationException($"Project {projectId} not found after import");
        }

        // Query counts separately (better for in-memory database and production)
        var artifactCount = await _dbContext.ProjectArtifacts
            .CountAsync(a => a.ProjectId == projectId, cancellationToken);
        var bundleCount = await _dbContext.ProjectBundles
            .CountAsync(b => b.ProjectId == projectId, cancellationToken);
        var ruleCount = await _dbContext.ProjectRules
            .CountAsync(r => r.ProjectId == projectId, cancellationToken);
        var publicLink = await _dbContext.ProjectPublicLinks
            .FirstOrDefaultAsync(l => l.ProjectId == projectId, cancellationToken);

        return new ImportProjectResponseDto
        {
            ProjectId = project.Id,
            PublicId = publicLink?.PublicId,
            ArtifactCount = artifactCount,
            BundleCount = bundleCount,
            RuleCount = ruleCount,
            PolicyMode = project.PolicyMode.ToString()
        };
    }
}
