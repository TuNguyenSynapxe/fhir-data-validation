using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// Controller for FHIR R4 schema information
/// Provides flattened structure definitions for resource types
/// </summary>
[ApiController]
[Route("api/fhir/schema")]
public class SchemaController : ControllerBase
{
    private readonly IFhirSchemaService _schemaService;
    private readonly ILogger<SchemaController> _logger;

    public SchemaController(
        IFhirSchemaService schemaService,
        ILogger<SchemaController> logger)
    {
        _schemaService = schemaService;
        _logger = logger;
    }

    /// <summary>
    /// Gets the FHIR R4 schema for a specific resource type
    /// </summary>
    /// <param name="resourceType">FHIR resource type (e.g., Patient, Observation)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Hierarchical schema tree with all elements</returns>
    /// <response code="200">Schema retrieved successfully</response>
    /// <response code="400">Invalid resource type</response>
    /// <response code="404">Resource type not found</response>
    /// <response code="500">Internal server error</response>
    [HttpGet("{resourceType}")]
    [ProducesResponseType(typeof(FhirSchemaNode), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetResourceSchema(
        [FromRoute] string resourceType,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate resource type format (should start with uppercase)
            if (string.IsNullOrWhiteSpace(resourceType) || !char.IsUpper(resourceType[0]))
            {
                _logger.LogWarning("Invalid resource type format: {ResourceType}", resourceType);
                return BadRequest(new 
                { 
                    error = "Invalid resource type",
                    message = "Resource type must start with an uppercase letter",
                    requestedType = resourceType
                });
            }

            _logger.LogInformation("Retrieving FHIR R4 schema for resource type: {ResourceType}", resourceType);

            // Get schema from service
            var schema = await _schemaService.GetResourceSchemaAsync(resourceType, cancellationToken);

            if (schema == null)
            {
                _logger.LogWarning("Schema not found for resource type: {ResourceType}", resourceType);
                return NotFound(new 
                { 
                    error = "Resource type not found",
                    message = $"FHIR R4 StructureDefinition not found for resource type: {resourceType}",
                    resourceType = resourceType
                });
            }

            _logger.LogInformation("Successfully retrieved schema for {ResourceType} with {ChildCount} root elements", 
                resourceType, schema.Children.Count);

            return Ok(schema);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving schema for resource type: {ResourceType}", resourceType);
            return StatusCode(StatusCodes.Status500InternalServerError, new 
            { 
                error = "Internal server error",
                message = "An error occurred while retrieving the schema",
                details = ex.Message
            });
        }
    }

    /// <summary>
    /// Gets the list of available FHIR R4 resource types
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of resource type names</returns>
    /// <response code="200">List retrieved successfully</response>
    [HttpGet]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAvailableResourceTypes(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Retrieving list of available FHIR R4 resource types");

            var resourceTypes = await _schemaService.GetAvailableResourceTypesAsync(cancellationToken);

            return Ok(new 
            { 
                version = "R4",
                count = resourceTypes.Count,
                resourceTypes = resourceTypes
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available resource types");
            return StatusCode(StatusCodes.Status500InternalServerError, new 
            { 
                error = "Internal server error",
                message = "An error occurred while retrieving resource types"
            });
        }
    }
}
