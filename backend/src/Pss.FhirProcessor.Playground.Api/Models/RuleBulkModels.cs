using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Rule intent from frontend - user's intention to create a rule
/// </summary>
public class RuleIntent
{
    [JsonPropertyName("type")]
    public required string Type { get; set; } // REQUIRED, ARRAY_LENGTH, CODE_SYSTEM, ALLOWED_CODES
    
    [JsonPropertyName("path")]
    public required string Path { get; set; }
    
    [JsonPropertyName("resourceType")]
    public required string ResourceType { get; set; }
    
    [JsonPropertyName("params")]
    public object? Params { get; set; }
}

/// <summary>
/// Parameters for Array Length rules
/// </summary>
public class ArrayLengthParams
{
    [JsonPropertyName("min")]
    public int? Min { get; set; }
    
    [JsonPropertyName("max")]
    public int? Max { get; set; }
    
    [JsonPropertyName("nonEmpty")]
    public bool? NonEmpty { get; set; }
}

/// <summary>
/// Parameters for Code System rules
/// </summary>
public class CodeSystemParams
{
    [JsonPropertyName("system")]
    public required string System { get; set; }
}

/// <summary>
/// Parameters for Allowed Codes rules
/// </summary>
public class AllowedCodesParams
{
    [JsonPropertyName("system")]
    public string? System { get; set; }
    
    [JsonPropertyName("codes")]
    public required List<string> Codes { get; set; }
}

/// <summary>
/// Request to create rules in bulk from intents
/// </summary>
public class BulkCreateRulesRequest
{
    [JsonPropertyName("intents")]
    public required List<RuleIntent> Intents { get; set; }
}

/// <summary>
/// Created rule (returned to frontend)
/// </summary>
public class DraftRule
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }
    
    [JsonPropertyName("type")]
    public required string Type { get; set; } // Required, ArrayLength, CodeSystem, AllowedCodes
    
    [JsonPropertyName("resourceType")]
    public required string ResourceType { get; set; }
    
    [JsonPropertyName("path")]
    public required string Path { get; set; }
    
    [JsonPropertyName("severity")]
    public string Severity { get; set; } = "error";
    
    [JsonPropertyName("message")]
    public required string Message { get; set; }
    
    [JsonPropertyName("status")]
    public string Status { get; set; } = "draft";
    
    [JsonPropertyName("params")]
    public object? Params { get; set; }
}

/// <summary>
/// Error during rule creation
/// </summary>
public class RuleCreationError
{
    [JsonPropertyName("index")]
    public int Index { get; set; }
    
    [JsonPropertyName("path")]
    public string? Path { get; set; }
    
    [JsonPropertyName("reason")]
    public required string Reason { get; set; }
}

/// <summary>
/// Response from bulk rule creation
/// </summary>
public class BulkCreateRulesResponse
{
    [JsonPropertyName("created")]
    public List<DraftRule> Created { get; set; } = new();
    
    [JsonPropertyName("errors")]
    public List<RuleCreationError> Errors { get; set; } = new();
}
