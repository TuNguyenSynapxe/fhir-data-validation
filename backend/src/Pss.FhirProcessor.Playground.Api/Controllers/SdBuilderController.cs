using Microsoft.AspNetCore.Mvc;
using Pss.FhirProcessor.Playground.Api.Models;
using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Adapters;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Pss.FhirProcessor.SdBuilder.Session;
using System.Text.Json;

namespace Pss.FhirProcessor.Playground.Api.Controllers;

/// <summary>
/// SD Builder Controller - Phase 4
/// 
/// STRICT RULES:
/// - Orchestration only
/// - NO Firely SDK usage
/// - NO FHIR logic, slicing logic, or validation logic
/// - Use ISdFhirAdapter for all FHIR I/O
/// - Use ISdBuilderSessionStore for state management
/// - Treat ResourceDesignState as opaque
/// </summary>
[ApiController]
[Route("api/sd-builder")]
public sealed class SdBuilderController : ControllerBase
{
    private readonly ISdFhirAdapter _adapter;
    private readonly ISdBuilderSessionStore _sessionStore;
    private readonly IStructureDefinitionRepository _sdRepo;
    private readonly ITerminologyRegistry _terminology;
    private readonly ILogger<SdBuilderController> _logger;

    public SdBuilderController(
        ISdFhirAdapter adapter,
        ISdBuilderSessionStore sessionStore,
        IStructureDefinitionRepository sdRepo,
        ITerminologyRegistry terminology,
        ILogger<SdBuilderController> logger)
    {
        _adapter = adapter;
        _sessionStore = sessionStore;
        _sdRepo = sdRepo;
        _terminology = terminology;
        _logger = logger;
    }

    /// <summary>
    /// Start new SD Builder session.
    /// </summary>
    [HttpPost("sessions")]
    public async Task<IActionResult> StartSession([FromBody] StartSdSessionRequest request)
    {
        // Load base structure definition using adapter
        var baseSdUrl = request.BaseSdUrl ?? $"http://hl7.org/fhir/StructureDefinition/{request.ResourceType}";
        var baseSd = await _adapter.LoadBaseAsync(baseSdUrl);
        
        // Import or initialize design
        ResourceDesignState design;
        if (!string.IsNullOrWhiteSpace(request.ImportProfileUrl))
        {
            // Import existing profile
            var profileSd = await _adapter.LoadBaseAsync(request.ImportProfileUrl);
            design = _adapter.Import(profileSd);
        }
        else
        {
            // Initialize new design from base using initializer
            var visibilityMode = VisibilityMode.Minimal; // Default
            if (!string.IsNullOrWhiteSpace(request.VisibilityMode))
            {
                if (!Enum.TryParse<VisibilityMode>(request.VisibilityMode, true, out visibilityMode))
                {
                    return BadRequest(new 
                    { 
                        error = $"Invalid visibility mode: {request.VisibilityMode}. Valid values are: Minimal, Full" 
                    });
                }
            }
            design = SdDesignInitializer.Create(request.ResourceType, baseSd, visibilityMode);
        }
        
        // Store in session and return
        var sessionId = _sessionStore.Create(design);
        return Ok(new SessionResponse(sessionId, design));
    }

