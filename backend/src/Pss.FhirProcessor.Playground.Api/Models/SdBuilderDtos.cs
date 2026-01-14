using System.Text.Json;
using Pss.FhirProcessor.SdBuilder.Adapters;
using Pss.FhirProcessor.SdBuilder.Domain;

namespace Pss.FhirProcessor.Playground.Api.Models;

// ============================================================================
// Request DTOs
// ============================================================================

/// <summary>
/// Request to start new SD Builder session.
/// </summary>
public sealed record StartSdSessionRequest(
    FhirVersion FhirVersion,
    string ResourceType,
    string? BaseSdUrl = null,
    string? VisibilityMode = null,
    string? ImportProfileUrl = null
);

/// <summary>
/// Request to execute a command on design state.
/// Payload is opaque - controller does not inspect.
/// </summary>
public sealed record SdCommandRequest(
    string CommandType,
    JsonElement Payload
);

/// <summary>
/// Request to export StructureDefinition.
/// </summary>
public sealed record ExportSdRequest(
    SdMetadata Metadata
);

// ============================================================================
// Response DTOs
// ============================================================================

/// <summary>
/// Response for session creation.
/// </summary>
public sealed record SessionResponse(
    string SessionId,
    object Design
);

/// <summary>
/// Response for command execution.
/// </summary>
public sealed record CommandResponse(
    object Design
);

/// <summary>
/// Response for SD Builder validation (distinct from Engine validation).
/// </summary>
public sealed record SdValidationResponse(
    object Validation
);

/// <summary>
/// Response for export.
/// </summary>
public sealed record ExportSdResponse(
    object StructureDefinition
);