    /// <summary>
    /// Execute command on session.
    /// </summary>
    [HttpPost("sessions/{sessionId}/commands")]
    public IActionResult ExecuteCommand(string sessionId, [FromBody] SdCommandRequest request)
    {
        // Retrieve current design
        var design = _sessionStore.Get(sessionId);
        if (design == null)
        {
            return NotFound(new { error = $"Session {sessionId} not found" });
        }
        
        // Create session instance to execute command
        var session = new SdBuilderSession(design);
        
        try
        {
            // Log incoming command for debugging
            _logger.LogInformation("ExecuteCommand: CommandType={CommandType}, Payload={Payload}", 
                request.CommandType, request.Payload.GetRawText());
            
            // Dispatch command to appropriate session method
            ExecuteSessionCommand(session, request.CommandType, request.Payload);
            
            // Update session storage with mutated design
            _sessionStore.Update(sessionId, session.DesignState);
            
            return Ok(new CommandResponse(session.DesignState));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = $"Invalid command: {ex.Message}" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = $"Command execution failed: {ex.Message}" });
        }
    }
    
    private void ExecuteSessionCommand(SdBuilderSession session, string commandType, JsonElement payload)
    {
        switch (commandType)
        {
            case "ToggleInclude":
                {
                    var path = payload.GetProperty("path").GetString()!;
                    var isIncluded = payload.GetProperty("isIncluded").GetBoolean();
                    session.ToggleInclude(path, isIncluded);
                    break;
                }
            case "SetCardinalityOverride":
                {
                    var path = payload.GetProperty("path").GetString()!;
                    
                    // Debug: log payload structure
                    var payloadJson = payload.GetRawText();
                    _logger.LogInformation("SetCardinalityOverride payload: {Payload}", payloadJson);
                    
                    if (!payload.TryGetProperty("min", out var minElement))
                    {
                        throw new ArgumentException("SetCardinalityOverride payload missing 'min' property");
                    }
                    if (!payload.TryGetProperty("max", out var maxElement))
                    {
                        throw new ArgumentException("SetCardinalityOverride payload missing 'max' property");
                    }
                    
                    var min = minElement.GetInt32();
                    var max = maxElement.GetString()!;
                    var cardinality = new Cardinality(min, max);
                    session.SetCardinalityOverride(path, cardinality);
                    break;
                }
            case "SetBinding":
                {
                    var path = payload.GetProperty("path").GetString()!;
                    var valueSetUrl = payload.GetProperty("valueSetUrl").GetString()!;
                    var strengthStr = payload.GetProperty("strength").GetString()!;
                    
                    // Parse strength enum
                    if (!Enum.TryParse<BindingStrength>(strengthStr, true, out var strength))
                    {
                        throw new ArgumentException($"Invalid binding strength: {strengthStr}. Valid values are: Required, Extensible, Preferred, Example");
                    }
                    
                    var binding = new BindingConfig
                    {
                        ValueSetUrl = valueSetUrl,
                        Strength = strength
                    };
                    session.SetBinding(path, binding);
                    break;
                }
            case "ClearBindingOverride":
                {
                    var path = payload.GetProperty("path").GetString()!;
                    session.SetBinding(path, null); // Clear by setting to null
                    break;
                }
            case "AddExtension":
                {
                    var path = payload.GetProperty("path").GetString()!;
                    // TODO: Parse ExtensionConfig from payload
                    throw new NotImplementedException("Extension parsing not yet implemented");
                }
            case "RemoveExtension":
                {
                    var path = payload.GetProperty("path").GetString()!;
                    var extensionUrl = payload.GetProperty("extensionUrl").GetString()!;
                    session.RemoveExtension(path, extensionUrl);
                    break;
                }
            case "SetVisibilityMode":
                {
                    var mode = payload.GetProperty("mode").GetString()!;
                    var visibilityMode = Enum.Parse<VisibilityMode>(mode);
                    session.SetVisibilityMode(visibilityMode);
                    break;
                }
            case "ConfigureSlicing":
                {
                    var path = payload.GetProperty("path").GetString()!;
                    // TODO: Parse slicing configuration
                    throw new NotImplementedException("Slicing configuration parsing not yet implemented");
                }
            case "AddSlice":
                {
                    var path = payload.GetProperty("path").GetString()!;
                    var sliceName = payload.GetProperty("sliceName").GetString()!;
                    session.AddSlice(path, sliceName);
                    break;
                }
            case "RemoveSlice":
                {
                    var path = payload.GetProperty("path").GetString()!;
                    var sliceName = payload.GetProperty("sliceName").GetString()!;
                    session.RemoveSlice(path, sliceName);
                    break;
                }
            default:
                throw new ArgumentException($"Unknown command type: {commandType}");
        }
    }

    /// <summary>
    /// Validate session design state.
    /// </summary>
    [HttpPost("sessions/{sessionId}/validate")]
    public async Task<IActionResult> Validate(string sessionId, CancellationToken ct)
    {
        // Retrieve design
        var design = _sessionStore.Get(sessionId);
        if (design == null)
        {
            return NotFound(new { error = $"Session {sessionId} not found" });
        }
        
        // Run validation (does NOT mutate state)
        var validationResult = await SdDesignValidator.ValidateAsync(design, _sdRepo, _terminology, ct);
        
        return Ok(new SdValidationResponse(validationResult));
    }

    /// <summary>
    /// Export StructureDefinition from session.
    /// </summary>
    [HttpPost("sessions/{sessionId}/export")]
    public async Task<IActionResult> Export(string sessionId, [FromBody] ExportSdRequest request, CancellationToken ct)
    {
        // Retrieve design
        var design = _sessionStore.Get(sessionId);
        if (design == null)
        {
            return NotFound(new { error = $"Session {sessionId} not found" });
        }
        
        // Validate before export
        var validationResult = await SdDesignValidator.ValidateAsync(design, _sdRepo, _terminology, ct);
        if (validationResult.HasErrors)
        {
            return Conflict(new 
            { 
                error = "Cannot export: validation errors present",
                validation = validationResult 
            });
        }
        
        // Export via adapter
        var structureDefinition = _adapter.Export(design, request.Metadata);
        
        return Ok(new ExportSdResponse(structureDefinition));
    }

    /// <summary>
    /// Delete session.
    /// </summary>
    [HttpDelete("sessions/{sessionId}")]
    public IActionResult DeleteSession(string sessionId)
    {
        _sessionStore.Delete(sessionId);
        return NoContent();
    }
}
